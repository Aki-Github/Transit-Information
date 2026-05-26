import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient"; // プロジェクトのSupabaseクライアントのパスに合わせてください

export const useGetDestinationNameJa = (lineId: string = 'Asakusa') => {
  const [destinationMap, setDestinationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. マウント時に Supabase からマスタデータを一括取得
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const { data, error } = await supabase
          .from("destinations")
          .select("id, name_ja, line_id")
          .eq("line_id", lineId);

        if (error) throw error;
        console.log(`行先マスタデータ (${lineId}):`, data);

        // 配列形式からオブジェクト形式 { NishiMagome: "西馬込" } にマッピング変換
        const map = (data || []).reduce<Record<string, string>>((acc, row) => {
          acc[row.id] = row.name_ja;
          return acc;
        }, {});

        setDestinationMap(map);
      } catch (err: any) {
        console.error("行先名マスタの取得に失敗しました:", err);
        setError(err.message || '行先名マスタのフェッチ中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, [lineId]); // lineIdが変更されたときに再度データを取得する

  // 2. 従来のURL/ID変換ロジックをフックの中で提供
  const getDestinationNameJa = (idStr: unknown): string => {
    if (!idStr || typeof idStr !== "string") return "不明";

    // 従来の解析ロジック
    const parts = idStr.split(":");
    const lastPart = parts[parts.length - 1];
    const engName = lastPart.split(".").pop() || lastPart;

    // Supabaseのマップにあれば日本語、なければ英語名をそのまま返す
    return destinationMap[engName] ?? engName;
  };

  return { getDestinationNameJa, loading, error };
};