import { FC, memo } from "react";
import { Flex, Box } from "@chakra-ui/react";
import { getTrainStyles } from "../../../hooks/liveMap/useGetTrainStyles";

// 型定義
interface TramTrainData {
  "@id": string;
  "odpt:trainNumber": string;
  "odpt:trainType": string; // 種別（odpt.TrainType:Toei.Express など）
  "odpt:railDirection": string; // 進行方向ID
  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;
  "odpt:destinationStation"?: string[]; // 行先駅IDの配列
  "odpt:delay"?: number;
}

interface StopBetweenRowProps {
  upBetweenTrains: TramTrainData[];
  downBetweenTrains: TramTrainData[];
  styles: Record<string, any>; // 親のuseSlotRecipeから生成されたstylesオブジェクトを受け取る
  onTrainClick: (train: TramTrainData) => void;
  getDestinationNameJa: (idStr: unknown) => string; // 行先名取得関数を受け取る
}

export const StopBetweenRow: FC<StopBetweenRowProps> = memo(({
  upBetweenTrains,
  downBetweenTrains,
  styles,
  onTrainClick, // 列車クリック時のコールバック関数
  getDestinationNameJa, // 行先名取得関数
}) => {

  return (
    <Flex css={styles.betweenRow}>
      
      {/* 【左側】駅間を走る 上り列車 */}
      <Flex css={styles.leftTrainTrack}>
        {upBetweenTrains.map((t) => {
          const trainStyles = getTrainStyles(t["odpt:trainType"] || "");
          return (
            <Box
              key={t["odpt:trainNumber"]}
              css={styles.betweenLeftSide}
              onClick={() => onTrainClick(t)}
              cursor="pointer"
              _hover={{ transform: "scale(1.02)", transition: "0.2s" }} // ちょっとしたホバー演出
              bg={trainStyles.betweenBg}
              borderColor={trainStyles.betweenBorder}
              color={trainStyles.betweenBorder}
            >
              ▲ {trainStyles.typeLabel} {t["odpt:destinationStation"]?.[0] ? getDestinationNameJa(t["odpt:destinationStation"][0]) + " 行" : "上り方面"}
            </Box>
          );
        })}
      </Flex>

      {/* 【中央】駅間の線路 */}
      <Flex css={styles.centerStationNode}>
        <Box css={styles.trackLine} />
      </Flex>

      {/* 【右側】駅間を走る 下り列車 */}
      <Flex css={styles.rightTrainTrack}>
        {downBetweenTrains.map((t) => {
          const trainStyles = getTrainStyles(t["odpt:trainType"] || "");
          return (
            <Box
              key={t["odpt:trainNumber"]}
              css={styles.betweenRightSide}
              onClick={() => onTrainClick(t)}
              cursor="pointer"
              _hover={{ transform: "scale(1.02)", transition: "0.2s" }} // ちょっとしたホバー演出
              bg={trainStyles.betweenBg}
              borderColor={trainStyles.betweenBorder}
              color={trainStyles.betweenBorder}
            >
              ▼ {trainStyles.typeLabel} {t["odpt:destinationStation"]?.[0] ? getDestinationNameJa(t["odpt:destinationStation"][0]) + " 行" : "下り方面"}
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
});

StopBetweenRow.displayName = "StopBetweenRow";