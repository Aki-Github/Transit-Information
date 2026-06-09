import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// 💡 運行業者IDを日本語に変換する辞書
const OPERATOR_MAP: Record<string, string> = {
  "odpt.Operator:Toei": "都営バス",
  "odpt.Operator:SeibuBus": "西武バス",
  "odpt.Operator:TokyuBus": "東急バス",
  "odpt.Operator:SotetsuBus": "相鉄バス",
  "odpt.Operator:KokusaiKogyoBus": "国際興業バス",
  "odpt.Operator:KeioBus": "京王バス",
  "odakyu.Operator:OdakyuBus": "小田急バス",
};

// バスの生データ型定義
interface BusLiveRaw {
  "@id": string;
  "odpt:operator": string;
  "odpt:busNumber"?: string;
  "odpt:fromBusstopPole"?: string;      // 出発したバス停ID
  "odpt:toBusstopPole"?: string;        // 次に向かっているバス停ID
  "odpt:delay"?: number;
  "odpt:busroutePattern"?: string;      // 運行パターンID
  "odpt:destinationSign"?: string;
  "odpt:note"?: string;
  "odpt:terminalBusstopPole"?: string;
  "odpt:busTimetable"?: string;         // APIが便固有の時刻表IDを返してくれる場合のフィールド
}

// マージ完了後の走行中バスの型定義
export interface ActiveBus {
  id: string;
  operatorName: string;
  busNumber: string;
  fromStationName: string;
  toBusstopPoleId: string | null;
  nextNextBusstopName: string | null; // 🏁 追加：次の次のバス停名
  arrivalEstimateTime: string | null; // 🏁 追加：計算した到着予定時刻 (例: "14:35")
  delayMin: number;
  position: [number, number];
  busroutePattern: string | null;
  destinationSign: string;
}

// 💡 今日の日付から 'Weekday', 'Saturday', 'Holiday' を判定するヘルパー
const getTodayDayType = (): "Weekday" | "Saturday" | "Holiday" => {
  const day = new Date().getDay();
  if (day === 0) return "Holiday";
  if (day === 6) return "Saturday";
  return "Weekday";
};

export const useActiveBuses = (busstops: any[]) => {
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [loadingBuses, setLoadingBuses] = useState<boolean>(false);

  useEffect(() => {
    // 検索結果のバス停がない場合は、バスの位置追跡タイマーを回さない
    if (busstops.length === 0) {
      setActiveBuses([]);
      return;
    }

    const fetchBusLocations = async () => {
      setLoadingBuses(true);
      try {
        const API_KEY = process.env.REACT_APP_ODPT_KEY;
        const url = `https://api.odpt.org/api/v4/odpt:Bus?acl:consumerKey=${API_KEY}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("APIからのバスリアルタイムデータ取得に失敗しました。");
        
        const rawData: BusLiveRaw[] = await res.json();
        console.log("取得したバスの生データ:", rawData);

        // 1. 画面周辺のバスをフィルタリング
        const filteredRawBuses = rawData.filter((bus) => {
          const targetPoleId = bus["odpt:fromBusstopPole"];
          if (!targetPoleId) return false;
          return busstops.some((stop) => stop["owl:sameAs"] === targetPoleId);
        });

        // 2. 終点名の一括取得用リスト
        const terminalPoleIds = Array.from(
          new Set(
            filteredRawBuses
              .map((bus) => bus["odpt:terminalBusstopPole"])
              .filter((id): id is string => !!id)
          )
        );

        // 3. リスト化した終点IDの「バス停名」を Supabase から一括で取得
        let dbTerminalStops: { owl_sameas: string; title: string }[] = [];
        if (terminalPoleIds.length > 0) {
          const { data, error } = await supabase
            .from('busstop_poles')
            .select('owl_sameas, title')
            .in('owl_sameas', terminalPoleIds);
          
          if (!error && data) {
            dbTerminalStops = data;
          }
        }

        // ----------------------------------------------------
        // 🔮 【コアロジック】Supabaseから「次」「次の次」の情報を一本釣り
        // ----------------------------------------------------
        const todayDayType = getTodayDayType();
        const integratedBuses: ActiveBus[] = [];

        // 現在の「時・分」を数値化（あとで一番近い時刻表の便を探すため）
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        for (const bus of filteredRawBuses) {
          const toPoleId = bus["odpt:toBusstopPole"];
          const patternId = bus["odpt:busroutePattern"];

          let nextNextBusstopName: string | null = null;
          let arrivalEstimateTime: string | null = null;

          if (toPoleId && patternId) {
            // 💡 パターンIDからコアな「系統名」を抽出する
            // 例: "odpt.BusroutePattern:Toei.T05-1.72414.2" -> "odpt.BusTimetable:Toei.T05" 形式のベースを作る
            let routeBase = "";
            const match = patternId.match(/Toei\.([A-Za-z0-9]+)/);
            if (match && match[1]) {
              routeBase = `odpt.BusTimetable:Toei.${match[1]}`; // 例: "odpt.BusTimetable:Toei.T05"
            }

            if (routeBase) {
              // 💡 系統名（前方一致）と バス停ID で、該当する時刻表オブジェクトを全件取得
              const { data: matchedObjects } = await supabase
                .from("bus_timetable_objects")
                .select(`
                  index_order,
                  departure_time,
                  seconds_from_start,
                  timetable_owl_sameas,
                  bus_timetables!inner(calendar)
                `)
                .eq("busstop_pole_owl_sameas", toPoleId)
                .ilike("timetable_owl_sameas", `${routeBase}%`);

              if (matchedObjects && matchedObjects.length > 0) {
                // 💡 曜日でフィルタリング（都営特有のカレンダーID判定）
                const calendarFiltered = matchedObjects.filter(obj => {
                  const cal = (obj.bus_timetables as any).calendar.toLowerCase();
                  if (todayDayType === "Weekday") return !cal.includes("saturday") && !cal.includes("holiday");
                  if (todayDayType === "Saturday") return cal.includes("saturday");
                  return cal.includes("holiday") || cal.includes("sunday");
                });

                const targetPool = calendarFiltered.length > 0 ? calendarFiltered : matchedObjects;

                // 💡 現在時刻に最も近い「出発時刻（departure_time）」の便を1件選定
                let bestMatchObj = null;
                let minDiff = Infinity;

                for (const obj of targetPool) {
                  if (!obj.departure_time) continue;
                  const [hh, mm] = obj.departure_time.split(":").map(Number);
                  const stopMinutes = hh * 60 + mm;
                  
                  const diff = Math.abs(nowMinutes - stopMinutes);
                  if (diff < minDiff) {
                    minDiff = diff;
                    bestMatchObj = obj;
                  }
                }

                // 該当時間帯の便が特定できたら処理を続行
                const correctStopData = bestMatchObj || targetPool[0];
                console.log(`バスID ${bus["@id"]} に対して、最適な時刻表オブジェクトを選定しました:`, correctStopData);

                if (correctStopData && correctStopData.index_order !== undefined) {
                  const currentOrderNum = parseInt(String(correctStopData.index_order), 10);
                  const nextNextOrder = currentOrderNum + 1;
                  const timetableSameas = correctStopData.timetable_owl_sameas;
                  const cleanTimetableSameas = String(timetableSameas).trim();

                  // 💡 【ステップ1】外部キー未定義エラー(400)回避のため、次の次のバス停のIDを単一取得
                  const { data: nextNextObjList, error: nextNextObjError } = await supabase
                    .from("bus_timetable_objects")
                    .select("busstop_pole_owl_sameas")
                    .eq("timetable_owl_sameas", cleanTimetableSameas)
                    .eq("index_order", nextNextOrder);

                  if (nextNextObjError) {
                    console.error(`[デバッグ] 次の次のバス停オブジェクト取得でエラーが発生:`, nextNextObjError);
                  }

                  // 💡 【ステップ2】IDが安全に取れたら、busstop_poles マスタから直接「名称」を一本釣り
                  if (nextNextObjList && nextNextObjList.length > 0) {
                    const nextNextPoleId = nextNextObjList[0].busstop_pole_owl_sameas;

                    if (nextNextPoleId) {
                      const { data: poleData, error: poleError } = await supabase
                        .from("busstop_poles")
                        .select("title")
                        .eq("owl_sameas", nextNextPoleId)
                        .maybeSingle();

                      if (poleError) {
                        console.error(`[デバッグ] バス停マスタの名称取得でエラーが発生:`, poleError);
                      }

                      if (poleData) {
                        nextNextBusstopName = poleData.title;
                      }
                    }
                  }
                  console.log(`バスID ${bus["@id"]} の次の次のバス停名は:`, nextNextBusstopName);

                  // 💡 【復活ロジック】到着予定時刻のパース（出発時刻 ＋ リアルタイム遅延）
                  if (correctStopData.departure_time) {
                    const [hh, mm] = correctStopData.departure_time.split(":").map(Number);
                    const baseTime = new Date();
                    baseTime.setHours(hh, mm, 0, 0);

                    // リアルタイムの遅延（秒）を足し算
                    const delaySeconds = bus["odpt:delay"] || 0;
                    baseTime.setSeconds(baseTime.getSeconds() + delaySeconds);

                    const estH = String(baseTime.getHours()).padStart(2, "0");
                    const estM = String(baseTime.getMinutes()).padStart(2, "0");
                    arrivalEstimateTime = `${estH}:${estM}`;
                  }
                }
              }
            }
          }

          // --- データのマージと整形（既存部分） ---
          const targetPoleId = bus["odpt:fromBusstopPole"]!;
          const matchedStop = busstops.find((stop) => stop["owl:sameAs"] === targetPoleId)!;
          const delaySeconds = bus["odpt:delay"] || 0;
          const delayMin = Math.floor(delaySeconds / 60);
          const rawOp = bus["odpt:operator"];
          const operatorName = OPERATOR_MAP[rawOp] || rawOp.split(":").pop() || "路線バス";
          const terminalPoleId = bus["odpt:terminalBusstopPole"];
          const noteText = bus["odpt:note"] || "";
          const lineName = noteText.split(" ")[0] || "";

          const destinationStop = dbTerminalStops.find(stop => stop.owl_sameas === terminalPoleId);
          let displayDestination = "路線バス";

          if (destinationStop) {
            displayDestination = operatorName === "都営バス" ? `${lineName} ${destinationStop.title} ゆき` : `${destinationStop.title} ゆき`;
          } else {
            displayDestination = bus["odpt:destinationSign"] || bus["odpt:note"] || "路線バス";
          }

          integratedBuses.push({
            id: bus["@id"],
            operatorName: operatorName,
            busNumber: bus["odpt:busNumber"] || "不明",
            fromStationName: matchedStop["dc:title"],
            toBusstopPoleId: toPoleId || null,
            nextNextBusstopName: nextNextBusstopName,
            arrivalEstimateTime: arrivalEstimateTime,
            delayMin: delayMin,
            position: [matchedStop["geo:lat"], matchedStop["geo:long"]] as [number, number],
            busroutePattern: patternId || null,
            destinationSign: displayDestination,
          });
        }

        setActiveBuses(integratedBuses);
      } catch (error) {
        console.error("バスの位置情報同期に失敗しました:", error);
      } finally {
        setLoadingBuses(false);
      }
    };

    // 初回フェッチ
    fetchBusLocations();

    // 30秒おきにリアルタイム更新
    const interval = setInterval(fetchBusLocations, 30000);
    return () => clearInterval(interval);
  }, [busstops]);

  return { activeBuses, loadingBuses };
};