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
        
        // 🕒 現在の時刻を「HH:MM」形式で取得（例: "22:05"）
        const now = new Date();
        const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 💡 2. 列車番号 ＋ 【同じ路線のみ】に絞って時刻表を取得
        // ここに .like("station_id", `${stationBasePrefix}.%`) を追加することで、他路線の重複列車を完全に弾きます！
        const { data, error: sbError } = await supabase
          .from("station_timetables")
          .select("station_id, departure_time")
          .eq("train_number", trainNumber)
          .like("station_id", `${stationBasePrefix}.%`) // 👈 🟢 ここが今回の超重要追加ポイント！
          .order("departure_time", { ascending: true });

        if (sbError) throw sbError;

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

        // 💡 3. 【超重要修正】「現在時刻以降」で、かつ「指定された駅」に一致するレコードを検索する
        // 朝・昼・夜と何度も同じ駅を通るデータから、"今走っている時間帯の駅" を正しくピンポイントで探します
        let currentIndex = formattedRoute.findIndex(
          (r) => r.stationId.startsWith(stationBasePrefix) && r.departureTime >= currentHHMM         
        );

        // 💡 フォールバック: 深夜などで現在時刻以降のデータがマッチしない場合は、従来通り最初のマッチを使う
        if (currentIndex === -1) {
          currentIndex = formattedRoute.findIndex(
            (r) => r.stationId.startsWith(stationBasePrefix)
          );
        }

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