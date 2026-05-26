import { FC, memo } from "react";
import { Flex, Box, Text } from "@chakra-ui/react";
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

interface StopHomeRowProps {
  station: {
    id: string;
    name: string;
    code: string;
  };
  upStationTrains: TramTrainData[];
  downStationTrains: TramTrainData[];
  styles: Record<string, any>;
  onTrainClick: (train: TramTrainData) => void;
  getDestinationNameJa: (idStr: unknown) => string;
}

export const StopHomeRow: FC<StopHomeRowProps> = memo(({
  station,
  upStationTrains,
  downStationTrains,
  styles,
  onTrainClick, // 列車クリック時のコールバック関数
  getDestinationNameJa, // 行先名取得関数
}) => {

  return (
    <Flex css={styles.stationRow}>

      {/* 【左側】上りのホーム */}
      <Flex css={styles.leftTrainTrack}>
        {upStationTrains.map((t) => {
          const trainStyles = getTrainStyles(t["odpt:trainType"] || "");
          return (
            <Box
              key={t["odpt:trainNumber"]}
              css={styles.stationLeftSide}
              // ★ クリックイベントとカーソルスタイル
              onClick={() => onTrainClick(t)}
              cursor="pointer"
              _hover={{ transform: "scale(1.02)", transition: "0.2s" }} // ちょっとしたホバー演出
              bg={trainStyles.bg}
              borderColor={trainStyles.borderColor}
              color={trainStyles.color}
            >
              <Text fontWeight="bold">▲ {trainStyles.typeLabel} {t["odpt:trainNumber"] || "不明"}</Text>
              <Text css={styles.destinationText} color={trainStyles.textColorSub}>
                {t["odpt:destinationStation"]?.[0]
                  ? `${getDestinationNameJa(t["odpt:destinationStation"][0])} 行`
                  : "三ノ輪方面"}
              </Text>
            </Box>
          );
        })}
      </Flex>

      {/* 【中央】線路・駅名ポチ */}
      <Flex css={styles.centerStationNode}>
        <Box css={styles.trackLine} /> 
        <Box css={styles.stationDot} />
        <Text css={styles.stationCode}>{station.code}</Text>
        <Text css={styles.stationName}>{station.name}</Text>
      </Flex>

      {/* 【右側】下りのホーム */}
      <Flex css={styles.rightTrainTrack}>
        {downStationTrains.map((t) => {
          const trainStyles = getTrainStyles(t["odpt:trainType"] || "");
          return (
            <Box
              key={t["odpt:trainNumber"]}
              css={styles.stationRightSide}
              // ★ クリックイベントとカーソルスタイル
              onClick={() => onTrainClick(t)}
              cursor="pointer"
              _hover={{ transform: "scale(1.02)", transition: "0.2s" }} // ちょっとしたホバー演出
              bg={trainStyles.bg}
              borderColor={trainStyles.borderColor}
              color={trainStyles.color}
            >
              <Text fontWeight="bold">▼ {trainStyles.typeLabel} {t["odpt:trainNumber"] || "不明"}</Text>
              <Text css={styles.destinationText} color={trainStyles.textColorSub}>
                {t["odpt:destinationStation"]?.[0]
                  ? `${getDestinationNameJa(t["odpt:destinationStation"][0])} 行`
                  : "早稲田方面"}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
});

StopHomeRow.displayName = "StopHomeRow";