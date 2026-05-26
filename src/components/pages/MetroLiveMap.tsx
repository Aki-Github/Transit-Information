import { FC, useEffect, useState, Fragment } from 'react';
import { Box, Flex, Text, Spinner, Badge } from '@chakra-ui/react';

// 1. 今のAPI（JSON-LD形式）に完全に合わせた厳密な型定義
interface LiveTrainData {
  "@id": string;
  "@type": string;
  "dc:date": string;
  "dct:valid": string;
  "odpt:trainNumber": string;       // 列車番号 (例: "01-023")
  "odpt:railway": string;           // 路線ID
  "odpt:direction": string;         // 進行方向 (Asakusa方面 または Shibuya方面)
  "odpt:fromStation": string | null; // 今いる駅、または直前に出た駅
  "odpt:toStation": string | null;   // 次に向かっている駅 (停車中は null)
  "odpt:delay"?: number;            // 遅延（秒）
}

// 銀座線の浅草〜渋谷の正確な駅IDリスト
const GINZA_STATIONS = [
  { id: "odpt.Station:TokyoMetro.Ginza.Asakusa", name: "浅草" },
  { id: "odpt.Station:TokyoMetro.Ginza.Tawaramachi", name: "田原町" },
  { id: "odpt.Station:TokyoMetro.Ginza.Inaricho", name: "稲荷町" },
  { id: "odpt.Station:TokyoMetro.Ginza.Ueno", name: "上野" },
  { id: "odpt.Station:TokyoMetro.Ginza.UenoHirokoji", name: "上野広小路" },
  { id: "odpt.Station:TokyoMetro.Ginza.Suehirocho", name: "末広町" },
  { id: "odpt.Station:TokyoMetro.Ginza.Kanda", name: "神田" },
  { id: "odpt.Station:TokyoMetro.Ginza.Mitsukoshimae", name: "三越前" },
  { id: "odpt.Station:TokyoMetro.Ginza.Nihombashi", name: "日本橋" },
  { id: "odpt.Station:TokyoMetro.Ginza.Kyobashi", name: "京橋" },
  { id: "odpt.Station:TokyoMetro.Ginza.Ginza", name: "銀座" },
  { id: "odpt.Station:TokyoMetro.Ginza.Shimbashi", name: "新橋" },
  { id: "odpt.Station:TokyoMetro.Ginza.Toranomon", name: "虎ノ門" },
  { id: "odpt.Station:TokyoMetro.Ginza.Tameikesanno", name: "溜池山王" },
  { id: "odpt.Station:TokyoMetro.Ginza.AkasakaMitsuke", name: "赤坂見附" },
  { id: "odpt.Station:TokyoMetro.Ginza.AoyamaItchome", name: "青山一丁目" },
  { id: "odpt.Station:TokyoMetro.Ginza.Gaiemmae", name: "外苑前" },
  { id: "odpt.Station:TokyoMetro.Ginza.Omotesando", name: "表参道" },
  { id: "odpt.Station:TokyoMetro.Ginza.Shibuya", name: "渋谷" },
];

export const MetroLiveMap: FC = () => {
  const [trains, setTrains] = useState<LiveTrainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainLocation = async () => {
      try {
        // 公共交通オープンデータセンターのAPIキー
        const API_KEY = process.env.REACT_APP_ODPT_KEY; 
        
        // v4の正しいエンドポイントURL
        const url = `https://api.odpt.org/api/v4/odpt:Train?odpt:railway=odpt.Railway:TokyoMetro.Ginza&acl:consumerKey=${API_KEY}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`APIエラー: ${res.status}`);
        
        const data: LiveTrainData[] = await res.json();
        setTrains(data);
        setError(null);
      } catch (e: any) {
        console.error("列車位置の取得失敗", e);
        setError(e.message || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainLocation();
    const interval = setInterval(fetchTrainLocation, 30000); // 30秒ごとに自動更新
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Flex p="6" justify="center"><Spinner color="orange.500" /> <Text ml="2">リアルタイム位置情報を取得中...</Text></Flex>;
  if (error) return <Text color="red.500" p="4">エラー: {error}</Text>;

  return (
    <Box p="4" bg="gray.950" color="white" borderRadius="xl" boxShadow="2xl">
      <Flex justify="between" align="center" mb="6" borderBottom="1px solid" borderColor="gray.800" pb="3">
        <Text fontWeight="extrabold" fontSize="md" color="orange.400">
          🚇 東京メトロ銀座線 列車在線位置 (ドコトレ風)
        </Text>
        <Badge colorPalette="white" variant="outline" fontSize="10px">30秒自動更新</Badge>
      </Flex>
      
      {/* 縦方向に駅を並べる（スクロール可能） */}
      <Flex direction="column" maxH="500px" overflowY="auto" px="4" py="2" position="relative">
        {GINZA_STATIONS.map((station, index) => {
          
          // ①【駅ホームに停車中】の列車をフィルタリング
          const trainsAtStation = trains.filter(
            t => t["odpt:fromStation"] === station.id && !t["odpt:toStation"]
          );

          // ②【この駅 と 次の駅の「間」を走行中】の列車をフィルタリング
          const nextStation = GINZA_STATIONS[index + 1];
          const trainsBetweenStations = nextStation 
            ? trains.filter(
                t => t["odpt:fromStation"] === station.id && t["odpt:toStation"] === nextStation.id
              )
            : [];

          return (
            <Fragment key={station.id}>
              
              {/* --- 駅セルのレンダリング --- */}
              <Flex align="center" h="48px" position="relative">
                {/* 左側：縦の線路 */}
                <Flex position="relative" w="40px" justify="center" align="center">
                  {/* 線路の縦線 */}
                  <Box position="absolute" top="0" bottom="0" w="3px" bg="orange.400" />
                  {/* 駅の丸ポチ */}
                  <Box w="4" h="4" borderRadius="full" bg="white" border="3px solid" borderColor="orange.500" zIndex="1" />
                </Flex>

                {/* 中央：駅名 */}
                <Text fontSize="sm" fontWeight="bold" w="120px" ml="3">
                  {station.name}
                </Text>

                {/* 右側：駅に停車中の列車アイコンを表示 */}
                <Flex gap="1" align="center">
                  {trainsAtStation.map(t => {
                    const isUp = t["odpt:direction"].includes("Asakusa");
                    return (
                      <Badge key={t["odpt:trainNumber"]} bg="orange.500" color="white" px="2" py="0.5" borderRadius="md" fontSize="11px">
                        {isUp ? "▲" : "▼"} {t["odpt:trainNumber"]} 停車
                      </Badge>
                    );
                  })}
                </Flex>
              </Flex>

              {/* --- 駅間のレンダリング (最後の駅の下には表示しない) --- */}
              {nextStation && (
                <Flex align="center" h="36px" position="relative" bg="gray.900/40">
                  {/* 左側：駅間の線路 */}
                  <Flex position="relative" w="40px" justify="center" align="center" h="100%">
                    <Box position="absolute" top="0" bottom="0" w="3px" bg="orange.400" />
                  </Flex>

                  {/* 右側：走行中の列車アイコンを表示 */}
                  <Box ml="123px">
                    {trainsBetweenStations.map(t => {
                      const isUp = t["odpt:direction"].includes("Asakusa"); // 浅草方面が上り
                      return (
                        <Badge key={t["odpt:trainNumber"]} variant="outline" colorPalette="orange" borderStyle="dashed" fontSize="10px">
                          {isUp ? "↑ 浅草行" : "↓ 渋谷行"} ({t["odpt:trainNumber"]})
                        </Badge>
                      );
                    })}
                  </Box>
                </Flex>
              )}

            </Fragment>
          );
        })}
      </Flex>
    </Box>
  );
};