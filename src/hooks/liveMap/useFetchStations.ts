import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// 型定義
export interface StationData {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  line_id: string;
}

export const useFetchStations = (lineId: string = 'Asakusa') => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        // stationsテーブルからデータを取得し、sort_orderの昇順（1➔20）で並び替える
        const { data, error: sbError } = await supabase
          .from('stations')
          .select('id, name, code, sort_order, line_id')
          .eq('line_id', lineId) // ⭕ 指定された路線ID（例: 'Asakusa' や 'Shinjuku'）で絞り込み
          .order('sort_order', { ascending: true }); // sort_orderの昇順（1 ➔ 20...）で並び替え

        if (sbError) throw sbError;

        if (data) {
          setStations(data as StationData[]);
        }
      } catch (err: any) {
        console.error('駅データの取得に失敗しました:', err);
        setError(err.message || '駅データのフェッチ中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [lineId]); // lineIdが変更されたときに再度データを取得する

  return { stations, loading, error };
};