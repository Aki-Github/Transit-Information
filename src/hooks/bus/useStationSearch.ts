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
  destination: string;
  searchStationAndBusstops: (query: string) => Promise<void>;
  searchByCoordinates: (lat: number, lon: number) => Promise<void>; // ← 追加
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
  const [destination, setDestination] = useState<string>('');

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

  // 💡 追加：指定された緯度・経度から直接周辺を検索するロジック
  // 「現在地で検索」ボタンが押された時に、地図コンポーネントから直接この関数が呼び出されます
  const searchByCoordinates = async (lat: number, lon: number) => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      // 1. 新しい中心点を設定（ChangeViewを通じて地図の表示も追従します）
      setMapCenter([lat, lon]);

      // 2. その中心点の周辺バス停を検索
      await fetchNearbyBusstopsFromSupabase(lat, lon);

      // 3. 検索範囲が変わるため、以前に開いていた時刻表の選択状態をクリア
      setSelectedTimetable(null); 
    } catch (error) {
      console.error("座標での周辺再検索エラー:", error);
      setErrorMessage('指定エリアの周辺データ取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
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

  // 🟢 西武バス・京王バス両対応：時刻表の取得
  const fetchTimetable = async (busstopId: string, busstopName: string) => {
    setLoadingTimetable(true);
    setSelectedTimetable(null);

    try {
      let data: BusstopPoleTimetableData[] = [];

      // 💡 条件分岐：都営バス（odpt.BusstopPole:Toei...）かどうかを判定
      const isToeiBus = busstopId.startsWith("odpt.BusstopPole:Toei");
      const isTokyuBus = busstopId.startsWith("odpt.BusstopPole:Tokyu");

      if (isToeiBus || isTokyuBus) {
        // 🚌 【都営バスの場合】 ODPTのWeb APIへ時刻表をリクエスト
        console.log(`ODPT Web APIから取得します: ${busstopId}`);
        const url = `https://api.odpt.org/api/v4/odpt:BusstopPoleTimetable?odpt:busstopPole=${busstopId}&acl:consumerKey=${API_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
          data = await response.json();
        }

        setDestination(""); // 都営バスの場合は行先情報が複雑すぎるため、UIでの表示は一旦保留（APIのデータ構造を見てから再検討）
      }

      // 🚌 【都営バス以外（西武・京王など）、またはAPI取得が空だった場合】
      // data.length === 0 の判定を残すことで、万が一都営バスのAPIが空だった場合のバックアップにもなります
      if (!data || data.length === 0) {
        console.log(`[補完作動] Supabaseからデータを取得・整形します: ${busstopId}`);
        
        const { data: sbObjects, error: sbError } = await supabase
          .from('bus_timetable_objects')
          .select(`
            departure_time,
            bus_timetables (
              calendar,
              busroute,
              title,
              destination
            )
          `)
          .eq('busstop_pole_owl_sameas', busstopId)
          .order('departure_time', { ascending: true });

        if (sbError) throw sbError;

        if (sbObjects && sbObjects.length > 0) {
          // カレンダー（標準形式）ごとに仕分けるための一時領域
          const groupedByCalendar: { [key: string]: { route: string; title: string; objects: any[] } } = {};

          let title = "";
          let destination = "";
          sbObjects.forEach((item: any) => {
            const parent = item.bus_timetables;
            if (!parent) return;

            const rawCalendar = parent.calendar || "";
            let calName = "odpt.Calendar:Weekday"; // デフォルト値

            // 💡 西武バスなどの独自カレンダー文字列を ODPT 標準形式に正規化する
            if (rawCalendar.includes("Weekday")) {
              calName = "odpt.Calendar:Weekday";
            } else if (rawCalendar.includes("Saturday")) {
              calName = "odpt.Calendar:Saturday";
            } else if (rawCalendar.includes("Sunday") || rawCalendar.includes("Holiday")) {
              calName = "odpt.Calendar:Holiday";
            } else if (rawCalendar.includes("平日")) {
              calName = "odpt.Calendar:Weekday";
            } else if (rawCalendar.includes("土曜")) {
              calName = "odpt.Calendar:Saturday";
            } else if (
              rawCalendar.includes("休日") || 
              rawCalendar.includes("日祝") || 
              rawCalendar.includes("日曜") || 
              rawCalendar.includes("祝日")
            ) {
              calName = "odpt.Calendar:Holiday";
            } else if (rawCalendar.includes(":")) {
              // すでにコロンが含まれる正規の形式ならそのまま採用
              calName = rawCalendar;
            } else {
              // それ以外は末尾の文字を活かす形で復元を試みる
              calName = `odpt.Calendar:${rawCalendar.split(".").pop()}`;
            }

            const routeId = parent.busroute || "";
            const busTitle = parent.title || ""; // 「荻１２」などの系統・行先表記
            if (title === "") {
              title = busTitle; // 最初の1件のタイトルを全体のタイトルとして採用しておく
            }
            const busDestination = parent.destination || ""; // 追加で行先も取得しておく（例: "渋谷駅行き"）
            if (destination === "") {
              destination = busDestination;
            }

            if (!groupedByCalendar[calName]) {
              groupedByCalendar[calName] = {
                route: routeId,
                title: busTitle,
                objects: []
              };
            }

            // 時刻データを追加
            groupedByCalendar[calName].objects.push({
              "odpt:departureTime": item.departure_time ? item.departure_time.substring(0, 5) : "00:00", // "21:58:00" -> "21:58"
              "odpt:destinationSign": busTitle || undefined // 行先表示板の代わりに系統タイトルを代入してUIを親切に
            });
          });

          setDestination(destination); // 取得した行先情報をステートにセット

          // フロントエンドが期待する ODPT 互換配列へとマッピング
          data = Object.keys(groupedByCalendar).map((calKey) => ({
            "owl:sameAs": `${busstopId}#${calKey}`,
            "dc:title": `${title}.${busstopName}`, // タイトルにバス停名も入れておくとUIでの識別が楽になります
            "odpt:busroute": groupedByCalendar[calKey].route || undefined,
            "odpt:calendar": calKey,
            "odpt:busstopPoleTimetableObject": groupedByCalendar[calKey].objects
          }));
        }
      }

      console.log("最終確定の時刻表データ:", data);
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
    destination,
    searchStationAndBusstops,
    searchByCoordinates, // 💡 追加：地図コンポーネントが利用できるように返却値に含める
    fetchTimetable
  };
};