import { FC, memo, useEffect, useState, Fragment } from 'react';
import { Box, Flex, Text, Spinner, Badge, Heading, useSlotRecipe, Center, Grid } from '@chakra-ui/react';

import { liveMapRecipe } from "../../recipes/liveMapRecipe";
import { StationHomeRow } from "../../features/liveMap/StationHomeRow";
import { StationBetweenRow } from "../../features/liveMap/StationBetweenRow";
import { TrainDetailModal } from "../../features/liveMap/TrainDetailModal";
import { useFetchStations } from "../../../hooks/liveMap/useFetchStations";
import { useGetDestinationNameJa } from "../../../hooks/liveMap/useGetDestinationNameJa";

interface ToeiTrainData {
  "@id": string;
  "odpt:trainNumber": string;
  "odpt:trainType": string; // 種別（odpt.TrainType:Toei.Express など）
  "odpt:direction": string; // 進行方向ID
  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;
  "odpt:destinationStation"?: string[]; // 行先駅IDの配列
  "odpt:delay"?: number;
}

// 列車が「下り（西高島平方面）」かどうかを判定する鉄壁のロジック
const isUpTrain = (train: ToeiTrainData): boolean => {
  const dir = train["odpt:direction"] || "";
  const dest = train["odpt:destinationStation"]?.[0] || "";

  if (dir.includes("Inbound") || dir.includes("Tochomae")) return true;

  const downKeywords = [
    "Hikarigaoka",
  ];
  
  if (downKeywords.some(keyword => dest.includes(keyword))) {
    return true; 
  }
  return false; 
};

// 列車が「都庁前」にいる場合の補正ロジック
const adjustStationId = (stationId: string, train: ToeiTrainData) => {
  if (stationId === "odpt.Station:Toei.Oedo.Tocho-mae") {
    // 列車の前駅または次駅が「西新宿五丁目(E-29)」または「新宿(E-01)」なら 放射部の都庁前
    if (train["odpt:fromStation"]?.includes("NishiShinjukuGochome") || 
        train["odpt:toStation"]?.includes("NishiShinjukuGochome")) {
      return "odpt.Station:Toei.Oedo.Tocho-mae.Radiant";
    }
    // それ以外（新宿西口(E-27)側からの一周の終わり）なら 環状部の都庁前
    return "odpt.Station:Toei.Oedo.Tocho-mae.Loop";
  }
  return stationId;
};

export const Oedo: FC = memo(() => {
  const [trains, setTrains] = useState<ToeiTrainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ★ 選択された列車を管理するステート（null のときはモーダルが閉じる）
  const [selectedTrain, setSelectedTrain] = useState<ToeiTrainData | null>(null);

  const recipe = useSlotRecipe({ recipe: liveMapRecipe });
  const styles = recipe();
  const lineId = "Oedo"; // 追加: 使用する路線IDを定義

  const { stations, loading: stationsLoading, error: stationsError } = useFetchStations(lineId);
  const { getDestinationNameJa, loading: destinationLoading, error: destinationError } = useGetDestinationNameJa(lineId);

  // ★ 列車クリック時のハンドラー
  const handleTrainClick = (train: ToeiTrainData) => {
    setSelectedTrain(train);
  };

  const fetchOedoTrains = async () => {
    try {
      const API_KEY = process.env.REACT_APP_ODPT_KEY;
      const url = `https://api.odpt.org/api/v4/odpt:Train?odpt:railway=odpt.Railway:Toei.Oedo&acl:consumerKey=${API_KEY}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
      const data: ToeiTrainData[] = await res.json();
      console.log("大江戸線データ:", data);
      
      // データが配列であることの確認ガード
      setTrains(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      console.error("大江戸線データ取得失敗", e);
      setError("リアルタイムデータの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOedoTrains();
    const interval = setInterval(fetchOedoTrains, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading || stationsLoading || destinationLoading) {
    return (
      <Center h="100vh" bg="gray.950">
        <Spinner size="xl" color="rose.500" />
        <Text ml="4" color="white">大江戸線ナビ 読み込み中...</Text>
      </Center>
    );
  }

  if (error || stationsError || destinationError) {
    return <Text color="red.500" p="4">{error || stationsError || destinationError}</Text>;
  }

  // 生の全列車データを一括で補正
  const adjustedTrains = trains.map(t => ({
    ...t,
    "odpt:fromStation": t["odpt:fromStation"] ? adjustStationId(t["odpt:fromStation"], t) : null,
    "odpt:toStation": t["odpt:toStation"] ? adjustStationId(t["odpt:toStation"], t) : null,
  }));

  // Supabaseから来た39駅を「放射部」と「環状部」に分離
  // sort_order 1〜11 = 光が丘〜都庁前(放射部終点)
  const radiantStations = stations.filter(s => s.sort_order <= 11);
  // sort_order 12〜39 = 新宿〜都庁前(環状部終点)
  const loopStations = stations.filter(s => s.sort_order >= 12);

  // 🛠️ リストレンダリング用の共通関数（引数に渡された駅リストを縦に描画する）
  const renderTrackColumn = (targetStations: typeof stations) => {
    return targetStations.map((station, index) => {
      const stationTrains = adjustedTrains.filter(t => t["odpt:fromStation"] === station.id && !t["odpt:toStation"]);
      const upStationTrains = stationTrains.filter(t => isUpTrain(t));
      const downStationTrains = stationTrains.filter(t => !isUpTrain(t));

      // このカラム内での「次の駅」
      const nextStation = targetStations[index + 1];

      const betweenTrains = nextStation
        ? adjustedTrains.filter(t => t["odpt:fromStation"] === station.id && t["odpt:toStation"] === nextStation.id)
        : [];
      const upBetweenTrains = betweenTrains.filter(t => isUpTrain(t));
      const downBetweenTrains = betweenTrains.filter(t => !isUpTrain(t));

      return (
        <Fragment key={station.id}>
          <StationHomeRow
            station={station}
            lineId={lineId}
            upStationTrains={upStationTrains}
            downStationTrains={downStationTrains}
            styles={styles}
            onTrainClick={handleTrainClick}
            getDestinationNameJa={getDestinationNameJa}
          />
          {nextStation && (
            <StationBetweenRow
              lineId={lineId}
              upBetweenTrains={upBetweenTrains}
              downBetweenTrains={downBetweenTrains}
              styles={styles}
              onTrainClick={handleTrainClick}
              getDestinationNameJa={getDestinationNameJa}
            />
          )}
        </Fragment>
      );
    });
  };

  return (
    <Box css={styles.container}>
      {/* ヘッダー */}
      <Flex css={styles.header}>
        <Box>
          <Heading size="md" css={styles.headerTitle}>
            <span>🚇</span> 都営大江戸線 列車運行ナビ
          </Heading>
          <Text css={styles.headerSubtitle}>
            ※20秒ごとに自動で位置が更新されます
          </Text>
        </Box>
        <Badge css={styles.headerBadge}>
          稼働中 ({trains.length}編成)
        </Badge>
      </Flex>

      {/* 2カラムレイアウトエリア */}
      <Grid 
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }} // PC時は横並び2列、スマホ時は縦に2つ並ぶ
        gap="8" 
        p="4" 
        height="calc(100vh - 80px)" 
        overflow="hidden"
      >
        {/* 【左カラム】放射部 (光が丘 〜 都庁前) */}
        <Flex direction="column" height="100%">
          <Box css={styles.headerTrack2Columns}>
            <Text css={styles.headerTitle2Columns}>📐 放射部（光が丘 〜 都庁前）</Text>
          </Box>
          <Box css={styles.trackScrollArea2Columns}>
            {renderTrackColumn(radiantStations)}
          </Box>
        </Flex>

        {/* 【右カラム】環状部 (新宿 〜 飯田橋 〜 都庁前) */}
        <Flex direction="column" height="100%">
          <Box css={styles.headerTrack2Columns}>
            <Text css={styles.headerTitle2Columns}>🔄 環状部（新宿 〜 六本木 〜 大門 〜 春日 〜 都庁前）</Text>
          </Box>
          <Box css={styles.trackScrollArea2Columns}>
            {renderTrackColumn(loopStations)}
          </Box>
        </Flex>
      </Grid>

      {/* 詳細モーダル */}
      <TrainDetailModal  
        train={selectedTrain} 
        isOpen={selectedTrain !== null} 
        styles={styles}
        onClose={() => setSelectedTrain(null)} 
        getDestinationNameJa={getDestinationNameJa}
      />
    </Box>
  );
});