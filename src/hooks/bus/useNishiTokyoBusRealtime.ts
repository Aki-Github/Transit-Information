import { useState, useEffect } from "react";
import { transit_realtime } from "gtfs-realtime-bindings";

// 取得したい車両位置情報の型定義
export interface NishiTokyoBusVehicle {
  id: string;              // 車両の一意のID
  tripId: string | null;   // 運行便のID（静的GTFSのtripsテーブルと紐付け可能）
  routeId: string | null;  // 系統のID
  latitude: number;        // リアルタイムの緯度
  longitude: number;       // リアルタイムの経度
  currentStatus: string | null; // 停留所に対する状態 (例: "IN_TRANSIT_TO", "STOPPED_AT")
  stopId: string | null;   // 今向かっている（または停車中の）バス停ID
}

export const useNishiTokyoBusRealtime = (isActive: boolean = true) => {
  const [vehicles, setVehicles] = useState<NishiTokyoBusVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const fetchNishiTokyoBusData = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_KEY = process.env.REACT_APP_ODPT_KEY || "YOUR_CONSUMER_KEY"; 
        
        // 💡 vite.config.ts で設定したプロキシパスを経由してリクエストします
        const proxyUrl = `https://api.odpt.org/api/v4/gtfs/realtime/odpt_NishiTokyoBus_NTBus_vehicle?acl:consumerKey=${API_KEY}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

        // 🚨 重要：JSONではなくバイナリバッファとして受け取る
        const arrayBuffer = await res.arrayBuffer();
        
        // 🔓 バイナリをパース（デコード）
        const feed = transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));

        const parsedVehicles: NishiTokyoBusVehicle[] = [];

        // Protobufの構造から必要なデータを抽出して使いやすいオブジェクトに整形
        feed.entity.forEach((entity) => {
          if (entity.vehicle) {
            const v = entity.vehicle;
            parsedVehicles.push({
              id: v.vehicle?.id || "unknown",
              tripId: v.trip?.tripId || null,
              routeId: v.trip?.routeId || null,
              latitude: v.position?.latitude || 0,
              longitude: v.position?.longitude || 0,
              currentStatus: v.currentStatus ? v.currentStatus.toString() : null,
              stopId: v.stopId || null,
            });
          }
        });

        console.log(`[西東京バス] ${parsedVehicles.length} 台のリアルタイム位置情報を取得しました。`);
        console.log("サンプルデータ:", parsedVehicles.slice(0, 20)); // 最初の20台だけ表示
        setVehicles(parsedVehicles);

      } catch (err: any) {
        console.error("西東京バスのリアルタイムデータデコードに失敗しました:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // 初回実行
    fetchNishiTokyoBusData();

    // 30秒ごとに自動リフレッシュ
    const interval = setInterval(fetchNishiTokyoBusData, 30000);
    return () => clearInterval(interval);

  }, [isActive]);

  return { vehicles, loading, error };
};