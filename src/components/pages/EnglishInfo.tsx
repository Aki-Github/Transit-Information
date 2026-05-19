/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo } from 'react';
import { Box, Stack, Spinner, Center } from "@chakra-ui/react";

import { TrainInfoSection } from "../features/TrainInfoSection";
import { trainCardRecipe } from "../recipes/trainCard.recipe";
import { useTrainInformation } from "../../hooks/useTrainInformation";
import { getRailwayNameJa } from "../../hooks/useGetRailwayNameJa";

export const EnglishInfo: FC = memo(() => {
  const { allTrains, loading, refetch } = useTrainInformation();

  // 表示したい事業者のリストを定義しておく
  const OPERATORS = [
    { id: "odpt.Operator:JR-East", title: "🚃 JR East operation information" },
    { id: "odpt.Operator:TokyoMetro", title: "🚃 Tokyo Metro operation information" },
    { id: "odpt.Operator:Toei", title: "🚃 Toei Transportation operation information" },
    { id: "odpt.Operator:MIR", title: "🚃 Tsukuba Express operation information" },
    { id: "odpt.Operator:TWR", title: "🚃 Tokyo Rinkai Kosoku operation information" },
    { id: "odpt.Operator:TamaMonorail", title: "🚃 Tama Monorail operation information" },
    { id: "odpt.Operator:YokohamaMunicipal", title: "🚃 Yokohama Municipal Transportation operation information" },
    { id: "odpt.Operator:Tokyu", title: "🚃 Tokyo Kyuko Electric Railway operation information" },
    { id: "odpt.Operator:Odakyu", title: "🚃 Odakyu Electric Railway operation information" },
    { id: "odpt.Operator:Keio", title: "🚃 Keio Electric Railway operation information" },
    { id: "odpt.Operator:Keikyu", title: "🚃 Keikyu Electric Railway operation information" },
    { id: "odpt.Operator:Keisei", title: "🚃 Keisei Electric Railway operation information" },
    { id: "odpt.Operator:Seibu", title: "🚃 Seibu Railway operation information" },
    { id: "odpt.Operator:Tobu", title: "🚃 Tobu Railway operation information" },
    { id: "odpt.Operator:Sotetsu", title: "🚃 Sotetsu Railway operation information" },
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
      {/* Stack の gap="12"（48px）を指定することで、
        メトロのブロックと都営のブロックの「間の隙間」が完全に一定になります！
      */}
      <Stack gap="12" w="100%">
        
        {OPERATORS.map((op) => {
          // カスタムフックなどから、その事業者ID（op.id）に一致するデータだけをフィルタリングして渡す
          const filteredTrains = allTrains.filter(item => item["odpt:operator"] === op.id);

          return (
            <TrainInfoSection
              key={op.id}
              title={op.title}
              languageJa={false} // 英語表示なので false を渡す
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