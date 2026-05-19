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
};

export const TrainInfoSection: FC<Props> = memo((props) => {
  const { title, languageJa, normalWord, trainsData, cardRecipe, getRailwayNameJa, onRefetch } = props;
  const recipe = useRecipe({ recipe: cardRecipe });

  return (
    // w="100%" で親のサイズに完全追従させます
    <Box w="100%">
      
      <Flex align="center" justify="space-between" mb="4" w="100%">
        <Heading as="h1" size="md">
            {title}
        </Heading>

        {/* onRefetch というプロパティが渡されているときだけ更新ボタンを表示する */}
        {onRefetch && (
          <Button onClick={onRefetch} variant="outline" size="sm">
            情報を更新する
          </Button>
        )}
      </Flex>

      {/* グリッドレイアウト */}
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3 }}
        gap="4"
        w="100%"
      >
        {trainsData.length === 0 ? (
          <Text color="gray.500">
            {languageJa ? "現在、運行情報が提供されていません。" : "Currently, no train information is available."}
          </Text>
        ) : (
          trainsData.map((info) => {
            const isNormal = info["odpt:trainInformationText"].ja.includes(normalWord);
            const cardStyles = recipe({ status: isNormal ? "normal" : "delay" });

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
                    : `Status: ${info["odpt:trainInformationText"].en ?? info["odpt:trainInformationText"].ja}` // 英語テキストがない場合は日本語テキストを表示
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