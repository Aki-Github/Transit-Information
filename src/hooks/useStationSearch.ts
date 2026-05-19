/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';

// 型定義
interface BusstopData {
  "owl:sameAs": string;
  "dc:title": string;
  "geo:lat": number;
  "geo:long": number;
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

  // ★ 時刻表用の新しいState
  const [selectedTimetable, setSelectedTimetable] = useState<BusstopPoleTimetableData[] | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState<boolean>(false);

  // 駅検索のロジック
  const searchStationAndBusstops = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 1. 駅の検索
      const stationUrl = `https://api.odpt.org/api/v4/odpt:Station?dc:title=${encodeURIComponent(query)}&acl:consumerKey=${API_KEY}`;
      const stationResponse = await fetch(stationUrl);
      const stationData = await stationResponse.json();

      let lat: number | null = null;
      let lon: number | null = null;

      // 駅データが見つかった場合
      if (stationData && stationData.length > 0) {
        // ★ 修正：配列の中から、座標（latとlong）を両方持っている最初の駅データを検索する
        const stationWithCoords = stationData.find(
          (station: any) => station["geo:lat"] !== undefined && station["geo:long"] !== undefined
        );

        // 座標を持つ駅が見つかったら、その座標を採用する
        if (stationWithCoords) {
          lat = stationWithCoords["geo:lat"];
          lon = stationWithCoords["geo:long"];
        }
        // ※ もし stationData はあるのに全社とも座標がなかった場合は、
        // 下記の「else」に流れて自動的に国土地理院の住所検索（ジオコーダ）に切り替わります！
      } 
      // ★ 2. 駅が見つからなかった場合、国土地理院のジオコーダで住所検索を試みる
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

        // 国土地理院APIの座標データは [経度(lon), 緯度(lat)] の順の配列（geometry.coordinates）で返ってきます
        const targetPlace = gsiData[0];
        if (targetPlace.geometry && targetPlace.geometry.coordinates) {
          lon = targetPlace.geometry.coordinates[0];
          lat = targetPlace.geometry.coordinates[1];
        }
      }

      // 駅、または住所から座標が無事取得できたかチェック
      if (!lat || !lon) {
        setErrorMessage('指定された場所の座標データが取得できませんでした。');
        return;
      }

      // 地図の中心を更新
      setMapCenter([lat, lon]);

      // 2. 周辺のバス停を検索
      const RADIUS = 1000;
      const busstopUrl = `https://api.odpt.org/api/v4/places/odpt:BusstopPole?lat=${lat}&lon=${lon}&radius=${RADIUS}&acl:consumerKey=${API_KEY}`;
      const busstopResponse = await fetch(busstopUrl);
      const busstopData: BusstopData[] = await busstopResponse.json();

      setBusstops(busstopData);
      setSelectedTimetable(null); // ★ 新しい駅を検索した時は、前回の時刻表選択をクリア
    } catch (error) {
      console.error("検索エラー:", error);
      setErrorMessage('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // ★ 新しいエンドポイント「odpt:BusstopPoleTimetable」を叩くように修正
  const fetchTimetable = async (busstopId: string) => {
    setLoadingTimetable(true);
    setSelectedTimetable(null);

    try {
      // ユーザーさんが見つけてくれた正しいURL構成
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
        // initialCenter[0] が緯度、initialCenter[1] が経度
        const busstopUrl = `https://api.odpt.org/api/v4/places/odpt:BusstopPole?lat=${initialCenter[0]}&lon=${initialCenter[1]}&radius=1000&acl:consumerKey=${API_KEY}`;
        const res = await fetch(busstopUrl);
        const data = await res.json();
        setBusstops(data);
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