/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { transit_realtime } from "gtfs-realtime-bindings";

// 掲示板用に整形された1便ずつの型
export interface BoardTrip {
  time: string;
  route: string;
  destination: string;
  status: string;
  isApproaching: boolean;
}

// のりばごとの型
export interface BoardPlatform {
  platformName: string;
  trips: BoardTrip[];
}

// ODPTのリアルタイムバス情報の型定義
interface OdptBusRealtime {
  "odpt:busroute": string;
  "odpt:busTimetable"?: string;      // 運行中の元となる時刻表ID
  "odpt:fromBusstopPole"?: string;   // 手前の停留所
  "odpt:toBusstopPole"?: string;     // 次（向かっている）の停留所
  "odpt:delay"?: number;             // 遅延秒数
}

interface UseBusPoleTimeTableResult {
  mapCenter: [number, number];
  loading: boolean;
  errorMessage: string;
  terminalBoards: BoardPlatform[]; // 💡 電光掲示板用のステート
  searchStationAndBusstops: (query: string) => Promise<void>;
  searchByCoordinates: (lat: number, lon: number) => Promise<void>;
}

export const useBusPoleTimeTable = (
  initialCenter: [number, number], 
  operator: string): UseBusPoleTimeTableResult => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [terminalBoards, setTerminalBoards] = useState<BoardPlatform[]>([]);

  // 今日の曜日区分（データベースのcalendarカラム用）を返却するヘルパー
  const getCurrentCalendarType = (): string => {
    const day = new Date().getDay();
    if (day === 6) return 'saturday';
    if (day === 0) return 'holiday';
    return 'weekday';
  };

  // 🚌 周辺の全のりばの時刻表をまとめて取得・成形するコアロジック
  const fetchTerminalTimetables = async (latitude: number, longitude: number) => {
    let t_operator = operator;

    if (operator === 'odpt.Operator:Toei' || operator === 'odpt.Operator:SeibuBus' || operator === 'odpt.Operator:YokohamaMunicipal' ) {
      t_operator = `["${operator}"]`;
    }

    console.log(`t_operator: ${t_operator}`);

    // 1. 周辺 1,000m 以内のバス停ポールを RPC から取得
    const { data: nearbyPoles, error: rpcError } = await supabase.rpc('search_nearby_busstops_for_board', {
      target_lat: latitude,
      target_lon: longitude,
      radius_meters: 1000,
      target_operator: t_operator
    });

    if (rpcError) throw rpcError;
    if (!nearbyPoles || nearbyPoles.length === 0) {
      setTerminalBoards([]);
      return;
    }

    // ポールIDの配列を作成
    const poleIds = nearbyPoles.map((p: any) => p.owl_sameas);
    console.log(`見つかったのりば数: ${poleIds.length} 件。時刻表を取得中...`);
    console.log(poleIds);
    const calendarType = getCurrentCalendarType();

    // 現在の「時:分:秒」を取得して、直近のバスだけを絞り込む
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    // 2. 該当するポールに紐づく直近の通過オブジェクトを一括取得
    const { data: sbObjects, error: sbError } = await supabase
      .from('bus_timetable_objects')
      .select(`
        departure_time,
        busstop_pole_owl_sameas,
        timetable_owl_sameas,
        bus_timetables (
          calendar,
          busroute,
          busroute_pattern,
          title,
          destination
        )
      `)
      .in('busstop_pole_owl_sameas', poleIds)
      .gte('departure_time', timeStr) // 現在時刻以降
      .order('departure_time', { ascending: true });

    if (sbError) throw sbError;
    if (!sbObjects || sbObjects.length === 0) {
      setTerminalBoards([]);
      return;
    }

    // JavaScript側での重複排除（DISTINCT）
    const distinctBusObjects: any[] = [];
    const seenKeys = new Set<string>();

    sbObjects.forEach((item: any) => {
      const parent = item.bus_timetables;
      if (!parent) return; // 親データがない場合はスキップ

      // 💡 「出発時刻」「バス停ID」「系統」を組み合わせたユニークキーを作成
      const uniqueKey = `${item.departure_time}_${item.busstop_pole_owl_sameas || ''}_${parent.busroute || ''}`;

      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        distinctBusObjects.push(item); // 重複していないものだけを新しい配列に入れる
      }
    });

    // -------------------------------------------------------------------------
    // 3. リアルタイム運行情報（odpt:Bus）の取得
    // -------------------------------------------------------------------------
    let realtimeBuses: OdptBusRealtime[] = [];
    try {
      const API_KEY = process.env.REACT_APP_ODPT_KEY;
      let busUrl = "";

      if (operator === "odpt.Operator:KeioBus" || operator === "odpt.Operator:NishiTokyoBus") {
        if (operator === "odpt.Operator:KeioBus") {
          busUrl = `/api-keio/api/v4/gtfs/realtime/odpt_KeioBus_AllLines_vehicle?acl:consumerKey=${API_KEY}`;
        } else {
          busUrl = `https://api.odpt.org/api/v4/gtfs/realtime/odpt_NishiTokyoBus_NTBus_vehicle?acl:consumerKey=${API_KEY}`;
        }

        const resGfts = await fetch(busUrl);

        if (resGfts && resGfts.ok) {
          const arrayBuffer = await resGfts.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));

          // 🟢 GTFS-Realtime形式を ODPT JSON形式に変換して集約
          const convertedBuses: OdptBusRealtime[] = [];
          
          feed.entity.forEach((entity) => {
            // 💡 tripUpdate ではなく vehicle オブジェクトを解析します
            const vehicle = entity.vehicle;
            if (!vehicle || !vehicle.trip) return;

            // vehicle.trip から各IDを抽出
            const timetableId = vehicle.trip.tripId || ""; 
            // const routeId = vehicle.trip.routeId || ""; // もし routeId が取れない場合は空文字、または特定ロジックで補完

            // 💡 vehicle 直下の stopId が「向かっている停留所」を表します
            let toBusstopPole = "";
            let busroute = "";
            let busTimetable = "";

            if (vehicle.stopId) {
              // システム側の owl_sameas (例: "odpt.BusstopPole:KeioBus.1409_01") の形式に整形
              if (operator === "odpt.Operator:KeioBus") {
                toBusstopPole = `keio:BusstopPole:${vehicle.stopId}`;
                busroute = `keio:BusroutePattern:${timetableId}`;
                busTimetable = `keio:Timetable:${timetableId}`;
              } else {
                toBusstopPole = `nishitokyo:BusstopPole:${vehicle.stopId}`;
                busroute = `nishitokyo:BusroutePattern:${timetableId}`;
                busTimetable = `nishitokyo:Timetable:${timetableId}`;
              }
            }

            if (toBusstopPole) {
              convertedBuses.push({
                // routeId が無ければ timetableId でフォールバック（前方一致などのマッチング用）
                "odpt:busroute": busroute, 
                "odpt:busTimetable": busTimetable,
                "odpt:toBusstopPole": toBusstopPole,
                "odpt:delay": 0 // VehiclePositionからは遅延が取れないため一律0（接近判定メイン）
              });
            }
          });

          realtimeBuses = convertedBuses;
          console.log(`GTFSデコード完了: ${realtimeBuses.length}件のマッチング用データを生成`);
        }
      } else {
        busUrl = `https://api.odpt.org/api/v4/odpt:Bus?odpt:operator=${operator}&acl:consumerKey=${API_KEY}`;

        const busRes = await fetch(busUrl);
        if (busRes.ok) {
          realtimeBuses = await busRes.json();
        }
      }
    } catch (e) {
      console.error("リアルタイムバス情報の取得に失敗しました(時刻表のみで続行):", e);
    }

    // -------------------------------------------------------------------------
    // 4. データを「のりば名」をキーにしてグループ化する
    // -------------------------------------------------------------------------
    const groups: { [platformName: string]: BoardTrip[] } = {};
    // console.log(`取得した通過オブジェクト数: ${distinctBusObjects ? distinctBusObjects.length : 0} 件。掲示板用に整形中...`);

    distinctBusObjects?.forEach((item: any) => {
      const parent = item.bus_timetables;
      if (!parent) return;

      // カレンダーの簡易正規化判定
      const cal: string = parent.calendar || "";
      if (!cal.toLowerCase().includes(calendarType)) return; // 今日の曜日に合わないものはスキップ

      // ポール名（例: "東京駅丸の内北口（０番のりば）"）から「0番のりば」を抽出するロジック
      const matchedPole = nearbyPoles.find((p: any) => p.owl_sameas === item.busstop_pole_owl_sameas);

      // 元の文字列（例）: "odpt.BusstopPole:Toei.KonanChugakko.500.2"
      const poleName = matchedPole ? matchedPole.title : "";
      const rawTitle = matchedPole ? matchedPole.owl_sameas : "";

      let platformName = "その他のりば";

      if (rawTitle) {
        // 💡 ドット "." で文字列を配列に分割します
        let parts = [];
        if (operator === 'odpt.Operator:Toei' || operator === 'odpt.Operator:SeibuBus' || operator === 'odpt.Operator:YokohamaMunicipal') {
          parts = rawTitle.split('.');
        }
        else {
          parts = rawTitle.split('_');
        }
        
        // 💡 配列の最後の要素（末尾の番号）を取り出します
        const lastPart = parts.pop(); 
        // console.log(`lastPart:${lastPart}`)

        // 数字が取れた場合は「〇番のりば」、それ以外はフォールバック
        if (lastPart && !isNaN(Number(lastPart))) {
          if (lastPart === "15") {
            platformName = "降車専用";
          } else {
            platformName = `${lastPart}番のりば`;
          }
        } else {
          platformName = "その他のりば";
        }
      }

      const platformKey = `${poleName} ${platformName}`;

      // 時刻表ベースの基本残り時間
      const [hh, mm] = item.departure_time.split(':').map(Number);
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const scheduledTotalMinutes = hh * 60 + mm;
      const diffMin = scheduledTotalMinutes - currentTotalMinutes;
      
      // -------------------------------------------------------------------------
      // 5. 時刻表データ（item）とリアルタイムデータ（realtimeBuses）のマッチング
      // -------------------------------------------------------------------------
      let liveBus;
      if (operator === "odpt.Operator:KeioBus" || operator === "odpt.Operator:NishiTokyoBus") {
        liveBus = realtimeBuses.find(bus => 
          (bus["odpt:busroute"] === parent.busroute_pattern && bus["odpt:toBusstopPole"] === item.busstop_pole_owl_sameas)
        );
      } else {
        liveBus = realtimeBuses.find(bus => 
          bus["odpt:busTimetable"] === item.timetable_owl_sameas || 
          (bus["odpt:busroute"] === parent.busroute && bus["odpt:toBusstopPole"] === item.busstop_pole_owl_sameas)
        );
      }

      let status = "本日運行予定";
      let isApproaching = false;

      if (liveBus) {
        // 🟢 拡張：遅延時間（分）の算出ロジック
        let delayMinutes = 0;

        if (liveBus["odpt:delay"] !== undefined && liveBus["odpt:delay"] > 0) {
          // APIから直接odpt:delay(秒)が取得できる場合（都営など）
          delayMinutes = Math.floor(liveBus["odpt:delay"] / 60);
        } else {
          // 💡 西武バスなど、APIからdelayが取れない場合の計算ロジック
          // (現在時刻 - 予定時刻) で遅延している差分を割り出す
          const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;
          // プラス（現在時刻の方が過ぎている）の場合のみ、遅延として採用
          delayMinutes = Math.max(0, diffMinutes);
        }

        // B. 接近情報の解析
        // このバスの「次の停留所（toBusstopPole）」が、今まさにこの電光掲示板のターゲットポールである場合
        let timetableOwlSameas = "";
        if (operator === "odpt.Operator:KeioBus" || operator === "odpt.Operator:NishiTokyoBus") {
          timetableOwlSameas = item.timetable_owl_sameas.replace(/:[^:]+$/, "");
        } else {
          timetableOwlSameas = item.timetable_owl_sameas;
        }

        if (liveBus["odpt:toBusstopPole"] === item.busstop_pole_owl_sameas 
            && liveBus["odpt:busTimetable"] === timetableOwlSameas
          ) {
          status = "まもなく来ます";
          isApproaching = true;

          // 💡 「まもなく来ます」の状態でも、遅延があれば掲示板へ「接近中 (○分遅れ)」を出す
          if (delayMinutes > 0) {
            status = `接近中 (${delayMinutes}分遅れ)`;
          }
          console.log(liveBus);
        } else {
          // ターゲットの手前にいる場合
          if (delayMinutes > 0) {
            status = `${delayMinutes}分遅れ`;
          } else {
            status = `あと ${diffMin} 分`;
          }
        }
        console.log(`リアルタイム情報で更新: ${parent.title} → ${status} (算出遅延: ${delayMinutes}分)`);
      } else {
        // リアルタイム情報がまだない/取得できなかった場合のフォールバック（従来のロジック）
        if (diffMin <= 3) {
          status = "まもなく来ます";
          isApproaching = true;
        } else if (diffMin <= 10) {
          status = `あと ${diffMin} 分`;
        }
        // console.log(`リアルタイム情報なし: ${parent.title} → ${status}`);
      }

      if (!groups[platformKey]) {
        groups[platformKey] = [];
      }

      // 各のりば先発・次発の最大3件まで表示させる
      if (groups[platformKey].length < 3) {
        groups[platformKey].push({
          time: item.departure_time.substring(0, 5),
          route: parent.title || "系統なし", // 「東43」など
          destination: parent.destination || "終点行き",
          status: status,
          isApproaching: isApproaching
        });
      }
    });

    // 6. 配列形式にコンバートしてソート
    const formattedBoards: BoardPlatform[] = Object.keys(groups).map(key => ({
      platformName: key,
      trips: groups[key]
    })).sort((a, b) => a.platformName.localeCompare(b.platformName, 'ja', { numeric: true })); // のりば順に並び替え

    setTerminalBoards(formattedBoards);
  };

  // 指定座標から検索
  const searchByCoordinates = async (lat: number, lon: number) => {
    setLoading(true);
    setErrorMessage('');
    try {
      setMapCenter([lat, lon]);
      await fetchTerminalTimetables(lat, lon);
    } catch (error) {
      console.error(error);
      setErrorMessage('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 駅名検索
  const searchStationAndBusstops = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const { data: stationData, error: sbError } = await supabase
        .from('station_locations')
        .select('lat, lon')
        .ilike('station_name', `%${query.trim()}%`)
        .limit(1);

      if (sbError) throw sbError;

      if (stationData && stationData.length > 0) {
        const { lat, lon } = stationData[0];
        setMapCenter([lat, lon]);
        await fetchTerminalTimetables(lat, lon);
      } else {
        setErrorMessage('該当する駅が見つかりませんでした。');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

    // ★ 初回起動時に初期位置（引数の initialCenter）周辺のバス停を自動取得する
  useEffect(() => {
    const autoRefreshBusstops = async () => {
      try {
        console.log(`🔄 30秒の自動更新を実行中... 座標: ${mapCenter[0]}, ${mapCenter[1]}`);
        await fetchTerminalTimetables(mapCenter[0], mapCenter[1]);
      } catch (error) {
        console.error("初期バス停の取得に失敗しました:", error);
      }
    };
    
    // 1. 座標が切り替わった（または初期起動）瞬間に即座にデータを取得
    autoRefreshBusstops();
    
    // 2. その座標のまま、30秒ごとに定期実行するタイマーを始動
    const interval = setInterval(autoRefreshBusstops, 30000);
    
    // 3. 次の駅に切り替わった時、または画面が閉じた時に古いタイマーを綺麗にクリア
    return () => {
      clearInterval(interval);
    };
  }, [mapCenter]);

  return {
    mapCenter,
    loading,
    errorMessage,
    terminalBoards, // 💡 これをコンポーネントに渡す
    searchStationAndBusstops,
    searchByCoordinates
  };
};