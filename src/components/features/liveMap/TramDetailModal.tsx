import { FC } from "react";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogCloseTrigger,
  VStack,
  HStack,
  Text,
  Badge,
  Separator,
  Portal,
  Center,
  Spinner,
  Flex,
  Box
} from "@chakra-ui/react";
import { getTrainStyles } from "../../../hooks/liveMap/useGetTrainStyles";
import { useFetchDepartureTime } from "../../../hooks/liveMap/useFetchDepartureTime";
import { useFetchTrainRoute } from "../../../hooks/liveMap/useFetchTrainRoute";

// 列車データの型定義
interface TramTrainData {
  "@id": string;
  "odpt:trainNumber": string;
  "odpt:trainType": string;
  "odpt:railDirection": string;
  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;
  "odpt:destinationStation"?: string[];
  "odpt:originStation"?: string[];
  "odpt:delay"?: number;
  "dct:valid"?: string; // データ生成時刻 ("2026-05-25T16:26:30+09:00" など)
}

interface TramDetailModalProps {
  train: TramTrainData | null;
  isOpen: boolean;
  styles: Record<string, any>;
  onClose: () => void;
  getDestinationNameJa: (idStr: unknown) => string;
}

// ISO 8601 形式の文字列を 「16:26:30」 のような時分秒のフォーマットに変換する関数
const formatTime = (isoString?: string): string => {
  if (!isoString) return "--:--:--";
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return "--:--:--";
  }
};

export const TramDetailModal: FC<TramDetailModalProps> = ({ train, isOpen, styles, onClose, getDestinationNameJa }) => {
  const currentTrain = train;
  const trainStyles = currentTrain ? getTrainStyles(currentTrain["odpt:trainType"] || "") : null;
  const delay = currentTrain ? (currentTrain["odpt:delay"] || 0) : 0;

  // 今タップされている駅IDと列車番号を渡して、Supabaseから出発時刻を取得する
  const { stationName, loading: timeLoading } = useFetchDepartureTime({
    stationId: currentTrain ? currentTrain["odpt:destinationStation"]?.[0] || null : null,
    trainNumber: currentTrain ? currentTrain["odpt:trainNumber"] : null,
    isOpen: isOpen
  });

  // 新しいルート取得フックに切り替え
  const { 
    currentStation,
    nextStation, 
    nextNextStation, 
    threeNextStation,
    terminalStation, 
    loading: routeLoading 
  } = useFetchTrainRoute({
    currentStationId: currentTrain ? currentTrain["odpt:fromStation"] : null,
    trainNumber: currentTrain ? currentTrain["odpt:trainNumber"] : null,
    isOpen: isOpen
  });

  if (timeLoading || routeLoading) {
    return (
      <Center h="100vh" bg="gray.950">
        <Spinner size="xl" color="rose.500" />
        <Text ml="4" color="white">時刻表 読み込み中...</Text>
      </Center>
    );
  }

  // 駅IDから読みやすい名前に変換する関数
  const formatStationName = (stationId?: string) => {
    if (!stationId) return "不明";
    // 例: odpt.Station:Toei.Asakusa.NishiMagome -> 西馬込
    return getDestinationNameJa(stationId); 
  };

  return (
    <DialogRoot 
      open={isOpen} 
      onOpenChange={(e) => {
        // e.open が false（閉じられた時）に親の onClose を呼ぶ
        if (!e.open) {
          onClose();
        }
      }}
      motionPreset="slide-in-bottom"
    >
      {/* Portal を挟むことで、スクロール領域から強制的に脱出させます */}
      <Portal>
        {/* ダイアログのコンテンツ領域（データがある時だけ中身を描画するガードをここに設ける） */}
        {currentTrain && trainStyles && (
            <DialogContent {...styles.dialogContent} >
            <DialogCloseTrigger color="gray.400" _hover={{ color: "white" }} />
            
            <DialogHeader pb="2">
                <HStack gap="3">
                <Badge bg={trainStyles.bg} color={trainStyles.color} border="1px solid" borderColor={trainStyles.borderColor} size="lg">
                    {trainStyles.typeLabel}
                </Badge>
                <DialogTitle {...styles.dialogTitle}>
                    列車番号: {currentTrain["odpt:trainNumber"]}
                </DialogTitle>
                </HStack>
            </DialogHeader>

            <Separator borderColor="whiteAlpha.200" my="2" />

            <DialogBody>
                <VStack gap="4" align="stretch" py="2">
                <HStack justify="space-between">
                    <Text {...styles.dialogSubtitle}>行先</Text>
                    <Text fontWeight="bold" fontSize="md">
                    {currentTrain["odpt:destinationStation"]?.[0] 
                        ? `${formatStationName(currentTrain["odpt:destinationStation"][0])} 行` 
                        : "不明"}
                    </Text>
                </HStack>

                <HStack justify="space-between">
                    <Text {...styles.dialogSubtitle}>始発駅</Text>
                    <Text fontSize="md">
                    {currentTrain["odpt:originStation"]?.[0] 
                        ? formatStationName(currentTrain["odpt:originStation"][0]) 
                        : "不明"}
                    </Text>
                </HStack>

                <HStack justify="space-between">
                    <Text {...styles.dialogSubtitle}>現在の位置</Text>
                    <Text fontSize="sm" color="rose.300">
                    {currentTrain["odpt:toStation"] 
                      ? (
                          // 🛑 駅間（走行中）にいる場合
                          `${formatStationName(currentTrain["odpt:fromStation"] || "")} ➔ ${formatStationName(currentTrain["odpt:toStation"])} 間`
                        )
                      : (
                          // 🚉 駅ホーム（構内）に停まっている場合
                          currentStation 
                            ? `${formatStationName(currentTrain["odpt:fromStation"] || "")}（${currentStation.departureTime}発） 駅構内` // 時刻があればドッキング！
                            : `${formatStationName(currentTrain["odpt:fromStation"] || "")} 駅構内`
                        )
                    }
                    </Text>
                </HStack>

                <HStack justify="space-between">
                    <Text {...styles.dialogSubtitle}>遅延</Text>
                    {delay > 0 ? (
                    <Badge colorPalette="red" variant="solid" animation="pulse 2s infinite">
                        遅れ {Math.floor(delay / 60)} 分
                    </Badge>
                    ) : (
                    <Badge colorPalette="green" variant="subtle">
                        平常運転
                    </Badge>
                    )}
                </HStack>

                {/* 🚅 今後の停車駅スケジュール */}
                {!routeLoading && (nextStation || terminalStation) && (
                  <Box mt="6" p="4" bg="gray.950" borderRadius="md" border="1px solid" borderColor="gray.850">
                    <Text fontSize="xs" fontWeight="bold" color="teal.300" mb="3">
                      📌 今後の停車駅スケジュール
                    </Text>
                    
                    <VStack align="stretch" gap="3" position="relative">
                      {/* 次の駅 */}
                      {nextStation && (
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.200">
                            次：{formatStationName(nextStation.stationId)}
                          </Text>
                          <Text fontSize="sm" color="gray.400" fontFamily="mono">
                            {nextStation.departureTime}着
                          </Text>
                        </Flex>
                      )}

                      {/* その次の駅 */}
                      {nextNextStation && (
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.400">
                            次々：{formatStationName(nextNextStation.stationId)}
                          </Text>
                          <Text fontSize="sm" color="gray.500" fontFamily="mono">
                            {nextNextStation.departureTime}着
                          </Text>
                        </Flex>
                      )}

                      {/* 3つ先の駅 */}
                      {threeNextStation && (
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.400">
                            3つ先：{formatStationName(threeNextStation.stationId)}
                          </Text>
                          <Text fontSize="sm" color="gray.500" fontFamily="mono">
                            {threeNextStation.departureTime}着
                          </Text>
                        </Flex>
                      )}

                      {/* 終点（目的地） */}
                      {(terminalStation && stationName) && (
                        <Flex justify="space-between" align="center" pt="2" borderTop="1px dashed" borderColor="gray.800">
                          <Text fontSize="sm" fontWeight="bold" color="rose.300">
                            終点：{stationName || "不明"}
                          </Text>
                          <Text fontSize="sm" fontWeight="bold" color="rose.300" fontFamily="mono">
                            {terminalStation.departureTime}頃着
                          </Text>
                        </Flex>
                      )}
                    </VStack>
                  </Box>
                )}

                {/* 追加：データ更新時刻の表示セクション */}
                <Separator borderColor="whiteAlpha.100" my="1" />
                <HStack justify="space-between" pt="1">
                    <Text color="gray.500" fontSize="12px">情報更新時刻（公式配信）</Text>
                    <Text color="gray.400" fontSize="12px" fontFamily="mono">
                      {formatTime(currentTrain["dct:valid"])}
                    </Text>
                </HStack>
                </VStack>
            </DialogBody>
            </DialogContent>
        )}
      </Portal>
    </DialogRoot>
  );
};