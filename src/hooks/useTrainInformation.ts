import { useState, useEffect, useCallback } from "react";

// 1. 型定義を「運行情報」用に変更
interface TrainInfoData {
  "owl:sameAs": string;
  "odpt:operator": string; // 事業者ID（odpt.Operator:TokyoMetro など）を判別するために必要です
  "odpt:railway": string; // 路線ID
  "odpt:trainInformationText": {
    ja: string; // 日本語の運行状況（例：「平常運転」）
    en: string;
  };
}

export const useTrainInformation = () => {
  // メトロと都営に分けず、すべての鉄道データを格納する1つの配列にします
  const [allTrains, setAllTrains] = useState<TrainInfoData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const API_KEY = process.env.REACT_APP_ODPT_KEY;
  // 【ポイント】事業者指定を無くし、一括取得する用のシンプルなエンドポイントにします
  const ENDPOINT_ALL = `https://api.odpt.org/api/v4/odpt:TrainInformation?acl:consumerKey=${API_KEY}`;

  const fetchTrains = useCallback(async () => {
    try {
      setLoading(true);
      
      // すべての運行情報を一括で取得
      const response = await fetch(ENDPOINT_ALL);
      const data: TrainInfoData[] = await response.json();
      
      // 取得した全データをそのままセット
      setAllTrains(data);
      
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [ENDPOINT_ALL]);

  // フックが呼ばれた時（画面が開いた時）に自動で1回データを取得する
  useEffect(() => {
    fetchTrains();
  }, [fetchTrains]);

  // コンポーネント側には全データ（allTrains）を返します
  return { allTrains, loading, refetch: fetchTrains };
};