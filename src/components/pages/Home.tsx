/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo } from 'react';
import { Box, Stack, Spinner, Center } from "@chakra-ui/react";

import { TrainInfoSection } from "../features/TrainInfoSection";
import { trainCardRecipe } from "../recipes/trainCard.recipe";
import { useTrainInformation } from "../../hooks/useTrainInformation";
import { useGetRailwayNameJa } from "../../hooks/useGetRailwayNameJa";
import { OPERATORS_CONFIG } from "../features/operatorConfig";

export const Home: FC = memo(() => {
  const { allTrains, loading, refetch } = useTrainInformation();
  const { getRailwayNameJa, loading: railwayLoading } = useGetRailwayNameJa();

  // ローディング中の画面表示
  if (loading || railwayLoading) {
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
        
        {OPERATORS_CONFIG.map((op) => {
          // カスタムフックなどから、その事業者ID（op.id）に一致するデータだけをフィルタリングして渡す
          const filteredTrains = allTrains.filter(item => item["odpt:operator"] === op.id);

          return (
            <TrainInfoSection
              key={op.id}
              title={op.title}
              languageJa={true}
              normalWord={op.id === "odpt.Operator:Toei" ? "遅延はありません" : "平常"}
              trainsData={filteredTrains}
              targetRailwayIds={op.railwayIds} // 【追加】路線のマスターリストを渡す
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