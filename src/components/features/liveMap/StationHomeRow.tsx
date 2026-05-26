import { FC, memo } from "react";
import { Flex, Box, Text } from "@chakra-ui/react";
import { getTrainStyles } from "../../../hooks/liveMap/useGetTrainStyles";

// 型定義
interface ToeiTrainData {
  "@id": string;
  "odpt:trainNumber": string;
  "odpt:trainType": string;
  "odpt:direction": string;
  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;
  "odpt:destinationStation"?: string[];
  "odpt:delay"?: number;
}

interface StationHomeRowProps {
  station: {
    id: string;
    name: string;
    code: string;
  };
  lineId: string; // 追加: 路線IDを受け取る
  upStationTrains: ToeiTrainData[];
  downStationTrains: ToeiTrainData[];
  styles: Record<string, any>;
  onTrainClick: (train: ToeiTrainData) => void;
  getDestinationNameJa: (idStr: unknown) => string;
}

export const StationHomeRow: FC<StationHomeRowProps> = memo(({
  station,
  lineId,
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
                  : lineId === "Asakusa" ? "西馬込方面" : 
                    lineId === "Mita" ? "目黒方面" : 
                    lineId === "Shinjuku" ? "新宿方面" : 
                    lineId === "Oedo" ? "光が丘方面" : 
                    "上り方面"}
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
                  : lineId === "Asakusa" ? "押上方面" : 
                    lineId === "Mita" ? "西高島平方面" : 
                    lineId === "Shinjuku" ? "本八幡方面" : 
                    lineId === "Oedo" ? "都庁前方面" : 
                    "下り方面"}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
});

StationHomeRow.displayName = "StationHomeRow";