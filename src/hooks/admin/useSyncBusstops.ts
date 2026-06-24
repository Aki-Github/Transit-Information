import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import JSZip from "jszip";
import Papa from "papaparse";

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

// 💡 GTFSのstops.txtの行データ型定義
interface GtfsStopRow {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  // 必要に応じて他のフィールド（zone_id, location_typeなど）
}

export const useSyncBusstops = () => {
  const [loading, setLoading] = useState(false);

  const syncBusstops = async (operatorId: string = "Toei"): Promise<{ success: boolean; count?: number; error?: string }> => {
    setLoading(true);
    try {
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      let insertRows: any[] = [];

      // ==========================================
      // 🚌 パターンA: 京王バス・西東京バス (GTFSデータ処理)
      // ==========================================
      if (operatorId.toLowerCase() === "keio") {
        // 画像に記載されているGTFS提供URL（※odptの仕様に沿ったバイナリURL、またはダウンロードURLを指定してください）
        // ここでは一般的なodptのGTFSデータアーカイブURL、もしくは直URLを想定しています
        const gtfsUrl = `https://api.odpt.org/api/v4/files/odpt/KeioBus/AllLines.zip?date=20260404&acl:consumerKey=${consumerKey}`;

        // 1. ZIPファイルをバイナリとしてフェッチ
        const response = await fetch(gtfsUrl);
        if (!response.ok) throw new Error("京王バスのGTFSデータの取得に失敗しました。");
        const arrayBuffer = await response.arrayBuffer();

        // 2. JSZipで解凍し、stops.txt を抽出
        const zip = await JSZip.loadAsync(arrayBuffer);
        const stopsFile = zip.file("stops.txt");
        if (!stopsFile) throw new Error("GTFSの中に stops.txt が見つかりませんでした。");
        
        const stopsText = await stopsFile.async("string");

        // 3. PapaParseでCSVをJSONオブジェクトの配列に変換
        const parsed = Papa.parse<GtfsStopRow>(stopsText, {
          header: true,
          skipEmptyLines: true,
        });

        // 4. Supabaseのテーブル構造に合わせてマッピング
        insertRows = parsed.data.map((stop) => {
          // 既存のodptデータと重複・衝突しないようにプレフィックスを定義
          const globalId = `keio:BusstopPole:${stop.stop_id}`;
          return {
            id: globalId,
            owl_sameas: globalId,
            title: stop.stop_name || "名称不明",
            busstop_pole_number: null, // GTFSに該当なし、または必要に応じて他フィールドからマッピング
            platform_number: null,
            operator: "odpt.Operator:KeioBus",
            lat: stop.stop_lat ? parseFloat(stop.stop_lat) : null,
            long: stop.stop_lon ? parseFloat(stop.stop_lon) : null,
            updated_at: new Date().toISOString(),
          };
        });

      } else if (operatorId.toLowerCase() === "nishitokyo") {
        // 西東京バス
        const gtfsUrl = `https://api.odpt.org/api/v4/files/odpt/NishiTokyoBus/NTBus.zip?date=20260622&acl:consumerKey=${consumerKey}`;

        // 1. ZIPファイルをバイナリとしてフェッチ
        const response = await fetch(gtfsUrl);
        if (!response.ok) throw new Error("西東京バスのGTFSデータの取得に失敗しました。");
        const arrayBuffer = await response.arrayBuffer();

        // 2. JSZipで解凍し、stops.txt を抽出
        const zip = await JSZip.loadAsync(arrayBuffer);
        const stopsFile = zip.file("stops.txt");
        if (!stopsFile) throw new Error("GTFSの中に stops.txt が見つかりませんでした。");
        
        const stopsText = await stopsFile.async("string");

        // 3. PapaParseでCSVをJSONオブジェクトの配列に変換
        const parsed = Papa.parse<GtfsStopRow>(stopsText, {
          header: true,
          skipEmptyLines: true,
        });

        // 4. Supabaseのテーブル構造に合わせてマッピング
        insertRows = parsed.data.map((stop) => {
          // 既存のodptデータと重複・衝突しないようにプレフィックスを定義
          const globalId = `nishitokyo:BusstopPole:${stop.stop_id}`;
          return {
            id: globalId,
            owl_sameas: globalId,
            title: stop.stop_name || "名称不明",
            busstop_pole_number: null, // GTFSに該当なし、または必要に応じて他フィールドからマッピング
            platform_number: null,
            operator: "odpt.Operator:NishiTokyoBus",
            lat: stop.stop_lat ? parseFloat(stop.stop_lat) : null,
            long: stop.stop_lon ? parseFloat(stop.stop_lon) : null,
            updated_at: new Date().toISOString(),
          };
        });

      } else if (operatorId.toLowerCase() === "kawasakicity") {
        // 川崎市営バス
        const gtfsUrl = `https://api.odpt.org/api/v4/files/odpt/TransportationBureau_CityOfKawasaki/AllLines.zip?date=20260528&acl:consumerKey=${consumerKey}`;

        // 1. ZIPファイルをバイナリとしてフェッチ
        const response = await fetch(gtfsUrl);
        if (!response.ok) throw new Error("川崎市営バスのGTFSデータの取得に失敗しました。");
        const arrayBuffer = await response.arrayBuffer();

        // 2. JSZipで解凍し、stops.txt を抽出
        const zip = await JSZip.loadAsync(arrayBuffer);
        const stopsFile = zip.file("stops.txt");
        if (!stopsFile) throw new Error("GTFSの中に stops.txt が見つかりませんでした。");
        
        const stopsText = await stopsFile.async("string");

        // 3. PapaParseでCSVをJSONオブジェクトの配列に変換
        const parsed = Papa.parse<GtfsStopRow>(stopsText, {
          header: true,
          skipEmptyLines: true,
        });

        // 4. Supabaseのテーブル構造に合わせてマッピング
        insertRows = parsed.data
          .filter((stop) => stop.stop_id.includes("_"))
          .map((stop) => {
            const globalId = `kawasakicity:BusstopPole:${stop.stop_id}`;
            const pole_number = stop.stop_id.split("_").pop() || null;

            return {
              id: globalId,
              owl_sameas: globalId,
              title: stop.stop_name || "名称不明",
              busstop_pole_number: pole_number,
              platform_number: pole_number,
              operator: "odpt.Operator:KawasakiCity",
              lat: stop.stop_lat ? parseFloat(stop.stop_lat) : null,
              long: stop.stop_lon ? parseFloat(stop.stop_lon) : null,
              updated_at: new Date().toISOString(),
            };
          });

      // ==========================================
      // 🚌 パターンB: 通常の事業者 (従来通りのWeb API処理)
      // ==========================================
      } else {
        const targetOperator = `odpt.Operator:${operatorId}`;
        const url = `https://api.odpt.org/api/v4/odpt:BusstopPole?odpt:operator=${targetOperator}&acl:consumerKey=${consumerKey}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`${operatorId}のバス停データ取得に失敗しました。`);
        
        const rawData: OdptBusstopPole[] = await response.json();

        if (!rawData || rawData.length === 0) {
          throw new Error("該当するバス停データが見つかりませんでした。");
        }

        insertRows = rawData.map((pole) => ({
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
      }

      // ==========================================
      // 💾 Supabaseへの共通UPSERT処理 (1000件ずつチャンク化)
      // ==========================================
      if (insertRows.length === 0) {
        throw new Error("インサート対象のデータが存在しません。");
      }

      const chunkSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < insertRows.length; i += chunkSize) {
        const chunk = insertRows.slice(i, i + chunkSize);
        
        const { error: sbError } = await supabase
          .from("busstop_poles")
          .upsert(chunk, { onConflict: "id" });

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