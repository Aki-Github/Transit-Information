import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// 💡 odpt:BusstopPole APIから返ってくる生データの型定義
interface OdptBusstopPole {
  "@id": string;
  "owl:sameAs": string;
  "dc:title": string;
  "odpt:busstopPoleNumber"?: string;
  "odpt:platformNumber"?: string;
  "odpt:operator"?: string;
  "geo:lat"?: number;
  "geo:long"?: number;
}

export const useSyncBusstops = () => {
  const [loading, setLoading] = useState(false);

  const syncBusstops = async (operatorId: string = "Toei"): Promise<{ success: boolean; count?: number; error?: string }> => {
    setLoading(true);
    try {
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      
      // 💡 指定された事業者（デフォルトは都営バス）のバス停一覧を取得
      // 全事業者を一気に取るとデータが膨大になるため、事業者ごとに同期できるようにしています
      const targetOperator = `odpt.Operator:${operatorId}`;
      const url = `https://api.odpt.org/api/v4/odpt:BusstopPole?odpt:operator=${targetOperator}&acl:consumerKey=${consumerKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("odpt APIからのバス停データ取得に失敗しました。");
      
      const rawData: OdptBusstopPole[] = await response.json();

      if (!rawData || rawData.length === 0) {
        throw new Error("該当するバス停データが見つかりませんでした。");
      }

      // 💡 Supabaseのテーブル構造に合わせてマッピング
      const insertRows = rawData.map((pole) => ({
        id: pole["@id"],
        owl_sameas: pole["owl:sameAs"],
        title: pole["dc:title"] || "名称不明",
        busstop_pole_number: pole["odpt:busstopPoleNumber"] || null,
        platform_number: pole["odpt:platformNumber"] || null,
        operator: pole["odpt:operator"] || null,
        lat: pole["geo:lat"] || null,
        long: pole["geo:long"] || null,
        updated_at: new Date().toISOString(),
      }));

      // 💡 大量データを安全にUPSERTするため、1000件ずつのチャンクに分割して処理
      const chunkSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < insertRows.length; i += chunkSize) {
        const chunk = insertRows.slice(i, i + chunkSize);
        
        const { error: sbError } = await supabase
          .from("busstop_poles")
          .upsert(chunk, { onConflict: "id" }); // @idが重複した場合は最新情報に上書き

        if (sbError) throw sbError;
        insertedCount += chunk.length;
      }

      return { success: true, count: insertedCount };

    } catch (err: any) {
      console.error("Busstops Sync Error:", err);
      return { success: false, error: err.message || "予期せぬエラーが発生しました。" };
    } finally {
      setLoading(false);
    }
  };

  return { syncBusstops, loading };
};