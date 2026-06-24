import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface OdptTimetableObject {
  "odpt:busstopPole": string;
  "odpt:departureTime"?: string;
  "odpt:secondsFromStart"?: number;
  "odpt:destinationSign"?: string;
  "odpt:note"?: string; // 💡 西武バスの行先が入る可能性のあるフィールド
}

interface OdptBusTimetable {
  "@id": string;
  "owl:sameAs": string;
  "odpt:operator": string;
  "odpt:busroute": string;
  "odpt:busroutePattern"?: string;
  "odpt:calendar": string;
  "dc:title"?: string;
  "odpt:busTimetableObject": OdptTimetableObject[];
}

export const useSyncBusTimetable = () => {
  const [loading, setLoading] = useState(false);

  // 💡 都営バスの Specific カレンダーIDを標準の運行区分に変換するマッピング
  const toeiSpecificCalendarMap: { [key: string]: string } = {
    "01-100": "holiday",  // 休日
    "01-160": "saturday", // 土曜
    "01-170": "weekday",  // 平日
    "06-100": "holiday",  // 休日
    "06-160": "saturday", // 土曜
    "06-170": "weekday",  // 平日    
    "09-100": "holiday",  // 休日
    "09-160": "saturday", // 土曜
    "09-170": "weekday",  // 平日
    "13-100": "holiday",  // 休日
    "13-160": "saturday", // 土曜
    "13-170": "weekday",  // 平日
    "21-100": "holiday",  // 休日
    "21-160": "saturday", // 土曜
    "21-170": "weekday",  // 平日
    "25-100": "holiday",  // 休日
    "25-160": "saturday", // 土曜
    "25-170": "weekday",  // 平日
    "29-100": "holiday",  // 休日
    "29-160": "saturday", // 土曜
    "29-170": "weekday",  // 平日
    "33-100": "holiday",  // 休日
    "33-160": "saturday", // 土曜
    "33-170": "weekday",  // 平日
    "37-100": "holiday",  // 休日
    "37-160": "saturday", // 土曜
    "37-170": "weekday",  // 平日
    "41-100": "holiday",  // 休日
    "41-160": "saturday", // 土曜
    "41-170": "weekday",  // 平日
    "45-100": "holiday",  // 休日
    "45-160": "saturday", // 土曜
    "45-170": "weekday",  // 平日
    "49-100": "holiday",  // 休日
    "49-160": "saturday", // 土曜
    "49-170": "weekday",  // 平日
    "53-100": "holiday",  // 休日
    "53-160": "saturday", // 土曜
    "53-170": "weekday",  // 平日
    "57-100": "holiday",  // 休日
    "57-160": "saturday", // 土曜
    "57-170": "weekday",  // 平日
    "61-100": "holiday",  // 休日
    "61-160": "saturday", // 土曜
    "61-170": "weekday",  // 平日
    "65-100": "holiday",  // 休日
    "65-160": "saturday", // 土曜
    "65-170": "weekday",  // 平日
    "69-100": "holiday",  // 休日
    "69-160": "saturday", // 土曜
    "69-170": "weekday",  // 平日
    "77-100": "holiday",  // 休日
    "77-160": "saturday", // 土曜
    "77-170": "weekday",  // 平日
    "81-100": "holiday",  // 休日
    "81-160": "saturday", // 土曜
    "81-170": "weekday",  // 平日
    "85-100": "holiday",  // 休日
    "85-160": "saturday", // 土曜
    "85-170": "weekday",  // 平日
  };

  /**
   * 都営バスのカレンダー文字列から weekday / saturday / holiday を判定する関数
   */
  const judgeToeiCalendarType = (calString: string, titleString: string): string => {
    const lowerCal = calString.toLowerCase();
    const lowerTitle = titleString.toLowerCase();

    // 1. Specific.Toei.XX-XXX パターンの解析
    if (lowerCal.includes("specific.toei")) {
      // 文字列の末尾から "09-170" のような識別子を抽出
      const match = calString.match(/([\w-]+)$/);
      if (match) {
        const calendarId = match[1]; // 例: "09-170"
        if (toeiSpecificCalendarMap[calendarId]) {
          return toeiSpecificCalendarMap[calendarId];
        }
      }
    }

    // 2. 通常のドメイン末尾のキーワード判定（前回のロジックの統合）
    if (lowerCal.endsWith("mondaytofriday") || lowerCal.endsWith("weekday")) {
      return "weekday";
    }
    if (lowerCal.endsWith("saturday")) {
      return "saturday";
    }
    if (lowerCal.endsWith("sundayholiday") || lowerCal.endsWith("holiday") || lowerCal.endsWith("substituteholiday")) {
      return "holiday";
    }
    if (lowerCal.endsWith("mondaytosaturday")) {
      return "weekday";
    }

    // 3. 日本語タイトルによるフォールバック
    if (lowerTitle.includes("土曜")) return "saturday";
    if (lowerTitle.includes("休日") || lowerTitle.includes("日祝") || lowerTitle.includes("日曜") || lowerTitle.includes("祝日")) {
      return "holiday";
    }

    // 4. どれにも該当しない場合は安全のため平日扱い
    return "weekday";
  };

  /**
   * @param busrouteIds 同期したい系統IDの配列 
   * (例: ["odpt.Busroute:Toei.To01", "odpt.Busroute:Toei.To02", ...])
   */
  const syncTimetableByRoutes = async (
    busrouteIds: string[]
  ): Promise<{ success: boolean; processedRoutes: number; error?: string }> => {
    if (!busrouteIds || busrouteIds.length === 0) {
      return { success: false, processedRoutes: 0, error: "系統IDが指定されていません。" };
    }

    setLoading(true);
    let totalHeadersCount = 0;
    let totalObjectsCount = 0;
    let skippedRoutesCount = 0;

    try {
      const consumerKey = process.env.REACT_APP_ODPT_KEY;
      console.log(`計 ${busrouteIds.length} 件の系統の時刻表同期を開始します...`);

      // 💡 系統ごとにAPIを叩くループ処理
      for (let i = 0; i < busrouteIds.length; i++) {
        if (i > 0 && i % 80 === 0) {
          console.log(`⏳ APIの負荷軽減のため、1.5秒間待機します... (${i}件処理完了)`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const routeId = busrouteIds[i];
        console.log(`[${i + 1}/${busrouteIds.length}] 系統: ${routeId} を取得中...`);

        // 💡 系統（odpt:busroute）で絞り込む（これなら1000件の上限にかかりません）
        const url = `https://api.odpt.org/api/v4/odpt:BusTimetable?odpt:busroutePattern=${routeId}&acl:consumerKey=${consumerKey}`;

        // 🟢 対策1: API取得自体でエラーが起きてもキャッチしてスキップできるようにブロック化
        let rawData: OdptBusTimetable[] = [];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`⚠️ APIエラー(ステータス:${response.status}): 系統 ${routeId} をスキップします。`);
            skippedRoutesCount++;
            continue;
          }
          rawData = await response.json();
        } catch (fetchErr) {
          console.error(`❌ ネットワークエラーにより系統 ${routeId} の取得に失敗:`, fetchErr);
          skippedRoutesCount++;
          continue;
        }

        if (!rawData || rawData.length === 0) {
          console.log(`ℹ️ 系統 ${routeId} の時刻表データは0件でした。`);
          continue;
        }

        // 💡 この系統のデータをマッピング
        const insertHeaders: any[] = [];
        const insertObjects: any[] = [];

        rawData.forEach((timetable) => {
          // 🟢 ここから追加：カレンダーの柔軟な曜日判定ロジック
          const fullTitle = timetable["dc:title"] || "";
          const cal = timetable["odpt:calendar"] || "";
          const operator = timetable["odpt:operator"] || "";

          // 🟢 追加した判定関数を呼び出して、一発で weekday / saturday / holiday を取得
          const type = judgeToeiCalendarType(cal, fullTitle);

          // --------------------------------------------------------
          // 💡 都営バス限定：dc:title から title と destination を切り分ける
          // --------------------------------------------------------
          let dbTitle = fullTitle;
          let dbDestination: string | null = null;
          const objects = timetable["odpt:busTimetableObject"] || [];

          if (operator === "odpt.Operator:Toei" && fullTitle) {
            // 末尾の「（曜日）」や「(曜日)」のパーツをあらかじめ除去
            // const titleWithoutCalendar = fullTitle.replace(/[（(][^）)]*[）)]$/, "").trim();

            // 💡 【正規表現での強力な切り分け】
            // 先頭の「スペースを含まない塊（＝系統名、例: 都05-1 や 急行05）」を抽出
            // ※ [^\s\u3000]+ は「スペース以外の文字が1文字以上続く」という意味です
            const match = fullTitle.match(/^([^\s\u3000]+)[\s\u3000]+(.*)$/);

            if (match) {
              dbTitle = match[1].trim();       // 1つ目のカッコ（系統名。例: "都05-1"）
              dbDestination = match[2].trim(); // 2つ目のカッコ（行先。例: "東京駅丸の内南口行"）
            } else {
              // 💡 万が一スペースで区切られていなかった場合の安全なフォールバック
              // 系統ID（odpt:busroute）の末尾から系統名（"To05"等）を推測して入れるなど
              dbTitle = fullTitle;
              dbDestination = fullTitle;
            }
          } else if (operator === "odpt.Operator:SeibuBus") {
            // 🟢 西武バスの場合：終点オブジェクト（配列の最後）の odpt:note から行先を抽出
            if (objects.length > 0) {
              // 💡 配列の一番最後（終点）のオブジェクトを取得
              const lastObj = objects[objects.length - 1];
              const lastNote = lastObj["odpt:note"] || ""; // 例: "石神井公園駅南口:30031:15"

              if (lastNote) {
                // コロン（:）で分割し、最初の要素（バス停名）を取得
                const noteParts = lastNote.split(":");
                if (noteParts.length > 0) {
                  dbDestination = noteParts[0].trim(); // 💡 例: "石神井公園駅南口" が入る
                }
              }
            }

            // 💡 万が一上記で取得できなかった場合の安全なフォールバック
            if (!dbDestination) {
              dbDestination = "終点行き";
            }

            // 💡 系統名（title）は dc:title（例: "荻１１"）をそのままセット
            dbTitle = fullTitle || dbTitle;
          }  else if (operator === "odpt.Operator:YokohamaMunicipal") {
            // 🟢 横浜市営バスの場合：終点オブジェクト（配列の最後）の odpt:destinationSign から行先を抽出
            if (objects.length > 0) {
              // 💡 配列の一番最後（終点）のオブジェクトを取得
              const lastObj = objects[objects.length - 1];
              let rawDestination = lastObj["odpt:destinationSign"] || ""; // 例: "東神奈川駅西口 行"

              if (rawDestination === "") {
                const firstObj = objects[0];
                rawDestination = firstObj["odpt:destinationSign"] || "";
              }

              // 🟢 「 行」を取り除く処理を追加
              // 1. 末尾の「 行」や「行」を空文字に置き換える
              // 2. .trim() で前後の余分なスペース（全角・半角）を削る
              dbDestination = rawDestination.replace(/\s*行$/, "").trim();
            }

            // 💡 万が一上記で取得できなかった場合の安全なフォールバック
            if (!dbDestination) {
              dbDestination = "終点行き";
            }

            // 💡 系統名（title）は dc:title（例: "038系統"）をそのままセット
            dbTitle = fullTitle || dbTitle;
          } else {
            // その他のバス会社（デフォルト）
            dbTitle = fullTitle;
          }

          // --------------------------------------------------------
          // 💡 西武バス等で不足している odpt:busroute を動的に生成する
          // --------------------------------------------------------
          let dbBusroute = timetable["odpt:busroute"] || null;
          const patternStr = timetable["odpt:busroutePattern"] || "";

          if (!dbBusroute && patternStr) {
            // 1. 先頭の "BusroutePattern:" を "Busroute:" に書き換える
            let converted = patternStr.replace("BusroutePattern:", "Busroute:");
            
            // 2. 末尾にある「.数字.数字」（例: .51006.1 や .10001.1）を正規表現で綺麗に取り除く
            // \.\d+\.\d+$ は「末尾の .数字.数字」にマッチします
            dbBusroute = converted.replace(/\.\d+\.\d+$/, "");
          }

          insertHeaders.push({
            owl_sameas: timetable["owl:sameAs"],
            operator: timetable["odpt:operator"],
            busroute: dbBusroute,
            busroute_pattern: timetable["odpt:busroutePattern"] || null,
            // 💡 判定した標準の種別（weekday / saturday / holiday）をそのまま格納！
            calendar: type,
            title: dbTitle,              // 💡 分割された系統名が入る（例: "都05-1"）
            destination: dbDestination,  // 💡 抽出された行先が入る（例: "東京駅丸の内南口行"）
          });

          objects.forEach((obj, index) => {
            insertObjects.push({
              timetable_owl_sameas: timetable["owl:sameAs"],
              busstop_pole_owl_sameas: obj["odpt:busstopPole"],
              index_order: index,
              departure_time: obj["odpt:departureTime"] || null,
              seconds_from_start: obj["odpt:secondsFromStart"] !== undefined ? obj["odpt:secondsFromStart"] : null,
            });
          });
        });

        // 🟢 対策2: Supabaseへのデータ流し込みを安全なトライキャッチで保護
        try {
          // 親レコードの保存
          if (insertHeaders.length > 0) {
            const { error: sbHeaderError } = await supabase
              .from("bus_timetables")
              .upsert(insertHeaders, { onConflict: "owl_sameas" });
            if (sbHeaderError) throw sbHeaderError;
            totalHeadersCount += insertHeaders.length;
          }

          // 子レコードの保存 (チャンクサイズを500に縮小＋ウェイトを導入)
          if (insertObjects.length > 0) {
            const objectChunkSize = 500; // 💡 1000から500に下げてリクエストを軽量化
            for (let k = 0; k < insertObjects.length; k += objectChunkSize) {
              const chunk = insertObjects.slice(k, k + objectChunkSize);
              const { error: sbObjectError } = await supabase
                .from("bus_timetable_objects")
                .upsert(chunk, { onConflict: "timetable_owl_sameas,index_order" });
              
              if (sbObjectError) throw sbObjectError;
              totalObjectsCount += chunk.length;

              // 💡 対策3: 1チャンク送るごとに50ms休止。Supabase側のバースト（過負荷）を防ぐ
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        } catch (dbErr) {
          // 💡 ここでキャッチすることで、この系統がエラーになっても全体は止まらず次の系統の処理に進める！
          console.error(`❌ Supabaseへの書き込み失敗 (系統: ${routeId}):`, dbErr);
          skippedRoutesCount++;
        }

        // 系統間のインターバルを少し長め（100ms）にしてAPI・DB双方を労わる
        await new Promise((resolve) => setTimeout(resolve, 200)); // 100ms から 200ms に微増
      }

      console.log(`🎉 全系統の同期処理が終了しました。`);
      console.log(`   成功: 親 ${totalHeadersCount}件 / 子 ${totalObjectsCount}件`);
      console.log(`   スキップ・エラー: ${skippedRoutesCount} 系統`);
      return { success: true, processedRoutes: busrouteIds.length - skippedRoutesCount };

    } catch (err: any) {
      console.error("予期せぬ致命的エラー:", err);
      return { success: false, processedRoutes: 0, error: err.message || "同期エラー" };
    } finally {
      setLoading(false);
    }
  };

  return { syncTimetableByRoutes, loading };
};