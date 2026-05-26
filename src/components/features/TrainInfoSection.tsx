import { FC, memo } from "react";
import { Box, SimpleGrid, Text, useRecipe, Heading, Flex, Button } from "@chakra-ui/react";

// 外部（親）から受け取るデータの型定義
type Props = {
  title: string;                       // セクションタイトル（例：「東京メトロ運行情報」）
  languageJa: boolean;                 // 日本語コード
  normalWord: string;                  // 「平常運転」を判定するためのキーワード（例：「平常」）
  trainsData: any[];                   // 運行情報の配列（metro または tokyo）
  cardRecipe: any;                     // 適用するレシピ定義
  getRailwayNameJa: (url: string) => string; // 路線名変換関数
  onRefetch?: () => Promise<void>;     // データ再取得のための関数（オプション）
  targetRailwayIds?: string[];         // このセクションが担当する路線のIDリスト
};

export const TrainInfoSection: FC<Props> = memo((props) => {
  const { 
    title, 
    languageJa, 
    normalWord, 
    trainsData, 
    cardRecipe, 
    getRailwayNameJa, 
    onRefetch,
    targetRailwayIds = [] 
  } = props;

  const recipe = useRecipe({ recipe: cardRecipe });

  const translateStatusToEn = (textJa: string): string => {
    if (!textJa) return "No information available";
    
    // 💡 よくある運行情報のパターンを網羅
    if (textJa.includes("現在、運行情報はありません") || 
        textJa.includes("平常通り運転") || 
        textJa.includes("平常どおり運転") ||
        textJa.includes("遅延はありません") ||
        textJa.includes("平常運転")) {
      return "Normal operation. There is no current delay information.";
    }
    if (textJa.includes("遅れが")) {
      return "Delays are occurring.";
    }
    if (textJa.includes("運転見合わせ")) {
      return "Operation suspended.";
    }
    if (textJa.includes("ダイヤ乱れ")) {
      return "Schedule disrupted.";
    }
    if (textJa.includes("直通運転を中止")) {
      return "Through-service has been canceled.";
    }

    // 想定外の文章だった場合は、そのまま日本語を返すか一般的な文言にする
    return textJa; 
  };

  // 遅延線と平常線のハイブリッドマージ ---
  let displayTrains = [...trainsData];

  // もし事前に定義された路線マスターリスト（targetRailwayIds）がある場合
  if (targetRailwayIds.length > 0) {
    // すでにAPIから降ってきたデータ（主に遅延している路線）の路線IDをセット化しておく
    const existingRailwayIds = new Set(trainsData.map(item => item["odpt:railway"]));

    // マスターリストにあって、APIから降ってきていない＝データが取得できていない情報を表示する
    targetRailwayIds.forEach((railwayId) => {
      if (!existingRailwayIds.has(railwayId)) {
        displayTrains.push({
          "owl:sameAs": `virtual.${railwayId}`, // ユニークなkey用
          "odpt:operator": trainsData[0]?.["odpt:operator"] || "", // 事業者IDを合わせておく
          "odpt:railway": railwayId,
          "odpt:trainInformationText": {
            ja: "現在、運行情報が提供されていません。",
            en: "Currently, no train information is available."
          }
        });
      }
    });

    // 3. (任意) 画面に並ぶ順番が毎回バラバラにならないよう、マスターリストの順にソートする
    displayTrains.sort((a, b) => {
      return targetRailwayIds.indexOf(a["odpt:railway"]) - targetRailwayIds.indexOf(b["odpt:railway"]);
    });
  }
  // ------------------------------------------------------------------

  return (
    <Box w="100%">
      
      <Flex align="center" justify="space-between" mb="4" w="100%">
        <Heading as="h1" size="md">
            {title}
        </Heading>

        {/* onRefetch というプロパティが渡されているときだけ更新ボタンを表示する */}
        {onRefetch && (
          <Button onClick={onRefetch} variant="outline" size="sm">
            Update Information
          </Button>
        )}
      </Flex>

      {/* グリッドレイアウト */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4" w="100%">
        {/* 補完された displayTrains をループする */}
        {displayTrains.length === 0 ? (
          <Text color="gray.500">
            {languageJa ? "現在、運行情報が提供されていません。" : "Currently, no train information is available."}
          </Text>
        ) : (
          displayTrains.map((info) => {
            const isNormal = info["odpt:trainInformationText"].ja.includes(normalWord);
            const isNoInfo = info["odpt:trainInformationText"].ja.includes("提供されていません");
            const cardStyles = recipe({ status: isNormal ? "normal" : isNoInfo ? "noInfo" : "delay" });

            return (
              <Box key={info["owl:sameAs"]} css={cardStyles}>
                <Text as="strong" fontWeight="bold">
                  {languageJa 
                    ? `路線: ${getRailwayNameJa(info["odpt:railway"])}` 
                    : `Line: ${info["odpt:railway"].split('.').pop()}`
                  }
                </Text>
                <Text mt="1" color="gray.700">
                  {languageJa 
                    ? `状況: ${info["odpt:trainInformationText"].ja}`
                    : `Status: ${info["odpt:trainInformationText"].en ?? 
                      translateStatusToEn(info["odpt:trainInformationText"].ja)}`
                  }
                </Text>
              </Box>
            );
          })
        )}
      </SimpleGrid>
    </Box>
  );
});