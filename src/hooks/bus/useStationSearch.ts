/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// フロントエンドで扱うバス停の型定義（ODPTのプロパティ名に合わせてマッピングします）
interface BusstopData {
  "owl:sameAs": string;
  "dc:title": string;
  "geo:lat": number;
  "geo:long": number;
  "odpt:operator"?: string;
}

// ★ 型定義を BusstopPoleTimetable 用に新しく定義
interface BusstopPoleTimetableData {
  "owl:sameAs": string;
  "dc:title": string;
  "odpt:busroute"?: string; // 例: "odpt:Busroute:JR-East.Railway:ChuoRapid.Line" など
  "odpt:calendar": string; // 例: "odpt.Calendar:Weekday" (平日), "odpt.Calendar:Saturday" (土曜) など
  "odpt:busstopPoleTimetableObject": {
    "odpt:departureTime": string; // 出発時刻
    "odpt:destinationSign"?: string; // 行先
  }[];
}

interface UseStationSearchResult {
  mapCenter: [number, number];
  busstops: BusstopData[];
  loading: boolean;
  errorMessage: string;
  selectedTimetable: BusstopPoleTimetableData[] | null;
  loadingTimetable: boolean;
  searchStationAndBusstops: (query: string) => Promise<void>;
  fetchTimetable: (busstopId: string, busstopName: string) => Promise<void>;
}

const API_KEY = process.env.REACT_APP_ODPT_KEY;

export const useStationSearch = (initialCenter: [number, number] = [35.6812, 139.7671]): UseStationSearchResult => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [busstops, setBusstops] = useState<BusstopData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedTimetable, setSelectedTimetable] = useState<BusstopPoleTimetableData[] | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState<boolean>(false);

  // 共通ロジック：Supabaseの関数を呼び出してステートにセットする関数
  const fetchNearbyBusstopsFromSupabase = async (latitude: number, longitude: number) => {
    const RADIUS = 1000; // 半径1,000メートル
    
    const { data, error } = await supabase.rpc('search_nearby_busstops', {
      target_lat: latitude,
      target_lon: longitude,
      radius_meters: RADIUS
    });

    if (error) throw error;

    if (data) {
      // 地図描画コンポーネント（既存コード）が壊れないよう、DBのカラム名をODPTのプロパティ名に綺麗に変換
      const formattedBusstops: BusstopData[] = data.map((item: any) => ({
        "owl:sameAs": item.owl_sameas,
        "dc:title": item.title,
        "geo:lat": item.lat,
        "geo:long": item.long,
        "odpt:operator": item.operator
      }));
      setBusstops(formattedBusstops);
    }
  };

  // 駅検索のロジック
  const searchStationAndBusstops = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setErrorMessage('');
    
    try {
      let lat: number | null = null;
      let lon: number | null = null;

      // Supabase から駅を検索
      const { data: stationData, error: sbError } = await supabase
        .from('station_locations')
        .select('lat, lon, station_name')
        .ilike('station_name', `%${query.trim()}%`) // %で囲むことで「〜を含む」というあいまい検索になります
        .not('lat', 'is', null) // 念のため座標が入っているデータに限定
        .limit(1); // 最初の1件を取得

      if (sbError) throw sbError;

      if (stationData && stationData.length > 0) {
        // 駅データが見つかった場合
        lat = stationData[0].lat;
        lon = stationData[0].lon;
        console.log(`駅データヒット: ${stationData[0].station_name} (${lat}, ${lon})`);
      } 
      // 駅が見つからなかった場合、国土地理院のジオコーダで住所検索を試みる
      else {
        // 国土地理院の地名・住所検索API
        const gsiUrl = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`;
        const gsiResponse = await fetch(gsiUrl);
        const gsiData = await gsiResponse.json();

        // 住所でも見つからなかった場合
        if (!gsiData || gsiData.length === 0) {
          setErrorMessage('該当する駅や住所が見つかりませんでした。正しい名称を入力してください。');
          return;
        }

        const targetPlace = gsiData[0];
        if (targetPlace.geometry && targetPlace.geometry.coordinates) {
          lon = targetPlace.geometry.coordinates[0];
          lat = targetPlace.geometry.coordinates[1];
        }
      }

      if (!lat || !lon) {
        setErrorMessage('指定された場所の座標データが取得できませんでした。');
        return;
      }

      // 地図の中心を更新
      setMapCenter([lat, lon]);

      // 2. 周辺のバス停を Supabase の RPC から爆速検索
      await fetchNearbyBusstopsFromSupabase(lat, lon);
      setSelectedTimetable(null); // ★ 新しい駅を検索した時は、前回の時刻表選択をクリア
    } catch (error) {
      console.error("検索エラー:", error);
      setErrorMessage('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 時刻表の取得
  const fetchTimetable = async (busstopId: string) => {
    setLoadingTimetable(true);
    setSelectedTimetable(null);

    try {
      const url = `https://api.odpt.org/api/v4/odpt:BusstopPoleTimetable?odpt:busstopPole=${busstopId}&acl:consumerKey=${API_KEY}`;
      const response = await fetch(url);
      const data: BusstopPoleTimetableData[] = await response.json();
      console.log("取得した時刻表データ:", data);
      
      // 平日・土曜・休日などの配列データをそのまま全て格納する
      setSelectedTimetable(data);
    } catch (error) {
      console.error("時刻表の取得に失敗:", error);
    } finally {
      setLoadingTimetable(false);
    }
  };

  // ★ 初回起動時に初期位置（引数の initialCenter）周辺のバス停を自動取得する
  useEffect(() => {
    const fetchInitialBusstops = async () => {
      try {
        await fetchNearbyBusstopsFromSupabase(initialCenter[0], initialCenter[1]);
      } catch (error) {
        console.error("初期バス停の取得に失敗しました:", error);
      }
    };
    
    fetchInitialBusstops();
  }, []); // 初期表示のときは一度だけ実行

// ★ 返却するオブジェクトに時刻表関連を追加
  return {
    mapCenter,
    busstops,
    loading,
    errorMessage,
    selectedTimetable,
    loadingTimetable,
    searchStationAndBusstops,
    fetchTimetable
  };
};