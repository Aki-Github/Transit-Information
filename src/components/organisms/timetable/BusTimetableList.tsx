import { FC, Fragment } from 'react';
import { Box, Flex, Text, Heading, useSlotRecipe } from '@chakra-ui/react';

import { professionalTimetableRecipe } from '../../recipes/timetableItemRecipe';

// 必要な型定義
interface BusstopPoleTimetableData {
  "owl:sameAs": string;
  "dc:title": string;
  "odpt:busroute"?: string; // 例: "odpt:Busroute:JR-East.Railway:ChuoRapid.Line" など
  "odpt:calendar": string; // 例: "odpt.Calendar:Weekday" (平日), "odpt.Calendar:Saturday" (土曜) など
  "odpt:busstopPoleTimetableObject": {
    "odpt:departureTime": string; // 出発時刻
    "odpt:destinationSign"?: string; // 行先
  }[];
}

interface BusTimetableListProps {
  selectedTimetable: BusstopPoleTimetableData[];
  loadingTimetable: boolean;
}

// 時刻表を「時」ごとに整理するための型定義
interface HourlyRow3Col {
  hour: number;
  weekdayMin: string[];
  saturdayMin: string[];
  holidayMin: string[];
}

// ★ 1. データの組み替えロジック（他社対応・3列強化版）の関数
const generateHourlyRows3Col = (validTimetables: BusstopPoleTimetableData[]): HourlyRow3Col[] => {
  const hourlyMap: Record<number, { weekday: string[]; saturday: string[]; holiday: string[] }> = {};
  
  // 5時から23時までの空の枠を用意
  for (let h = 5; h <= 23; h++) {
    hourlyMap[h] = { weekday: [], saturday: [], holiday: [] };
  }

  validTimetables.forEach((timetable) => {
    const fullTitle = timetable["dc:title"] || "";
    const cal = timetable["odpt:calendar"] || "";

    // ★ 判定の強化：タイトル文字列やカレンダー指定から柔軟に曜日を特定
    let type: "weekday" | "saturday" | "holiday" = "weekday";

    // 大文字小文字のブレを無くすため小文字に変換
    const lowerCal = cal.toLowerCase();
    const lowerTitle = fullTitle.toLowerCase();

    // 1. まずは最も正確な odpt:calendar の末尾で判定
    if (lowerCal.endsWith("saturday")) {
        type = "saturday";
    } else if (lowerCal.endsWith("sunday") || lowerCal.endsWith("holiday")) {
        type = "holiday";
    } else if (lowerCal.endsWith("weekday")) {
        type = "weekday";
    } 
    // 2. 万が一カレンダーIDが空だった場合のフォールバック（文字列検索）
    else if (lowerTitle.includes("土曜")) {
        type = "saturday";
    } else if (lowerTitle.includes("休日") || lowerTitle.includes("日祝") || lowerTitle.includes("日曜") || lowerTitle.includes("祝日")) {
        type = "holiday";
    } else {
        type = "weekday";
    }

    const objects = timetable["odpt:busstopPoleTimetableObject"] || [];
    objects.forEach((obj) => {
      const timeStr = obj["odpt:departureTime"];
      if (!timeStr) return;

      const [hourStr, minStr] = timeStr.split(":");
      const hour = parseInt(hourStr, 10);

      if (hour >= 5 && hour <= 23) {
        const sign = obj["odpt:destinationSign"] ? `(${obj["odpt:destinationSign"]})` : "";
        hourlyMap[hour][type].push(`${minStr}${sign}`);
      }
    });
  });

  // 5時〜23時までの配列に変換（分は数字が小さい順にソート）
  return Object.keys(hourlyMap).map((h) => {
    const hour = parseInt(h, 10);
    return {
      hour,
      weekdayMin: hourlyMap[hour].weekday.sort(),
      saturdayMin: hourlyMap[hour].saturday.sort(),
      holidayMin: hourlyMap[hour].holiday.sort(),
    };
  });
};

export const BusTimetableList: FC<BusTimetableListProps> = ({ selectedTimetable, loadingTimetable }) => {
  // ★ 3列用時刻表レシピ（proTimetable）を適用
  const recipe = useSlotRecipe({ key: "proTimetable", recipe: professionalTimetableRecipe });
  const styles = recipe();

  if (loadingTimetable) {
    return <Text color="fg.muted" p="2">時刻表を読み込み中...</Text>;
  }

  if (!selectedTimetable || selectedTimetable.length === 0) {
    return <Text color="fg.muted" p="2">時刻表データがありません</Text>;
  }

  // 2. フィルター処理の緩和（他社の変則的なタイトルでも落とさないようにする）
  const validTimetables = selectedTimetable.filter((timetable) => {
    const title = timetable["dc:title"] || "";
    // 最低限、タイトルが存在し、「不明」という文字から始まっていなければ有効とする
    return title.length > 0 && !title.startsWith('不明');
  });

  // ★ 安全ガード：フィルターの結果、有効なデータが0件ならここで安全にメッセージを返す
  if (validTimetables.length === 0) {
    return <Text color="fg.muted" p="2">有効な時刻表データがありません</Text>;
  }

  // 最初のデータからタイトルを取得してクレンジング（改行やタブ、連続スペースを1つの半角スペースに）
  let sampleTitle = validTimetables[0]["dc:title"] || "";
  sampleTitle = sampleTitle.replace(/[\n\t]+/g, " ").replace(/\s+/g, " ").trim();

  // コロンで「運行情報」と「停留所名・曜日」を分離する
  const titleParts = sampleTitle.split(/[:：]/);
  
  // デフォルト値の用意
  let busNumber = "バス";
  let destination = "指定方向";

  // もしコロンで綺麗に3つ以上に分かれているならそこから抽出（都バスなど）
//   if (titleParts.length >= 3) {
//     destination = titleParts[2];
//   } else {
//     // コロンが少ない他社データの場合、タイトル文字列そのものを行先として代用、または加工
//     destination = sampleTitle; 
//   }
  // 3. コロンの手前（titleParts[0]）にある複雑な運行情報をさらに細かく分解する
  if (titleParts.length > 0) {
    const rawInfo = titleParts[0]; // 例: "渋２４. ＜中略＞ 、渋２４. ＜中略＞ ゆき"

    // ★ 系統番号の抽出：最初のピリオド（.）の直前までを系統番号とする
    if (rawInfo.includes(".")) {
        busNumber = rawInfo.split(".")[0].trim(); // "渋２４" をゲット！
    } else {
        busNumber = rawInfo.substring(0, 5).trim(); // ピリオドがない場合のセーフティ（先頭数文字）
    }

    // ★ 行先の抽出：文字列の最後の方にある「◯◯ゆき」という文字を探す
    const yukiMatch = rawInfo.match(/([^、.\s]+ゆき)\s*$/) || rawInfo.match(/([^、.\s]+ゆき)/);
    if (yukiMatch) {
        destination = yukiMatch[1]; // "松が丘交番前ゆき" または "渋谷駅ゆき" をゲット！
    } else if (titleParts.length >= 3) {
        // ◯◯ゆき が見つからなかった場合は、従来のコロン区切りの3番目（都バス用）をフォールバックに
        destination = titleParts[2];
    } else {
        destination = sampleTitle;
    }
  }
  // 3列の表形式データに組み替える
  const hourlyRows = generateHourlyRows3Col(validTimetables);

  // もしフィルタリングした結果、表示できる時刻表が1つも残らなかった場合の処理
  if (validTimetables.length === 0) {
    return <Text color="fg.muted" p="2">有効な時刻表データがありません</Text>;
  }

  return (
    <Box {...styles.wrapper}>
      {/* 系統番号と行先ヘッダー */}
      <Flex align="center" gap="2" wrap="wrap" justify="center" mb="2" borderBottom="2px solid" borderColor="gray.800" pb="2">
        {busNumber !== '不明' && busNumber.length < 10 && ( // 長すぎる文字列はバッジにしない
          <Text as="span" {...styles.busNumber}>
            {busNumber}
          </Text>
        )}
        <Heading size="xs" fontWeight="bold">
          {destination.includes("ゆき") ? `${destination} 時刻表` : `${destination}ゆき 時刻表`}
        </Heading>
      </Flex>

      {/* 時刻表のグリッド構造 */}
      <Box {...styles.gridContainer}>
        {/* 表のヘッダー行（時、平日、土曜、休日） */}
        <Box {...styles.headerCell} bg="gray.100">時</Box>
        <Box {...styles.headerCell} bg="gray.700" color="white">平日</Box>
        <Box {...styles.headerCell} bg="teal.50" color="teal.800">土曜</Box>
        <Box {...styles.headerCell} bg="pink.50" color="pink.800">休日(日祝)</Box>

        {/* 5時〜23時のデータを1行ずつループ出力 */}
        {hourlyRows.map((row) => (
          <Fragment key={row.hour}>
            {/* 1列目：時 */}
            <Box {...styles.hourCell}>
              {row.hour}
            </Box>

            {/* 2列目：平日 */}
            <Box {...styles.minuteCell}>
              {row.weekdayMin.length > 0 ? (
                row.weekdayMin.map((min, idx) => <Text key={idx} as="span" fontWeight="medium">{min}</Text>)
              ) : (
                <Text color="gray.300">-</Text>
              )}
            </Box>

            {/* 3列目：土曜 */}
            <Box {...styles.minuteCell} bg="teal.50/5">
              {row.saturdayMin.length > 0 ? (
                row.saturdayMin.map((min, idx) => <Text key={idx} as="span" fontWeight="medium" color="teal.700">{min}</Text>)
              ) : (
                <Text color="gray.300">-</Text>
              )}
            </Box>

            {/* 4列目：休日 */}
            <Box {...styles.minuteCell} bg="pink.50/10">
              {row.holidayMin.length > 0 ? (
                row.holidayMin.map((min, idx) => <Text key={idx} as="span" fontWeight="medium" color="pink.700">{min}</Text>)
              ) : (
                <Text color="gray.300">-</Text>
              )}
            </Box>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
};