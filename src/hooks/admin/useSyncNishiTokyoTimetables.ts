import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import JSZip from "jszip";
import Papa from "papaparse";

// GTFS各ファイルの型定義
interface GtfsRoute { route_id: string; route_short_name: string; }
interface GtfsTrip { route_id: string; service_id: string; trip_id: string; jp_pattern_id?: string; }
interface GtfsStopTime { trip_id: string; departure_time: string; stop_id: string; stop_headsign: string; stop_sequence: string; }

export const useSyncNishiTokyoTimetables = () => {
  const [loading, setLoading] = useState(false);

  const syncTimetables = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    setLoading(true);
    try {
      // 1. 公共交通オープンデータ等から西東京バスのGTFS ZIPを取得 (またはローカルpublicから)
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      const gtfsUrl = `https://api.odpt.org/api/v4/files/odpt/NishiTokyoBus/NTBus.zip?date=20260622&acl:consumerKey=${consumerKey}`;
      const response = await fetch(gtfsUrl);
      if (!response.ok) throw new Error("GTFSファイルの取得に失敗しました。");
      const arrayBuffer = await response.arrayBuffer();

      // 2. ZIPを解凍して必要な3つのCSVをテキストとして抽出
      const zip = await JSZip.loadAsync(arrayBuffer);
      const routesFile = zip.file("routes.txt");
      const tripsFile = zip.file("trips.txt");
      const stopTimesFile = zip.file("stop_times.txt");

      if (!routesFile || !tripsFile || !stopTimesFile) {
        throw new Error("必要なGTFSファイル(routes, trips, stop_times)が不足しています。");
      }

      const [routesTxt, tripsTxt, stopTimesTxt] = await Promise.all([
        routesFile.async("string"),
        tripsFile.async("string"),
        stopTimesFile.async("string")
      ]);

      // 3. PapaParseでCSVをパース
      const routes = Papa.parse<GtfsRoute>(routesTxt, { header: true, skipEmptyLines: true }).data;
      const trips = Papa.parse<GtfsTrip>(tripsTxt, { header: true, skipEmptyLines: true }).data;
      const stopTimes = Papa.parse<GtfsStopTime>(stopTimesTxt, { header: true, skipEmptyLines: true }).data;

      // 4. 高速化のために routes と trips を Map(連想配列) 化して検索効率を上げる
      const routesMap = new Map<string, string>(); // route_id -> route_short_name
      routes.forEach(r => routesMap.set(r.route_id, r.route_short_name));

      const tripsMap = new Map<string, { routeId: string; serviceId: string; patternId: string }>(); // trip_id -> 情報
      trips.forEach(t => tripsMap.set(t.trip_id, {
        routeId: t.route_id,
        serviceId: t.service_id,
        patternId: t.jp_pattern_id || ""
      }));

      // 💡 【新規追加】trip_id ごとに「最終目的地の停留所名(終点)」をあらかじめ調べておくMap
      // stop_times.txt の中で、各 trip_id ごとに最大の stop_sequence（最後尾）の stop_headsign もしくは stop_name を行き先として使うため
      const tripDestinationMap = new Map<string, { lastSign: string }>();

      // stop_times を一度走査して、trip_id ごとの「一番最後の行(最大シーケンス)」の情報を保存
      stopTimes.forEach(st => {
        const seq = parseInt(st.stop_sequence);
        const currentSaved = tripDestinationMap.get(st.trip_id);

        // 初めての trip_id か、または現在の行の stop_sequence の方が大きい(より後ろの停留所)の場合に更新
        if (!currentSaved || seq > (currentSaved as any).seq) {
          tripDestinationMap.set(st.trip_id, {
            seq: seq,
            lastSign: st.stop_headsign || ""
          } as any);
        }
      });

      // 5. Supabaseのテーブル構造に合わせてマッピングデータを生成
      // 💡 テーブル A: bus_timetables (親: 運行情報のまとまり)
      // 💡 テーブル B: bus_timetable_objects (子: 各出発時刻の秒数などの配列)
      const timetablesMap = new Map<string, any>(); // 固有の時刻表IDをキーにする
      const timetableObjects: any[] = [];

      for (const st of stopTimes) {
        const tripInfo = tripsMap.get(st.trip_id);
        if (!tripInfo) continue;

        const routeShortName = routesMap.get(tripInfo.routeId) || "不明";

        // 💡 【ポイント】stop_headsign の取得と「無し（空文字）」の場合の補完処理
        let targetHeadsign = st.stop_headsign?.trim();

        if (!targetHeadsign) {
          // 1. もしこの行の headsign が空なら、同じ運航(trip)の最終目的地データ(Mapから)を覗きに行く
          const destInfo = tripDestinationMap.get(st.trip_id);
          // 2. 最終目的地の行に headsign があればそれを使い、それも無ければ最終目的地の「バス停名」そのものを終点(行き先)とする
          targetHeadsign = destInfo?.lastSign || "終点";
        }

        // 西東京バス用の識別IDを組み立てる (事業者:バス停ID:運行パターン:カレンダー区分)
        const timetableId = `nishitokyo:Timetable:${st.trip_id}:${tripInfo.serviceId}`;

        let type: "weekday" | "saturday" | "holiday" = "weekday";

        // 末尾のアンダースコア以降の数字を正規表現で抽出
        const match = tripInfo.serviceId.match(/_(\d+)$/);
        const calendarNum = match ? match[1] : "";

        switch (calendarNum) {
        case "2":
            type = "saturday";
            break;
        case "3":
            type = "holiday";
            break;
        case "1":
        default:
            type = "weekday";
            break;
        }
        
        // 親テーブル用のデータがまだなければ登録
        if (!timetablesMap.has(timetableId)) {
          timetablesMap.set(timetableId, {
            // かつて定義したbus_timetablesのスキーマにマッピング
            owl_sameas: timetableId,
            operator: "odpt.Operator:NishiTokyoBus",
            busroute: `nishitokyo:Busroute:${tripInfo.routeId}`,
            busroute_pattern: `nishitokyo:BusroutePattern:${st.trip_id}`,
            calendar: type,
            title: routeShortName, // 系統名をタイトルにする（例: "渋谷駅行き"）
            destination: targetHeadsign // 追加で行き先も格納
          });
        }

        // 時間表記(HH:MM:SS)を、始発からの経過秒数(または適切な数値型)に変換
        const [h, m, s] = st.departure_time.split(":").map(Number);
        const secondsFromStart = (h * 3600) + (m * 60) + (s || 0);

        // 子テーブル用のデータを配列に追加
        timetableObjects.push({
          timetable_owl_sameas: timetableId,
          busstop_pole_owl_sameas: `nishitokyo:BusstopPole:${st.stop_id}`,
          index_order: parseInt(st.stop_sequence),
          departure_time: st.departure_time.substring(0, 5), // "07:30" 形式にする場合
          seconds_from_start: secondsFromStart
        });
      }

      // 6. SupabaseへのUPSERT実行 (親テーブル)
      const parentRows = Array.from(timetablesMap.values());
      const chunkSize = 500; // データ量が多いため、少し小さめのチャンクで安全に送る

      for (let i = 0; i < parentRows.length; i += chunkSize) {
        const { error } = await supabase
          .from("bus_timetables")
          .upsert(parentRows.slice(i, i + chunkSize), { onConflict: "owl_sameas" });
        if (error) throw error;
      }

      // 7. SupabaseへのUPSERT実行 (子テーブル)
      for (let i = 0; i < timetableObjects.length; i += chunkSize) {
        const { error } = await supabase
          .from("bus_timetable_objects")
          .upsert(timetableObjects.slice(i, i + chunkSize), { onConflict: "timetable_owl_sameas,index_order" });
        if (error) throw error;
      }

      return { success: true, count: timetableObjects.length };

    } catch (err: any) {
      console.error("Timetables Sync Error:", err);
      return { success: false, error: err.message || "同期中にエラーが発生しました。" };
    } finally {
      setLoading(false);
    }
  };

  return { syncTimetables, loading };
};