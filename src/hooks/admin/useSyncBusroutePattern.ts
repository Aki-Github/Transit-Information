import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// ==========================================
// 📋 ODPT APIから返却されるデータの型定義
// ==========================================
interface OdptBusstopPoleOrder {
  "odpt:index": number;
  "odpt:busstopPole": string;
  "odpt:note"?: string;
}

interface OdptBusroutePattern {
  "owl:sameAs": string;
  "odpt:operator": string;
  "odpt:busroute": string;
  "odpt:pattern": string;
  "odpt:direction"?: string;
  "dc:title"?: string;
  "odpt:note"?: string;
  "odpt:busstopPoleOrder": OdptBusstopPoleOrder[];
}

export const useSyncBusroutePattern = () => {
  const [loading, setLoading] = useState(false);

  /**
   * @param operatorId 同期したい事業者ID
   * (例: "odpt.Operator:SeibuBus" や "odpt.Operator:NishiTokyoBus")
   */
  const syncPatternsByOperator = async (
    operatorId: string
  ): Promise<{ success: boolean; totalPatterns: number; error?: string }> => {
    if (!operatorId) {
      return { success: false, totalPatterns: 0, error: "事業者IDが指定されていません。" };
    }

    setLoading(true);
    let totalPatternsCount = 0;
    let totalStopsCount = 0;

    try {
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      const targetOperator = `odpt.Operator:${operatorId}`;
      console.log(`事業者: ${operatorId} の全路線パターン情報の同期を開始します...`);

      // 💡 odpt:operator で絞り込み、一括で全パターンを取得（最大件数制限に備えて一応極端に大きな上限をセット可能ですが、通常パターンデータは1事業者分なら収まります）
      const url = `https://api.odpt.org/api/v4/odpt:BusroutePattern?odpt:operator=${targetOperator}&acl:consumerKey=${consumerKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ODPT APIからのデータ取得に失敗しました。ステータス: ${response.status}`);
      }

      const rawData: OdptBusroutePattern[] = await response.json();
      if (!rawData || rawData.length === 0) {
        console.log("対象事業者の路線パターンデータが0件でした。");
        return { success: true, totalPatterns: 0 };
      }

      console.log(`APIから ${rawData.length} 件のパターン生データを取得しました。パースを開始します...`);

      const insertPatterns: any[] = [];
      const insertStops: any[] = [];

      // 🟢 全データをループして配列にひたすら詰める
      rawData.forEach((pattern) => {
        const patternSameAs = pattern["owl:sameAs"];

        // 1. 親レコード（系統パターン基本情報）
        insertPatterns.push({
          owl_sameas: patternSameAs,
          operator: pattern["odpt:operator"],
          busroute: pattern["odpt:busroute"],
          pattern_code: pattern["odpt:pattern"] || "",
          direction: pattern["odpt:direction"] || null,
          title: pattern["dc:title"] || null,
          note: pattern["odpt:note"] || null,
        });

        // 2. 子レコード（停留所順序の配列）
        const stops = pattern["odpt:busstopPoleOrder"] || [];
        stops.forEach((stop) => {
          insertStops.push({
            route_pattern_owl_sameas: patternSameAs,
            index_order: stop["odpt:index"],
            busstop_pole_owl_sameas: stop["odpt:busstopPole"],
            stop_note: stop["odpt:note"] || null,
          });
        });
      });

      // 💡 大量データ対策：Supabaseへの負荷を抑えるため、1000件ずつのチャンクに分けてUPSERT
      const CHUNK_SIZE = 1000;

      // 🟢 親テーブルのUPSERT
      console.log(`親テーブル (${insertPatterns.length}件) をSupabaseに反映中...`);
      for (let i = 0; i < insertPatterns.length; i += CHUNK_SIZE) {
        const chunk = insertPatterns.slice(i, i + CHUNK_SIZE);
        const { error: patternError } = await supabase
          .from("bus_route_patterns")
          .upsert(chunk, { onConflict: "owl_sameas" });
        if (patternError) throw patternError;
        totalPatternsCount += chunk.length;
      }

      // 🟢 子テーブルのUPSERT (停留所情報は親の数倍〜数十倍の数になるため、小分けが必須です)
      console.log(`子テーブル (${insertStops.length}件) をSupabaseに反映中...`);
      for (let j = 0; j < insertStops.length; j += CHUNK_SIZE) {
        const chunk = insertStops.slice(j, j + CHUNK_SIZE);
        const { error: stopError } = await supabase
          .from("bus_route_pattern_stops")
          .upsert(chunk, { onConflict: "route_pattern_owl_sameas,index_order" });
        if (stopError) throw stopError;
        totalStopsCount += chunk.length;
      }

      console.log(`💪 同期完了！事業者: ${operatorId}`);
      console.log(`  - 親テーブル(パターン): ${totalPatternsCount} 件`);
      console.log(`  - 子テーブル(停留所順): ${totalStopsCount} 件`);

      return { success: true, totalPatterns: totalPatternsCount };

    } catch (err: any) {
      console.error("事業者パターン同期中にエラーが発生しました:", err);
      return { success: false, totalPatterns: 0, error: err.message || "同期エラー" };
    } finally {
      setLoading(false);
    }
  };

  return { syncPatternsByOperator, loading };
};