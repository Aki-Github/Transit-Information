import { useState, useEffect } from "react";
import { supabase } from '../../lib/supabaseClient';

interface UseFetchDepartureTimeProps {
  stationId: string | null;
  trainNumber: string | null;
  isOpen: boolean; // モーダルが開いているときだけ動かすためのフラグ
}

export const useFetchDepartureTime = ({ stationId, trainNumber, isOpen }: UseFetchDepartureTimeProps) => {
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // モーダルが閉じている、または必要なデータが揃っていない場合はスキップ
    if (!isOpen || !stationId || !trainNumber) {
      setDepartureTime(null);
      setStationName(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // 🕒 現在の時刻を「HH:MM」形式で取得（例: "22:05"）
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      console.log(`Fetching departure time for stationId: ${stationId}, trainNumber: ${trainNumber}`);
      try {
        // 効率化ポイント: 2つの異なるテーブルへのクエリを Promise.all で並列処理（超高速）
        const [timetableResult, stationResult] = await Promise.all([
          // 1. 時刻表の取得（🟢 修正ポイント：現在時刻以降で最も近い1便に絞り込む）
          supabase
            .from("station_timetables")
            .select("departure_time")
            .eq("station_id", stationId)
            .eq("train_number", trainNumber)
            .gte("departure_time", currentHHMM) // 👈 現在時刻以上の便に絞る（例: 22:05以降）
            .order("departure_time", { ascending: true }) // 👈 時間が早い順（昇順）に並べる
            .limit(1) // 👈 最も現在時刻に近い1件だけを取得
            .maybeSingle(),

          // 2. 駅マスタから駅名（name）の取得
          // 💡 カラム名が 'name_ja' や 'station_name' の場合は適宜書き換えてください
          supabase
            .from("stations") // 👈 あなたのプロジェクトの駅マスタのテーブル名
            .select("name")
            .eq("id", stationId)
            .maybeSingle()
        ]);

        // いずれかでエラーが出ていたらキャッチに飛ばす
        if (timetableResult.error) throw timetableResult.error;
        if (stationResult.error) throw stationResult.error;

        // 時刻表データのリフレッシュ
        console.log("Fetched departure time record:", timetableResult.data);
        if (timetableResult.data) {
          setDepartureTime(timetableResult.data.departure_time);
        } else {
          // 💡 もし深夜で「現在時刻以降の便」がDBにない場合は、全体の最初の便をフォールバックとして検索します
          const fallbackResult = await supabase
            .from("station_timetables")
            .select("departure_time")
            .eq("station_id", stationId)
            .eq("train_number", trainNumber)
            .order("departure_time", { ascending: true })
            .limit(1)
            .maybeSingle();

          setDepartureTime(fallbackResult.data?.departure_time || null);
        }
        
        // 時刻表データのリフレッシュ
        if (timetableResult.data) {
          setDepartureTime(timetableResult.data.departure_time);
        } else {
          setDepartureTime(null);
        }

        // 駅名データのリフレッシュ
        if (stationResult.data) {
          setStationName(stationResult.data.name);
        } else if (stationId === 'odpt.Station:Toei.Oedo.Tochomae') {
          setStationName("都庁前"); // Tochomaeの特例対応
        } else {
          setStationName(null);
        }

      } catch (err: any) {
        console.error("データ（時刻・駅名）の取得に失敗しました:", err);
        setError(err.message);
        setDepartureTime(null);
        setStationName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stationId, trainNumber, isOpen]); // キーや開閉状態が変わったら再取得

  // 戻り値に stationName を追加して、コンポーネント側で使えるようにします
  console.log(`useFetchDepartureTime returns: departureTime=${departureTime}, stationName=${stationName}, loading=${loading}, error=${error}`);
  return { departureTime, stationName, loading, error };
};