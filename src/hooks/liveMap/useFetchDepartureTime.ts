import { useState, useEffect } from "react";
import { supabase } from '../../lib/supabaseClient';

interface UseFetchDepartureTimeProps {
  stationId: string | null;
  trainNumber: string | null;
  isOpen: boolean; // モーダルが開いているときだけ動かすためのフラグ
}

export const useFetchDepartureTime = ({ stationId, trainNumber, isOpen }: UseFetchDepartureTimeProps) => {
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  // ⭕ 駅名を格納する新しいステートを追加
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
      console.log(`Fetching departure time for stationId: ${stationId}, trainNumber: ${trainNumber}`);
      try {
        // 効率化ポイント: 2つの異なるテーブルへのクエリを Promise.all で並列処理（超高速）
        const [timetableResult, stationResult] = await Promise.all([
          // 1. 時刻表の取得
          supabase
            .from("station_timetables")
            .select("departure_time")
            .eq("station_id", stationId)
            .eq("train_number", trainNumber)
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
        console.log("Fetched departure time:", timetableResult.data);
        if (timetableResult.data) {
          setDepartureTime(timetableResult.data.departure_time);
        } else {
          setDepartureTime(null);
        }

        // 駅名データのリフレッシュ
        console.log("Fetched station name:", stationResult.data);
        if (stationResult.data) {
          setStationName(stationResult.data.name);
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
  return { departureTime, stationName, loading, error };
};