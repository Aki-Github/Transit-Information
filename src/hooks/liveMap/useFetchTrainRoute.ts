import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient"; // プロジェクトのクライアントパス

interface UseFetchTrainRouteProps {
  currentStationId: string | null; // 今いる（または直前に出た）駅ID
  trainNumber: string | null;      // 列車番号 (例: "1630T")
  isOpen: boolean;                 // モーダルの開閉状態
}

interface RouteStationInfo {
  stationId: string;
  departureTime: string;
}

export const useFetchTrainRoute = ({ currentStationId, trainNumber, isOpen }: UseFetchTrainRouteProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 🎯 計算結果を格納するステート
  const [currentStation, setCurrentStation] = useState<RouteStationInfo | null>(null);
  const [nextStation, setNextStation] = useState<RouteStationInfo | null>(null);
  const [nextNextStation, setNextNextStation] = useState<RouteStationInfo | null>(null);
  const [threeNextStation, setThreeNextStation] = useState<RouteStationInfo | null>(null);
  const [terminalStation, setTerminalStation] = useState<RouteStationInfo | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteStationInfo[]>([]);

  useEffect(() => {
    // モーダルが閉じている、または必要なデータがない場合はリセットして終了
    if (!isOpen || !currentStationId || !trainNumber) {
      setCurrentStation(null);
      setNextStation(null);
      setNextNextStation(null);
      setThreeNextStation(null);
      setTerminalStation(null);
      setFullRoute([]);
      return;
    }

    const fetchRouteData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 💡 1. currentStationId から前方一致用のベース文字列を抽出
        const lastDotIndex = currentStationId.lastIndexOf(".");
        const stationBasePrefix = lastDotIndex !== -1 
          ? currentStationId.substring(0, lastDotIndex) 
          : currentStationId;
        
        // 🕒 現在の時刻を取得
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes(); // 比較用に「今日始まってからの総分数」に変換

        // 💡 2. 列車番号 ＋ 【同じ路線のみ】に絞って時刻表を取得
        // ここに .like("station_id", `${stationBasePrefix}.%`) を追加することで、他路線の重複列車を完全に弾きます！
        const { data, error: sbError } = await supabase
          .from("station_timetables")
          .select("station_id, departure_time")
          .eq("train_number", trainNumber)
          .like("station_id", `${stationBasePrefix}.%`) // 👈 🟢 ここが今回の超重要追加ポイント！
          .order("departure_time", { ascending: true });

        if (sbError) throw sbError;

        console.log("Fetched route data:", data);

        if (!data || data.length === 0) {
          setCurrentStation(null);
          setNextStation(null);
          setNextNextStation(null);
          setThreeNextStation(null);
          setTerminalStation(null);
          setFullRoute([]);
          return;
        }

        // キャメルケースにマッピング
        const formattedRoute: RouteStationInfo[] = data.map((item) => ({
          stationId: item.station_id,
          departureTime: item.departure_time,
        }));

        setFullRoute(formattedRoute);

        // 💡 3. 【今回の超重要修正】currentStationId (完全一致) を使い、現在時刻に一番近いインデックスを計算する
        let currentIndex = -1;
        let minDiff = Infinity;

        formattedRoute.forEach((route, idx) => {
          // 駅IDが完全に一致するものだけを対象にする（前方一致ではなく完全一致にすることで、別の駅へのズレを防ぐ）
          if (route.stationId === currentStationId) {
            // 時刻文字列 "22:31:00" や "22:31" から「総分数」を計算
            const [hh, mm] = route.departureTime.split(":").map(Number);
            const routeMinutes = hh * 60 + mm;
            
            // 現在時刻との「時間差の絶対値」を計算
            const diff = Math.abs(routeMinutes - currentMinutes);
            
            // 最も現在時刻に近いレコードのインデックスを採用する
            if (diff < minDiff) {
              minDiff = diff;
              currentIndex = idx;
            }
          }
        });

        // 💡 フォールバック: 万が一完全一致で見つからなかった場合の安全弁（前方一致で検索）
        if (currentIndex === -1) {
          currentIndex = formattedRoute.findIndex(
            (r) => r.stationId.startsWith(stationBasePrefix)
          );
        }

        console.log(`[確定インデックス] currentIndex: ${currentIndex} (駅ID: ${currentStationId}, 時間差: ${minDiff}分)`);

        if (currentIndex === -1) {
          // 万が一現在の駅が時刻表リストにない場合（他社線直通など）は安全のためリセット
          setCurrentStation(null);
          setNextStation(null);
          setNextNextStation(null);
          setThreeNextStation(null);
          setTerminalStation(null);
          return;
        }

        // 4. インデックスを基準に後続の駅を計算（既存ロジックをそのまま活用）
        if (currentIndex  < formattedRoute.length) {
            setCurrentStation(formattedRoute[currentIndex]); // 現在地の駅（1つ前の駅が現在地）
        } else {
          // 現在地がすでに終点の場合は当駅だけセットして他はnull
          setCurrentStation(null);  
        }
        
        // 次の駅 (現在地 + 1)
        if (currentIndex + 1 < formattedRoute.length) {
          setNextStation(formattedRoute[currentIndex + 1]);
        } else {
          setNextStation(null); // すでに終点にいる場合
        }

        // その次の駅 (現在地 + 2)
        if (currentIndex + 2 < formattedRoute.length) {
          setNextNextStation(formattedRoute[currentIndex + 2]);
        } else {
          setNextNextStation(null); // 次が終点、または既に終点の場合
        }

        // その次の次の駅 (現在地 + 3)
        if (currentIndex + 3 < formattedRoute.length) {
          setThreeNextStation(formattedRoute[currentIndex + 3]);
        } else {
          setThreeNextStation(null); // 次が終点、または既に終点の場合
        }

        // 目的地の駅（配列の最後の要素）
        const lastStation = formattedRoute[formattedRoute.length - 1];
        // 現在地がすでに終点でない場合のみ目的地としてセット
        if (currentIndex < formattedRoute.length - 1) {
          setTerminalStation(lastStation);
        } else {
          setTerminalStation(null);
        }

      } catch (err: any) {
        console.error("運行ルートの計算に失敗しました:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [currentStationId, trainNumber, isOpen]);

  return { currentStation, nextStation, nextNextStation, threeNextStation, terminalStation, fullRoute, loading, error };
};