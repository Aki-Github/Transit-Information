import { FC, memo, useEffect, useState, Fragment } from 'react';
import { Box, Flex, Text, Spinner, Badge, Heading, useSlotRecipe, Center } from '@chakra-ui/react';

import { liveMapRecipe } from "../../recipes/liveMapRecipe";
import { StopHomeRow } from '../../features/liveMap/StopHomeRow';
import { StopBetweenRow } from "../../features/liveMap/StopBetweenRow";
import { TramDetailModal } from '../../features/liveMap/TramDetailModal';
import { useFetchStations } from "../../../hooks/liveMap/useFetchStations";
import { useGetDestinationNameJa } from "../../../hooks/liveMap/useGetDestinationNameJa";

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

// 列車が「下り（西高島平方面）」かどうかを判定する鉄壁のロジック
const isUpTrain = (train: TramTrainData): boolean => {
  // const dir = train["odpt:direction"] || "";
  const dest = train["odpt:destinationStation"]?.[0] || "";

  // if (dir.includes("Oshiage")) return true;

  const downKeywords = [
    "Waseda",
  ];
  
  if (downKeywords.some(keyword => dest.includes(keyword))) {
    return false; 
  }
  return true; 
};

export const Arakawa: FC = memo(() => {
  const [trains, setTrains] = useState<TramTrainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ★ 選択された列車を管理するステート（null のときはモーダルが閉じる）
  const [selectedTrain, setSelectedTrain] = useState<TramTrainData | null>(null);

  const recipe = useSlotRecipe({ recipe: liveMapRecipe });
  const styles = recipe();
  const lineId = "Arakawa"; // 追加: 使用する路線IDを定義

  const { stations, loading: stationsLoading, error: stationsError } = useFetchStations(lineId);
  const { getDestinationNameJa, loading: destinationLoading, error: destinationError } = useGetDestinationNameJa(lineId);

  // ★ 列車クリック時のハンドラー
  const handleTrainClick = (train: TramTrainData) => {
    setSelectedTrain(train);
  };

  const fetchArakawaTrains = async () => {
    try {
      const API_KEY = process.env.REACT_APP_ODPT_KEY;
      const url = `https://api.odpt.org/api/v4/odpt:Train?odpt:railway=odpt.Railway:Toei.Arakawa&acl:consumerKey=${API_KEY}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
      const data: TramTrainData[] = await res.json();
      console.log("さくらトラムデータ:", data);
      
      // データが配列であることの確認ガード
      setTrains(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error("さくらトラムデータ取得失敗", e);
      setError("リアルタイムデータの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArakawaTrains();
    const interval = setInterval(fetchArakawaTrains, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading || stationsLoading || destinationLoading) {
    return (
      <Center h="100vh" bg="gray.950">
        <Spinner size="xl" color="rose.500" />
        <Text ml="4" color="white">さくらトラムナビ 読み込み中...</Text>
      </Center>
    );
  }

  if (error || stationsError || destinationError) {
    return <Text color="red.500" p="4">{error || stationsError || destinationError}</Text>;
  }

  return (
    <Box css={styles.container}>
      {/* ヘッダー */}
      <Flex css={styles.header}>
        <Box>
          <Heading size="md" css={styles.headerTitle}>
            <span>🚇</span> さくらトラム 列車運行ナビ
          </Heading>
          <Text css={styles.headerSubtitle}>
            ※20秒ごとに自動で位置が更新されます
          </Text>
        </Box>
        <Badge css={styles.headerBadge}>
          稼働中 ({trains.length}編成)
        </Badge>
      </Flex>

      {/* 線路メインコンテナ */}
      <Box css={styles.trackScrollArea}>
        {/* Supabaseから取得した stations 配列に差し替え */}
        {stations.map((station, index) => {
          
          // この駅のホームに停まっている列車を抽出
          const stationTrains = trains.filter(t => t["odpt:fromStation"] === station.id && !t["odpt:toStation"]);
          const upStationTrains = stationTrains.filter(t => isUpTrain(t));
          const downStationTrains = stationTrains.filter(t => !isUpTrain(t));

          // 次の駅の取得ロジックも、配列が stations に変わるだけ
          const nextStation = stations[index + 1];

          const betweenTrains = nextStation
            ? trains.filter(t => t["odpt:fromStation"] === station.id && t["odpt:toStation"] === nextStation.id)
            : [];
            
          const upBetweenTrains = betweenTrains.filter(t => isUpTrain(t));
          const downBetweenTrains = betweenTrains.filter(t => !isUpTrain(t));

          return (
            <Fragment key={station.id}>
              
              {/* 🚉 駅ホームセル */}
              <StopHomeRow
                station={station}
                upStationTrains={upStationTrains}
                downStationTrains={downStationTrains}
                styles={styles}
                onTrainClick={handleTrainClick}
                getDestinationNameJa={getDestinationNameJa}
              />

              {/* 🛣️ 駅間（走行中）セル */}
              {nextStation && (
                <StopBetweenRow
                  upBetweenTrains={upBetweenTrains}
                  downBetweenTrains={downBetweenTrains}
                  styles={styles}
                  onTrainClick={handleTrainClick}
                  getDestinationNameJa={getDestinationNameJa}
                />
              )}
            </Fragment>
          );
        })}
      </Box>

      {/* モーダルコンポーネントを配置 */}
      <TramDetailModal  
        train={selectedTrain} 
        isOpen={selectedTrain !== null} 
        styles={styles}
        onClose={() => setSelectedTrain(null)} 
        getDestinationNameJa={getDestinationNameJa} // ★行先名取得関数を渡す
      />
    </Box>
  );
});