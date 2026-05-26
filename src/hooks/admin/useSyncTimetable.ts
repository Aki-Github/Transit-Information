import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// odptから返ってくる生データの型定義（主要な部分のみ）
interface OdptStationTimetable {
  "odpt:station": string;
  "odpt:stationTimetableObject": {
    "odpt:trainNumber": string;
    "odpt:departureTime": string;
    "odpt:arrivalTime": string;
    "odpt:destinationStation"?: string[];
  }[];
}

export const useSyncTimetable = () => {
  const [loading, setLoading] = useState(false);

  const syncTimetable = async (lineId: string = 'Asakusa'): Promise<{ success: boolean; count?: number; error?: string }> => {
    setLoading(true);
    try {
      // 💡 1. odpt API から都営地下鉄の全駅時刻表データを取得
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      const railwayId = `odpt.Railway:Toei.${lineId}`; // 例: odpt.Railway:Toei.Asakusa
      const url = `https://api.odpt.org/api/v4/odpt:StationTimetable?odpt:railway=${railwayId}&acl:consumerKey=${consumerKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("odpt APIからのデータ取得に失敗しました。");
      
      const rawData: OdptStationTimetable[] = await response.json();

      if (!rawData || rawData.length === 0) {
        throw new Error("該当する時刻表データが見つかりませんでした。");
      }

      // 💡 2. 大量のデータを Supabase のテーブル構造に合わせて綺麗にマッピング・整形
      const insertRows: {
        station_id: string;
        train_number: string;
        departure_time: string | null;
        destination_station: string | null;
        arrival_time: string | null;
      }[] = [];

      // 重複登録を防ぐための簡易一時キャッシュマップ（同一駅で同じ列車番号があればスキップ、または上書き）
      const seenKeys = new Set<string>();

      for (const timetable of rawData) {
        const stationId = timetable["odpt:station"];
        const objects = timetable["odpt:stationTimetableObject"] || [];

        for (const obj of objects) {
          const trainNumber = obj["odpt:trainNumber"];
          const departureTime = obj["odpt:departureTime"] || null;
          const destinationStation = obj["odpt:destinationStation"]?.[0] || null;
          const arrivalTime = obj["odpt:arrivalTime"] || null;

          if (!stationId || !trainNumber) continue;

          // ユニークキー（駅ID + 列車番号）を作成
          const uniqueKey = `${stationId}_${trainNumber}`;
          
          // 平日ダイヤと土休日ダイヤで同じ列車番号が同じ駅を通るケースがあるため、重複を排除
          if (seenKeys.has(uniqueKey)) continue;
          seenKeys.add(uniqueKey);

          insertRows.push({
            station_id: stationId,
            train_number: trainNumber,
            departure_time: departureTime,
            destination_station: destinationStation,
            arrival_time: arrivalTime,
          });
        }
      }

      // 💡 3. 整形したデータを Supabase へ一括 UPSERT (最大数百〜数千件をまとめて処理)
      // chunk（分割）せずに一発で送るために chunk 処理は省いていますが、数千件規模ならupsertで一気に処理可能です。
      if (insertRows.length === 0) {
        throw new Error("書き込み対象の有効な時刻表データがありませんでした。");
      }

      const { error: sbError } = await supabase
        .from("station_timetables")
        .upsert(insertRows, { onConflict: "station_id,train_number" }); // 既存データがあれば更新

      if (sbError) throw sbError;

      return { success: true, count: insertRows.length };

    } catch (err: any) {
      console.error("Sync Error:", err);
      return { success: false, error: err.message || "予期せぬエラーが発生しました。" };
    } finally {
      setLoading(false);
    }
  };

  return { syncTimetable, loading };
};