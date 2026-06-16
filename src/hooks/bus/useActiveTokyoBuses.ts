import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { transit_realtime } from "gtfs-realtime-bindings";

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
  nextBusstopName: string | null;
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

export const useActiveTokyoBuses = (busstops: any[]) => {
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [loadingBuses, setLoadingBuses] = useState<boolean>(false);

  useEffect(() => {
    // 検索結果のバス停がない場合は、バスの位置追跡タイマーを回さない
    if (busstops.length === 0) {
      setActiveBuses([]);
      return;
    }

    const fetchAllBusLocations = async () => {
      setLoadingBuses(true);
      try {
        const API_KEY = process.env.REACT_APP_ODPT_KEY;
        const todayDayType = getTodayDayType();
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // ----------------------------------------------------
        // 🚀 ① 2つの独立したAPIリクエストを非同期で同時に走らせる（高速化）
        // ----------------------------------------------------
        const odptUrl = `https://api.odpt.org/api/v4/odpt:Bus?acl:consumerKey=${API_KEY}`;
        const keioProxyUrl = `/api-keio/api/v4/gtfs/realtime/odpt_KeioBus_AllLines_vehicle?acl:consumerKey=${API_KEY}`;
        const nishiTokyoProxyUrl = `https://api.odpt.org/api/v4/gtfs/realtime/odpt_NishiTokyoBus_NTBus_vehicle?acl:consumerKey=${API_KEY}`;

        const [resOdpt, resKeio, resNishiTokyo] = await Promise.all([
          fetch(odptUrl).catch(e => { console.error("ODPT API障害:", e); return null; }),
          fetch(keioProxyUrl).catch(e => { console.error("京王GTFS-R障害:", e); return null; }),
          fetch(nishiTokyoProxyUrl).catch(e => { console.error("西東京GTFS-R障害:", e); return null; })
        ]);

        const integratedBuses: ActiveBus[] = [];

        // ====================================================
        // 🚌 Aグループ: ODPT標準バスデータ（都営、西武、東急など）の処理
        // ====================================================
        if (resOdpt && resOdpt.ok) {
          const rawData: BusLiveRaw[] = await resOdpt.json();
          // 1. 現在の時刻を取得して「分」に変換
          const now = new Date();
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
          let calculatedDelayMin = 0;

          // 画面周辺のバス停にいるバスをフィルタ
          const filteredRawBuses = rawData.filter((bus) => {
            const targetPoleId = bus["odpt:fromBusstopPole"];
            if (!targetPoleId) return false;
            return busstops.some((stop) => stop["owl:sameAs"] === targetPoleId);
          });

          // 終点名マスタの一括取得
          const terminalPoleIds = Array.from(
            new Set(filteredRawBuses.map((bus) => bus["odpt:terminalBusstopPole"]).filter((id): id is string => !!id))
          );
          let dbTerminalStops: { owl_sameas: string; title: string }[] = [];
          if (terminalPoleIds.length > 0) {
            const { data } = await supabase.from('busstop_poles').select('owl_sameas, title').in('owl_sameas', terminalPoleIds);
            if (data) dbTerminalStops = data;
          }

          // 個々のバスデータをループ・解析
          for (const bus of filteredRawBuses) {
            const toPoleId = bus["odpt:toBusstopPole"];
            const patternId = bus["odpt:busroutePattern"];
            let nextBusstopName: string | null = null;
            let nextNextBusstopName: string | null = null;
            let arrivalEstimateTime: string | null = null;
            let arrivalMinutes = 0;

            if (toPoleId && patternId) {
              const { data: nxtPoleData } = await supabase
                .from("busstop_poles")
                .select("title")
                .eq("owl_sameas", toPoleId)
                .maybeSingle();
                if (nxtPoleData) nextBusstopName = nxtPoleData.title;

              let routeBase = "";
              const match = patternId.match(/:([A-Za-z0-9]+)\.([A-Za-z0-9-]+)/);
              if (match && match[1] && match[2]) {
                routeBase = `odpt.BusTimetable:${match[1]}.${match[2].split("-")[0]}`;
              }

              if (routeBase) {
                const { data: matchedObjects } = await supabase
                  .from("bus_timetable_objects")
                  .select(`index_order, departure_time, timetable_owl_sameas, bus_timetables!inner(calendar)`)
                  .eq("busstop_pole_owl_sameas", toPoleId)
                  .ilike("timetable_owl_sameas", `${routeBase}%`);

                if (matchedObjects && matchedObjects.length > 0) {
                  const calendarFiltered = matchedObjects.filter(obj => {
                    const cal = (obj.bus_timetables as any).calendar.toLowerCase();
                    if (todayDayType === "Weekday") return !cal.includes("saturday") && !cal.includes("holiday");
                    if (todayDayType === "Saturday") return cal.includes("saturday");
                    return cal.includes("holiday") || cal.includes("sunday");
                  });

                  const targetPool = calendarFiltered.length > 0 ? calendarFiltered : matchedObjects;
                  let bestMatchObj = null;
                  let minDiff = Infinity;

                  for (const obj of targetPool) {
                    if (!obj.departure_time) continue;
                    const [hh, mm] = obj.departure_time.split(":").map(Number);
                    const diff = Math.abs(nowMinutes - (hh * 60 + mm));
                    if (diff < minDiff) { minDiff = diff; bestMatchObj = obj; }
                  }

                  const correctStopData = bestMatchObj || targetPool[0];

                  if (correctStopData && correctStopData.index_order !== undefined) {
                    const nextNextOrder = parseInt(String(correctStopData.index_order), 10) + 1;
                    const { data: nextNextObjList } = await supabase
                      .from("bus_timetable_objects")
                      .select("busstop_pole_owl_sameas")
                      .eq("timetable_owl_sameas", String(correctStopData.timetable_owl_sameas).trim())
                      .eq("index_order", nextNextOrder);

                    if (nextNextObjList && nextNextObjList.length > 0 && nextNextObjList[0].busstop_pole_owl_sameas) {
                      const { data: poleData } = await supabase
                        .from("busstop_poles")
                        .select("title")
                        .eq("owl_sameas", nextNextObjList[0].busstop_pole_owl_sameas)
                        .maybeSingle();
                      if (poleData) nextNextBusstopName = poleData.title;
                    }

                    if (correctStopData.departure_time) {
                      // const [hh, mm] = correctStopData.departure_time.split(":").map(Number);

                      const parts = correctStopData.departure_time.split(':'); // ["18", "18", "00"]
                      const hours = parseInt(parts[0], 10);
                      const minutes = parseInt(parts[1], 10);

                      arrivalMinutes = hours * 60 + minutes;

                      // const baseTime = new Date();
                      // baseTime.setHours(hh, mm, 0, 0);
                      // baseTime.setSeconds(baseTime.getSeconds() + (bus["odpt:delay"] || 0));
                      // arrivalEstimateTime = `${String(baseTime.getHours()).padStart(2, "0")}:${String(baseTime.getMinutes()).padStart(2, "0")}`;
                    }
                  }
                }
              }

              console.log(`ODPTバスの発車バス停: ${bus["odpt:fromBusstopPole"]}, route: ${routeBase}`);
              const { data: targetObjects } = await supabase
                .from("bus_timetable_objects")
                .select(`departure_time, timetable_owl_sameas`)
                .eq("busstop_pole_owl_sameas", bus["odpt:fromBusstopPole"])
                .ilike("timetable_owl_sameas", `${routeBase}%`);
              
              // let scheduledTotalMinutes = 0;
              if (targetObjects && targetObjects.length > 0) {
                let bestMatchObj = null;
                let minDiff = Infinity;
                // let calculatedTime = 0;

                for (const obj of targetObjects) {
                  if (!obj.departure_time) continue;

                  const [hh, mm] = obj.departure_time.split(":").map(Number);
                  const diff = Math.abs(nowMinutes - (hh * 60 + mm));
                  // let calculatedTime = hh * 60 + mm;
                  
                  if (diff < minDiff) { minDiff = diff; bestMatchObj = obj; }

                  const correctStopData = bestMatchObj || targetObjects[0];
                  if (correctStopData && correctStopData.departure_time) {
                    console.log(`ODPTバスの到着時間: ${correctStopData.departure_time}, 現在時刻との差分: ${minDiff} 分`);
                    let scheduledTotalMinutes = 0;
                    
                    // departure_time ("18:18:00") をパースして「分」に変換
                    const timeParts = correctStopData.departure_time.split(':'); // ["18", "18", "00"]
                    const scheduledHours = parseInt(timeParts[0], 10);
                    const scheduledMinutes = parseInt(timeParts[1], 10);
                    scheduledTotalMinutes = scheduledHours * 60 + scheduledMinutes;

                    // 4. 差分を計算 (現在時刻 - 予定時刻)
                    const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

                    // 5. マイナスの場合は定刻運行（フライング防止）とし、プラスの場合のみ遅延として採用
                    // ※深夜0時を跨ぐルートがある場合は別途考慮が必要ですが、通常の運行時間帯ならこれで正確に動きます
                    calculatedDelayMin = Math.max(0, diffMinutes);

                    const predictedMinutes = currentTotalMinutes + (scheduledTotalMinutes - arrivalMinutes);
                    // 24時間を超える場合や、前日の時間になる場合の循環処理（念のため）
                    const normalizedMinutes = (predictedMinutes + 1440) % 1440;
                    
                    const resHours = Math.floor(normalizedMinutes / 60);
                    const resMinutes = normalizedMinutes % 60;
                    
                    // "05:09" のように2桁にパディングして文字列化
                    arrivalEstimateTime = `${String(resHours).padStart(2, '0')}:${String(resMinutes).padStart(2, '0')}`;
                  }
                }
              }
            }

            const targetPoleId = bus["odpt:fromBusstopPole"]!;
            const matchedStop = busstops.find((stop) => stop["owl:sameAs"] === targetPoleId)!;
            const operatorName = OPERATOR_MAP[bus["odpt:operator"]] || bus["odpt:operator"].split(":").pop() || "路線バス";
            const terminalPoleId = bus["odpt:terminalBusstopPole"];
            const destinationStop = dbTerminalStops.find(stop => stop.owl_sameas === terminalPoleId);
            
            let displayDestination = bus["odpt:destinationSign"] || bus["odpt:note"] || "路線バス";
            if (destinationStop) {
              const lineName = (bus["odpt:note"] || "").split(" ")[0] || "";
              displayDestination = operatorName === "都営バス" ? `${lineName} ${destinationStop.title} ゆき` : `${destinationStop.title} ゆき`;
            }

            // 配列に格納
            integratedBuses.push({
              id: bus["@id"],
              operatorName,
              busNumber: bus["odpt:busNumber"] || "不明",
              fromStationName: matchedStop["dc:title"],
              toBusstopPoleId: toPoleId || null,
              nextBusstopName: nextBusstopName || null,
              nextNextBusstopName: nextNextBusstopName || null,
              arrivalEstimateTime,
              delayMin: calculatedDelayMin,
              position: [matchedStop["geo:lat"], matchedStop["geo:long"]],
              busroutePattern: patternId || null,
              destinationSign: displayDestination,
            });
          }
        }

        // ====================================================
        // 🚌 Bグループ: 京王バス（GTFS-Realtime バイナリ形式）の処理
        // ====================================================
        if (resKeio && resKeio.ok) {
          const arrayBuffer = await resKeio.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));

          // パフォーマンスのため、現在画面に描画されているバス停のIDのSetを作る
          const screenStopIds = new Set(busstops.map(s => s["owl:sameAs"]));
          console.log("画面内のバス停IDセット:", screenStopIds);

          // 1. 現在の時刻を取得して「分」に変換
          const now = new Date();
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

          for (const entity of feed.entity) {
            if (!entity.vehicle) continue;
            const v = entity.vehicle;
            const stopId = v.stopId || null;
            if (!stopId) continue;
            
            // 京王の stopId（向かっている、または停車中のバス停ID）を取得
            const currentStopId = `keio:BusstopPole:${v.stopId}` || null;
            if (!currentStopId) continue;

            // 💡 画面内のバス停リストの中に、京王バスが位置するバス停が含まれる場合のみ採用
            // (GTFSのstopIdは odpt.BusstopPole:KeioBus... 形式のIDと完全一致します)
            if (screenStopIds.has(currentStopId)) {
              const matchedStop = busstops.find(s => s["owl:sameAs"] === currentStopId)!;
              // console.log(`京王バスが位置するバス停を発見: ${matchedStop["dc:title"]} (${currentStopId})`);

              // 京王バスの系統ID・便IDを取得
              const gtfsRouteId = v.trip?.tripId || null;
              // console.log(`京王バスのGTFS v.trip: ${v.trip ? JSON.stringify(v.trip) : "情報なし"}`);

              // ODPT互換のbusroutePattern形式に擬態させる
              const simulatedPatternId = gtfsRouteId ? `keio:BusroutePattern:${gtfsRouteId}` : null;
              // console.log(`京王バスのシミュレートされたbusroutePattern: ${simulatedPatternId}`);

              let keioNextPoleId: string | null = null;
              let keioNextName: string | null = null;
              let keioNextNextName: string | null = null;
              let keioEstimateTime: string | null = null;
              let destinationName: string | null = null;
              let calculatedDelayMin = 0;

              // 現在地を追跡
              if (simulatedPatternId) {
                const { data: matchedObjects } = await supabase
                  .from("bus_timetable_objects")
                  .select(`index_order, departure_time, timetable_owl_sameas`)
                  .eq("busstop_pole_owl_sameas", currentStopId)
                  .ilike("timetable_owl_sameas", `keio:Timetable:${gtfsRouteId}%`);

                if (matchedObjects && matchedObjects.length > 0) {
                  let bestMatchObj = null;
                  let minDiff = Infinity;
                  // let calculatedTime = 0;

                  for (const obj of matchedObjects) {
                    if (!obj.departure_time) continue;

                    const [hh, mm] = obj.departure_time.split(":").map(Number);
                    const diff = Math.abs(nowMinutes - (hh * 60 + mm));
                    // let calculatedTime = hh * 60 + mm;
                    
                    if (diff < minDiff) { minDiff = diff; bestMatchObj = obj; }
                  }
                  console.log(`minDiff: ${minDiff} 分, bestMatchObj: ${bestMatchObj ? JSON.stringify(bestMatchObj) : "なし"}`);

                  const correctStopData = bestMatchObj || matchedObjects[0];
                  if (correctStopData && correctStopData.index_order !== undefined) {

                    // --------------------------------------------------------
                    // 💡 京王バス用：現在の時間と予定時刻から遅延（分）を算出する
                    // --------------------------------------------------------
                    let scheduledTotalMinutes = 0;
                    if (correctStopData.departure_time) {

                      // 2. departure_time ("18:18:00") をパースして「分」に変換
                      const timeParts = correctStopData.departure_time.split(':'); // ["18", "18", "00"]
                      const scheduledHours = parseInt(timeParts[0], 10);
                      const scheduledMinutes = parseInt(timeParts[1], 10);
                      scheduledTotalMinutes = scheduledHours * 60 + scheduledMinutes;

                      // 4. 差分を計算 (現在時刻 - 予定時刻)
                      const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

                      // 5. マイナスの場合は定刻運行（フライング防止）とし、プラスの場合のみ遅延として採用
                      // ※深夜0時を跨ぐルートがある場合は別途考慮が必要ですが、通常の運行時間帯ならこれで正確に動きます
                      calculatedDelayMin = Math.max(0, diffMinutes);
                    }

                    const nextOrder = parseInt(String(correctStopData.index_order), 10) + 1;
                    
                    const { data: nxtList } = await supabase
                      .from("bus_timetable_objects")
                      .select("index_order, busstop_pole_owl_sameas, departure_time")
                      .eq("timetable_owl_sameas", String(correctStopData.timetable_owl_sameas).trim())
                      .eq("index_order", nextOrder);

                    if (nxtList && nxtList.length > 0 && nxtList[0].busstop_pole_owl_sameas) {
                      const nextNextOrder = parseInt(String(nxtList[0].index_order), 10) + 1;
                      keioNextPoleId = nxtList[0].busstop_pole_owl_sameas;
                      const predictedTime = nxtList[0].departure_time ? nxtList[0].departure_time.substring(0, 5) : null;
                      
                      if (predictedTime) {
                        const parts = predictedTime.split(':'); // ["18", "18", "00"]
                        const hours = parseInt(parts[0], 10);
                        const minutes = parseInt(parts[1], 10);

                        const predictedMinutes = currentTotalMinutes + ((hours * 60 + minutes) - scheduledTotalMinutes);
                        // 24時間を超える場合や、前日の時間になる場合の循環処理（念のため）
                        const normalizedMinutes = (predictedMinutes + 1440) % 1440;
                        
                        const resHours = Math.floor(normalizedMinutes / 60);
                        const resMinutes = normalizedMinutes % 60;
                        
                        // "05:09" のように2桁にパディングして文字列化
                        keioEstimateTime = `${String(resHours).padStart(2, '0')}:${String(resMinutes).padStart(2, '0')}`;
                      }
                      else {
                        keioEstimateTime = null; // 予測時間が計算できない場合は null にする
                      }
                      console.log(`京王バスの到着時間: ${correctStopData.departure_time}, 予測到着時刻: ${keioEstimateTime}, 遅延時間: ${calculatedDelayMin} 分`);

                      const { data: nxtPoleData } = await supabase
                          .from("busstop_poles")
                          .select("title")
                          .eq("owl_sameas", nxtList[0].busstop_pole_owl_sameas)
                          .maybeSingle();
                        if (nxtPoleData) keioNextName = nxtPoleData.title;

                      const { data: nxtNextList } = await supabase
                        .from("bus_timetable_objects")
                        .select("index_order, busstop_pole_owl_sameas, departure_time")
                        .eq("timetable_owl_sameas", String(correctStopData.timetable_owl_sameas).trim())
                        .eq("index_order", nextNextOrder);

                      if (nxtNextList && nxtNextList.length > 0 && nxtNextList[0].busstop_pole_owl_sameas) {
                        const { data: nxtNextPoleData } = await supabase
                          .from("busstop_poles")
                          .select("title")
                          .eq("owl_sameas", nxtNextList[0].busstop_pole_owl_sameas)
                          .maybeSingle();
                        if (nxtNextPoleData) keioNextNextName = nxtNextPoleData.title;
                      }
                    }
                  }
                }

                const { data: matchedTimetable } = await supabase
                  .from("bus_timetables")
                  .select(`title, destination, calendar`)
                  .eq("busroute_pattern", simulatedPatternId);

                  if (matchedObjects && matchedObjects.length > 0) {
                    const timetableInfo = matchedTimetable ? matchedTimetable[0] : null;
                    if (timetableInfo) {
                      destinationName = timetableInfo.destination || destinationName;  
                    }
                  }
              }

              // 共通の ActiveBus 構造に無理やり綺麗にマッピング！
              integratedBuses.push({
                id: `KeioBus:${v.vehicle?.id || Math.random().toString()}`,
                operatorName: "京王バス",
                busNumber: v.vehicle?.id || "不明",
                fromStationName: matchedStop["dc:title"], // 現在関わりのある停留所名
                toBusstopPoleId: keioNextPoleId,
                nextBusstopName: keioNextName || null,
                nextNextBusstopName: keioNextNextName || null,
                arrivalEstimateTime: keioEstimateTime,
                delayMin: calculatedDelayMin,
                // 💡 京王は、バス停固定座標ではなく「GPSが返してきた本物の現在位置」を優先してマーカー配置可能！
                position: v.position?.latitude ? [v.position.latitude, v.position.longitude] : [matchedStop["geo:lat"], matchedStop["geo:long"]],
                busroutePattern: simulatedPatternId,
                destinationSign: destinationName ? `${destinationName} ゆき` : "京王バス",
              });
            }
          }
        }

        // ====================================================
        // 🚌 Cグループ: 西東京バス（GTFS-Realtime バイナリ形式）の処理
        // ====================================================
        if (resNishiTokyo && resNishiTokyo.ok) {
          const arrayBuffer = await resNishiTokyo.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));

          // パフォーマンスのため、現在画面に描画されているバス停のIDのSetを作る
          const screenStopIds = new Set(busstops.map(s => s["owl:sameAs"]));
          console.log("画面内のバス停IDセット:", screenStopIds);

          // 1. 現在の時刻を取得して「分」に変換
          const now = new Date();
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

          for (const entity of feed.entity) {
            if (!entity.vehicle) continue;
            const v = entity.vehicle;
            const stopId = v.stopId || null;
            if (!stopId) continue;
            
            // 西東京バスの stopId（向かっている、または停車中のバス停ID）を取得
            const currentStopId = `nishitokyo:BusstopPole:${v.stopId}` || null;
            if (!currentStopId) continue;

            // 💡 画面内のバス停リストの中に、西東京バスが位置するバス停が含まれる場合のみ採用
            // (GTFSのstopIdは odpt.BusstopPole:NishiTokyoBus... 形式のIDと完全一致します)
            if (screenStopIds.has(currentStopId)) {
              const matchedStop = busstops.find(s => s["owl:sameAs"] === currentStopId)!;
              // console.log(`西東京バスが位置するバス停を発見: ${matchedStop["dc:title"]} (${currentStopId})`);

              // 西東京バスの系統ID・便IDを取得
              const gtfsRouteId = v.trip?.tripId || null;
              // console.log(`西東京バスのGTFS v.trip: ${v.trip ? JSON.stringify(v.trip) : "情報なし"}`);

              // ODPT互換のbusroutePattern形式に擬態させる
              const simulatedPatternId = gtfsRouteId ? `nishitokyo:BusroutePattern:${gtfsRouteId}` : null;
              // console.log(`西東京バスのシミュレートされたbusroutePattern: ${simulatedPatternId}`);

              let nishiTokyoNextPoleId: string | null = null;
              let nishiTokyoNextName: string | null = null;
              let nishiTokyoNextNextName: string | null = null;
              let nishiTokyoEstimateTime: string | null = null;
              let destinationName: string | null = null;
              let calculatedDelayMin = 0;

              // 現在地を追跡
              if (simulatedPatternId) {
                const { data: matchedObjects } = await supabase
                  .from("bus_timetable_objects")
                  .select(`index_order, departure_time, timetable_owl_sameas`)
                  .eq("busstop_pole_owl_sameas", currentStopId)
                  .ilike("timetable_owl_sameas", `nishitokyo:Timetable:${gtfsRouteId}%`);

                if (matchedObjects && matchedObjects.length > 0) {
                  let bestMatchObj = null;
                  let minDiff = Infinity;
                  // let calculatedTime = 0;

                  for (const obj of matchedObjects) {
                    if (!obj.departure_time) continue;

                    const [hh, mm] = obj.departure_time.split(":").map(Number);
                    const diff = Math.abs(nowMinutes - (hh * 60 + mm));
                    // let calculatedTime = hh * 60 + mm;
                    
                    if (diff < minDiff) { minDiff = diff; bestMatchObj = obj; }
                  }
                  console.log(`minDiff: ${minDiff} 分, bestMatchObj: ${bestMatchObj ? JSON.stringify(bestMatchObj) : "なし"}`);

                  const correctStopData = bestMatchObj || matchedObjects[0];
                  if (correctStopData && correctStopData.index_order !== undefined) {

                    // --------------------------------------------------------
                    // 💡 京王バス用：現在の時間と予定時刻から遅延（分）を算出する
                    // --------------------------------------------------------
                    let scheduledTotalMinutes = 0;
                    if (correctStopData.departure_time) {

                      // 2. departure_time ("18:18:00") をパースして「分」に変換
                      const timeParts = correctStopData.departure_time.split(':'); // ["18", "18", "00"]
                      const scheduledHours = parseInt(timeParts[0], 10);
                      const scheduledMinutes = parseInt(timeParts[1], 10);
                      scheduledTotalMinutes = scheduledHours * 60 + scheduledMinutes;

                      // 4. 差分を計算 (現在時刻 - 予定時刻)
                      const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

                      // 5. マイナスの場合は定刻運行（フライング防止）とし、プラスの場合のみ遅延として採用
                      // ※深夜0時を跨ぐルートがある場合は別途考慮が必要ですが、通常の運行時間帯ならこれで正確に動きます
                      calculatedDelayMin = Math.max(0, diffMinutes);
                    }

                    const nextOrder = parseInt(String(correctStopData.index_order), 10) + 1;
                    
                    const { data: nxtList } = await supabase
                      .from("bus_timetable_objects")
                      .select("index_order, busstop_pole_owl_sameas, departure_time")
                      .eq("timetable_owl_sameas", String(correctStopData.timetable_owl_sameas).trim())
                      .eq("index_order", nextOrder);

                    if (nxtList && nxtList.length > 0 && nxtList[0].busstop_pole_owl_sameas) {
                      const nextNextOrder = parseInt(String(nxtList[0].index_order), 10) + 1;
                      nishiTokyoNextPoleId = nxtList[0].busstop_pole_owl_sameas;
                      const predictedTime = nxtList[0].departure_time ? nxtList[0].departure_time.substring(0, 5) : null;
                      
                      if (predictedTime) {
                        const parts = predictedTime.split(':'); // ["18", "18", "00"]
                        const hours = parseInt(parts[0], 10);
                        const minutes = parseInt(parts[1], 10);

                        const predictedMinutes = currentTotalMinutes + ((hours * 60 + minutes) - scheduledTotalMinutes);
                        // 24時間を超える場合や、前日の時間になる場合の循環処理（念のため）
                        const normalizedMinutes = (predictedMinutes + 1440) % 1440;
                        
                        const resHours = Math.floor(normalizedMinutes / 60);
                        const resMinutes = normalizedMinutes % 60;
                        
                        // "05:09" のように2桁にパディングして文字列化
                        nishiTokyoEstimateTime = `${String(resHours).padStart(2, '0')}:${String(resMinutes).padStart(2, '0')}`;
                      }
                      else {
                        nishiTokyoEstimateTime = null; // 予測時間が計算できない場合は null にする
                      }
                      console.log(`西東京バスの到着時間: ${correctStopData.departure_time}, 予測到着時刻: ${nishiTokyoEstimateTime}, 遅延時間: ${calculatedDelayMin} 分`);

                      const { data: nxtPoleData } = await supabase
                          .from("busstop_poles")
                          .select("title")
                          .eq("owl_sameas", nxtList[0].busstop_pole_owl_sameas)
                          .maybeSingle();
                        if (nxtPoleData) nishiTokyoNextName = nxtPoleData.title;

                      const { data: nxtNextList } = await supabase
                        .from("bus_timetable_objects")
                        .select("index_order, busstop_pole_owl_sameas, departure_time")
                        .eq("timetable_owl_sameas", String(correctStopData.timetable_owl_sameas).trim())
                        .eq("index_order", nextNextOrder);

                      if (nxtNextList && nxtNextList.length > 0 && nxtNextList[0].busstop_pole_owl_sameas) {
                        const { data: nxtNextPoleData } = await supabase
                          .from("busstop_poles")
                          .select("title")
                          .eq("owl_sameas", nxtNextList[0].busstop_pole_owl_sameas)
                          .maybeSingle();
                        if (nxtNextPoleData) nishiTokyoNextNextName = nxtNextPoleData.title;
                      }
                    }
                  }
                }

                const { data: matchedTimetable } = await supabase
                  .from("bus_timetables")
                  .select(`title, destination, calendar`)
                  .eq("busroute_pattern", simulatedPatternId);

                  if (matchedObjects && matchedObjects.length > 0) {
                    const timetableInfo = matchedTimetable ? matchedTimetable[0] : null;
                    if (timetableInfo) {
                      destinationName = timetableInfo.destination || destinationName;  
                    }
                  }
              }

              // 共通の ActiveBus 構造に無理やり綺麗にマッピング！
              integratedBuses.push({
                id: `NishiTokyoBus:${v.vehicle?.id || Math.random().toString()}`,
                operatorName: "西東京バス",
                busNumber: v.vehicle?.id || "不明",
                fromStationName: matchedStop["dc:title"], // 現在関わりのある停留所名
                toBusstopPoleId: nishiTokyoNextPoleId,
                nextBusstopName: nishiTokyoNextName || null,
                nextNextBusstopName: nishiTokyoNextNextName || null,
                arrivalEstimateTime: nishiTokyoEstimateTime,
                delayMin: calculatedDelayMin,
                // 💡 西東京は、バス停固定座標ではなく「GPSが返してきた本物の現在位置」を優先してマーカー配置可能！
                position: v.position?.latitude ? [v.position.latitude, v.position.longitude] : [matchedStop["geo:lat"], matchedStop["geo:long"]],
                busroutePattern: simulatedPatternId,
                destinationSign: destinationName ? `${destinationName} ゆき` : "西東京バス",
              });
            }
          }
        }

        console.log(`統合後の走行中バス数: ${integratedBuses.length}`);
        console.log("サンプル統合バスデータ:", integratedBuses.slice(0, 20)); // 最初の20台だけ表示

        // 💡 最後に両方の全バスをがっちゃんこしてステートにセット
        setActiveBuses(integratedBuses);

      } catch (error) {
        console.error("統合バス位置情報の取得に失敗しました:", error);
      } finally {
        setLoadingBuses(false);
      }
    };

    // 30秒間隔で並列リフレッシュ
    fetchAllBusLocations();
    const interval = setInterval(fetchAllBusLocations, 30000);
    return () => clearInterval(interval);
  }, [busstops]);

  return { activeBuses, loadingBuses };
};