/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// BusRouteMap や KeioBusMonitor が期待するフロントエンド用のバス停型定義
interface BusstopData {
  "owl:sameAs": string;
  "dc:title": string;
  "geo:lat": number;
  "geo:long": number;
  "odpt:operator"?: string;
  // KeioBusMonitor側で .id 参照や .latitude/.longitude 参照があっても安全なようにフォールバック用として追加
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
}

interface UseKeioBusstopsResult {
  busstops: BusstopData[];
  loadingBusstops: boolean;
  errorMessage: string;
}

export const useKeioBusstops = (): UseKeioBusstopsResult => {
  const [busstops, setBusstops] = useState<BusstopData[]>([]);
  const [loadingBusstops, setLoadingBusstops] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchKeioBusstops = async () => {
    setLoadingBusstops(true);
    setErrorMessage('');

    try {
      // 💡 ポイント: 京王バス（GTFS経由等）のバス停を判別するIDプレフィックスを指定して一括取得
      // テーブル名やカラム名は既存のプロジェクト構造に合わせて適宜調整してください
      const { data, error } = await supabase
        .from('busstop_poles') // または 'bus_busstop_poles' などお使いのテーブル名
        .select('owl_sameas, title, lat, long, operator')
        .eq('operator', 'odpt.Operator:KeioBus') // 京王バスのIDプレフィックスで絞り込み
        .not('lat', 'is', null) // 念のため位置情報があるものに限定
        .limit(1000); // 描画パフォーマンスを考慮して適宜上限（またはエリア絞り込み）を調整

      if (error) throw error;

      if (data) {
        // `useStationSearch` と同様に、ODPT互換のオブジェクト構造へ綺麗にマッピングします
        const formattedBusstops: BusstopData[] = data.map((item: any) => ({
          "owl:sameAs": item.owl_sameas,
          "dc:title": item.title,
          "geo:lat": Number(item.lat),
          "geo:long": Number(item.long),
          "odpt:operator": item.operator || "odpt.Operator:KeioBus",
          
          // 💡 フローティングUIや別ロジックで直接プロパティ（id, name, lat, long）を触られても
          // クラッシュしないようにエイリアス（複製）を持たせておくことで安全性を高めます
          id: item.owl_sameas,
          name: item.title,
          latitude: Number(item.lat),
          longitude: Number(item.long)
        }));

        setBusstops(formattedBusstops);
      }
    } catch (error) {
      console.error("京王バス停の取得に失敗しました:", error);
      setErrorMessage('バス停データのロード中にエラーが発生しました。');
    } finally {
      setLoadingBusstops(false);
    }
  };

  // 💡 コンポーネントがマウントされた時に自動で1回だけ京王バスのバス停を取りに行く
  useEffect(() => {
    fetchKeioBusstops();
  }, []);

  return {
    busstops,
    loadingBusstops,
    errorMessage
  };
};