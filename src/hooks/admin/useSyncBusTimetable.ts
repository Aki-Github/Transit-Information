import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface OdptTimetableObject {
  "odpt:busstopPole": string;
  "odpt:departureTime"?: string;
  "odpt:secondsFromStart"?: number;
}

interface OdptBusTimetable {
  "@id": string;
  "owl:sameAs": string;
  "odpt:operator": string;
  "odpt:busroute": string;
  "odpt:busroutePattern"?: string;
  "odpt:calendar": string;
  "dc:title"?: string;
  "odpt:busTimetableObject": OdptTimetableObject[];
}

export const useSyncBusTimetable = () => {
  const [loading, setLoading] = useState(false);

  /**
   * @param busrouteIds 同期したい系統IDの配列 
   * (例: ["odpt.Busroute:Toei.To01", "odpt.Busroute:Toei.To02", ...])
   */
  const syncTimetableByRoutes = async (
    busrouteIds: string[]
  ): Promise<{ success: boolean; processedRoutes: number; error?: string }> => {
    if (!busrouteIds || busrouteIds.length === 0) {
      return { success: false, processedRoutes: 0, error: "系統IDが指定されていません。" };
    }

    setLoading(true);
    let totalHeadersCount = 0;
    let totalObjectsCount = 0;

    try {
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      console.log(`計 ${busrouteIds.length} 件の系統の時刻表同期を開始します...`);

      // 💡 系統ごとにAPIを叩くループ処理
      for (let i = 0; i < busrouteIds.length; i++) {
        const routeId = busrouteIds[i];
        console.log(`[${i + 1}/${busrouteIds.length}] 系統: ${routeId} を取得中...`);

        // 💡 系統（odpt:busroute）で絞り込む（これなら1000件の上限にかかりません）
        const url = `https://api.odpt.org/api/v4/odpt:BusTimetable?odpt:busroutePattern=${routeId}&acl:consumerKey=${consumerKey}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`系統 ${routeId} のデータ取得に失敗したためスキップします。`);
          continue;
        }

        const rawData: OdptBusTimetable[] = await response.json();
        if (!rawData || rawData.length === 0) continue;

        // 💡 この系統のデータをマッピング
        const insertHeaders: any[] = [];
        const insertObjects: any[] = [];

        rawData.forEach((timetable) => {
          // 🟢 ここから追加：カレンダーの柔軟な曜日判定ロジック
          const fullTitle = timetable["dc:title"] || "";
          const cal = timetable["odpt:calendar"] || "";

          let type: "weekday" | "saturday" | "holiday" = "weekday";

          const lowerCal = cal.toLowerCase();
          const lowerTitle = fullTitle.toLowerCase();

          // 1. 最も正確な odpt:calendar の文字列パターンで判定（都営バスのMondayToFriday等にも対応）
          if (lowerCal.endsWith("saturday")) {
            type = "saturday";
          } else if (
            lowerCal.endsWith("sunday") || 
            lowerCal.endsWith("holiday") || 
            lowerCal.endsWith("substituteholiday")
          ) {
            type = "holiday";
          } else if (
            lowerCal.endsWith("weekday") || 
            lowerCal.endsWith("mondaytofriday")
          ) {
            type = "weekday";
          } 
          // 2. 万が一判定漏れがあった場合のフォールバック（日本語文字列検索）
          else if (lowerTitle.includes("土曜")) {
            type = "saturday";
          } else if (
            lowerTitle.includes("休日") || 
            lowerTitle.includes("日祝") || 
            lowerTitle.includes("日曜") || 
            lowerTitle.includes("祝日")
          ) {
            type = "holiday";
          } else {
            type = "weekday";
          }

          insertHeaders.push({
            owl_sameas: timetable["owl:sameAs"],
            operator: timetable["odpt:operator"],
            busroute: timetable["odpt:busroute"],
            busroute_pattern: timetable["odpt:busroutePattern"] || null,
            // 💡 判定した標準の種別（weekday / saturday / holiday）をそのまま格納！
            calendar: type,
            title: timetable["dc:title"] || null,
          });

          const objects = timetable["odpt:busTimetableObject"] || [];
          objects.forEach((obj, index) => {
            insertObjects.push({
              timetable_owl_sameas: timetable["owl:sameAs"],
              busstop_pole_owl_sameas: obj["odpt:busstopPole"],
              index_order: index,
              departure_time: obj["odpt:departureTime"] || null,
              seconds_from_start: obj["odpt:secondsFromStart"] !== undefined ? obj["odpt:secondsFromStart"] : null,
            });
          });
        });

        // 💡 1系統取得するごとに、都度Supabaseへ即時UPSERT（メモリ負荷を最小限に）
        if (insertHeaders.length > 0) {
          const { error: sbHeaderError } = await supabase
            .from("bus_timetables")
            .upsert(insertHeaders, { onConflict: "owl_sameas" });
          if (sbHeaderError) throw sbHeaderError;
          totalHeadersCount += insertHeaders.length;
        }

        if (insertObjects.length > 0) {
          // 子レコードは量が多い場合があるため2000件ずつに丸める
          const objectChunkSize = 2000;
          for (let k = 0; k < insertObjects.length; k += objectChunkSize) {
            const chunk = insertObjects.slice(k, k + objectChunkSize);
            const { error: sbObjectError } = await supabase
              .from("bus_timetable_objects")
              .upsert(chunk, { onConflict: "timetable_owl_sameas,index_order" });
            if (sbObjectError) throw sbObjectError;
            totalObjectsCount += chunk.length;
          }
        }

        // APIのレートリミット（負荷）対策として、1回ごとに20msほど少しだけ待機
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      console.log(`同期完了: 親テーブル ${totalHeadersCount}件, 子テーブル ${totalObjectsCount}件 を反映しました。`);
      return { success: true, processedRoutes: busrouteIds.length };

    } catch (err: any) {
      console.error("時刻表同期中にエラーが発生しました:", err);
      return { success: false, processedRoutes: 0, error: err.message || "同期エラー" };
    } finally {
      setLoading(false);
    }
  };

  return { syncTimetableByRoutes, loading };
};