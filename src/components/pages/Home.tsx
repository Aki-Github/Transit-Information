/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo } from 'react';
import { Box, Stack, Spinner, Center } from "@chakra-ui/react";

import { TrainInfoSection } from "../features/TrainInfoSection";
import { trainCardRecipe } from "../recipes/trainCard.recipe";
import { useTrainInformation } from "../../hooks/useTrainInformation";
import { getRailwayNameJa } from "../../hooks/useGetRailwayNameJa";

export const Home: FC = memo(() => {
  const { allTrains, loading, refetch } = useTrainInformation();

  // 表示したい事業者のリストを定義しておく
  const OPERATORS = [
    { id: "odpt.Operator:JR-East", title: "🚃 JR東日本 運行情報" },
    { id: "odpt.Operator:TokyoMetro", title: "🚃 東京メトロ 運行情報" },
    { id: "odpt.Operator:Toei", title: "🚃 東京都交通局 運行情報" },
    { id: "odpt.Operator:MIR", title: "🚃 つくばエクスプレス 運行情報" },
    { id: "odpt.Operator:TWR", title: "🚃 東京臨海高速鉄道 運行情報" },
    { id: "odpt.Operator:TamaMonorail", title: "🚃 多摩モノレール 運行情報" },
    { id: "odpt.Operator:YokohamaMunicipal", title: "🚃 横浜市交通局 運行情報" },
    { id: "odpt.Operator:Tokyu", title: "🚃 東急電鉄 運行情報" },
    { id: "odpt.Operator:Odakyu", title: "🚃 小田急電鉄 運行情報" },  
    { id: "odpt.Operator:Keio", title: "🚃 京王電鉄 運行情報" },
    { id: "odpt.Operator:Keikyu", title: "🚃 京浜急行電鉄 運行情報" },
    { id: "odpt.Operator:Keisei", title: "🚃 京成電鉄 運行情報" },
    { id: "odpt.Operator:Seibu", title: "🚃 西武鉄道 運行情報" },
    { id: "odpt.Operator:Tobu", title: "🚃 東武鉄道 運行情報" },
    { id: "odpt.Operator:Sotetsu", title: "🚃 相模鉄道 運行情報" },
  ];

  // ローディング中の画面表示
  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    // 全体を囲う Box のパディングを p="6"（24px）程度に整えます
    <Box p="6" w="100%">
      <Stack gap="12" w="100%">
        
        {OPERATORS.map((op) => {
          // カスタムフックなどから、その事業者ID（op.id）に一致するデータだけをフィルタリングして渡す
          const filteredTrains = allTrains.filter(item => item["odpt:operator"] === op.id);

          return (
            <TrainInfoSection
              key={op.id}
              title={op.title}
              languageJa={true} // 今回は全て日本語表示なので true を渡すだけでOK
              normalWord={op.id === "odpt.Operator:Toei" ? "遅延はありません" : "平常"}
              trainsData={filteredTrains}
              cardRecipe={trainCardRecipe}
              getRailwayNameJa={getRailwayNameJa}
              onRefetch={op.id === "odpt.Operator:JR-East" ? refetch : undefined}
            />
          );
        })}

      </Stack>
    </Box>
  );
});