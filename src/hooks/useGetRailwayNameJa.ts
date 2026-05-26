import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export const useGetRailwayNameJa = () => {
  const [railwayMap, setRailwayMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 1. マウント時に Supabase からマスタデータを一括取得
  useEffect(() => {
    const fetchRailways = async () => {
      try {
        const { data, error } = await supabase
          .from("railways")
          .select("id, name_ja");

        if (error) throw error;

        // 配列形式からオブジェクト形式 { Marunouchi: "丸の内線" } にマッピング変換
        const map = (data || []).reduce<Record<string, string>>((acc, row) => {
          acc[row.id] = row.name_ja;
          return acc;
        }, {});

        setRailwayMap(map);
      } catch (err) {
        console.error("路線名マスタの取得に失敗しました:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRailways();
  }, []);

  // 2. 従来の変換ロジックをフックの中で関数として提供
  const getRailwayNameJa = (railwayUrl: string): string => {
    if (!railwayUrl) return "不明な路線";
    
    const engName = railwayUrl.split(".").pop();
    if (!engName) return "不明な路線";

    // Supabaseから取得したマップにあれば日本語、ロード中や未定義なら英語名をそのまま返す
    return railwayMap[engName] ?? engName;
  };

  // 変換関数と、必要であればローディング状態をコンポーネントに返す
  return { getRailwayNameJa, loading };
};