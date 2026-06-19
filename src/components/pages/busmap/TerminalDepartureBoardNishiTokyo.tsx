import { FC, memo, useState } from 'react';
import { useSlotRecipe, Box, Flex, Grid, Text, Heading, Badge, Spinner, Button, HStack } from '@chakra-ui/react';

import { useBusPoleTimeTable } from '../../../hooks/bus/useBusPoleTimeTable';
import { departureBoardRecipe } from '../../recipes/departureBoardRecipe';

// ==========================================
// 🎨 マスター定義
// ==========================================
// LEDテキストの共通ベーススタイル
const LED_TEXT_BASE = {
  fontFamily: '"DotGothic16", "Courier New", monospace',
  fontWeight: 'bold',
  letterSpacing: '1px',
};

const boardStyles = {
  // --- 既存のレシピ（そのまま残す） ---
  ledOrange: { ...LED_TEXT_BASE, color: '#FF9900', textShadow: '0 0 4px #FF9900' },
  ledGreen:  { ...LED_TEXT_BASE, color: '#33FF00', textShadow: '0 0 4px #33FF00' },
  ledRed:    { ...LED_TEXT_BASE, color: '#FF3300', textShadow: '0 0 4px #FF3300' },
  selectField: {
    backgroundColor: '#2D3748',
    color: 'white',
    border: '1px solid #4A5568',
    borderRadius: '6px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    fontSize: '16px',
  }
};

// 🟢 西東京バス専用の対象駅マスタ（路線の壁をなくし、ここに集約）
const NISHITOKYO_STATIONS: StationOption[] = [
  { station_name: '八王子', lat: 35.655491, lon: 139.338998 },
  { station_name: '京王八王子', lat: 35.657731, lon: 139.343360 },
  { station_name: '高尾', lat: 35.642026, lon: 139.282255 },
  { station_name: '拝島', lat: 35.721085, lon: 139.343603 },
  { station_name: '秋川', lat: 35.728151, lon: 139.286377 },
  { station_name: '武蔵五日市', lat: 35.732321, lon: 139.222719 },
  { station_name: '青梅', lat: 35.790518, lon: 139.257930 },
  { station_name: '河辺', lat: 35.784617, lon: 139.284242 },
  { station_name: '福生', lat: 35.742398, lon: 139.327917 },
  { station_name: '日野', lat: 35.679103, lon: 139.394200 },
];

const operator: string = 'odpt.Operator:NishiTokyoBus';

// ==========================================
// 📋 型定義
// ==========================================
interface StationOption { station_name: string; lat: number; lon: number; }
interface Trip { time: string; route: string; destination: string; isApproaching: boolean; status: string; }
interface Platform { platformName: string; trips: Trip[]; }
interface UseBusPoleTimeTableReturn {
  terminalBoards: Platform[];
  loading: boolean;
  errorMessage?: string | null;
  searchByCoordinates: (lat: number, lon: number) => Promise<void>;
}

// ==========================================
// 🚀 コンポーネント本体
// ==========================================
export const TerminalDepartureBoardNishiTokyo: FC = memo(() => {
  // フックから座標更新関数（searchByCoordinates）も追加で受け取る
  // 💡 初期表示は「八王子駅 (インデックス0)」の座標をセット
  const { terminalBoards, loading, errorMessage, searchByCoordinates } : UseBusPoleTimeTableReturn = 
    useBusPoleTimeTable([NISHITOKYO_STATIONS[0].lat, NISHITOKYO_STATIONS[0].lon], operator);

  // 選択中の駅インデックス（初期値は "0" = 八王子駅）
  const [selectedStationIndex, setSelectedStationIndex] = useState<string>('0');

  // v3の slotRecipe からスタイルマップを展開
  const departureRecipe = useSlotRecipe({ key: "departureBoard", recipe: departureBoardRecipe });
  const departureStyles = departureRecipe() as Record<string, any>;

  // ボタン押下時に、選択された駅の座標でフックの検索を実行
  const handleStationChange = async () => {
    const index = parseInt(selectedStationIndex, 10);
    if (NISHITOKYO_STATIONS[index]) {
      const target = NISHITOKYO_STATIONS[index];
      console.log(`駅を切り替えます: ${target.station_name}駅 (${target.lat}, ${target.lon})`);
      await searchByCoordinates(target.lat, target.lon);
    }
  };

  // 💡 安全対策ガードをローディング判定より上に移動させておきます
  const safeTerminalBoards = Array.isArray(terminalBoards) ? terminalBoards : [];

  // 🟢 バスのリアルタイム情報が初回取得できるまではローディングを出す
  if (loading && safeTerminalBoards.length === 0) {
    return (
      <Flex justify="center" align="center" p="10" h="400px" direction="column" gap="4">
        <Spinner size="lg" color="red.500" />
        <Text ml="4" fontSize="md" color="gray.300" fontWeight="bold">
          バスのリアルタイム運行データを読み込み中...
        </Text>
      </Flex>
    );
  }

  if (errorMessage) {
    return <Text color="red.500" p="5">{errorMessage}</Text>;
  }

  // 表示中の駅名を取得
  const currentStationName = `${NISHITOKYO_STATIONS[parseInt(selectedStationIndex, 10)]?.station_name}駅周辺`;

  return (
    <Box maxW="1000px" mx="auto" p="5">
      
      {/* 🟢 シンプルになった操作パネル */}
      <Box {...departureStyles.controlPanel}>
        <Text {...departureStyles.controlPanelTitle}>
          表示エリア切り替え（駅選択）
        </Text>
        <HStack gap="4">
          
          {/* 駅名セレクト（これ1つだけに集約） */}
          <select
            value={selectedStationIndex}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStationIndex(e.target.value)}
            style={{ 
              ...boardStyles.selectField, 
              maxWidth: '300px',
            }}
          >
            {NISHITOKYO_STATIONS.map((st, idx) => (
              <option key={idx} value={idx} {...departureStyles.controlBox}>
                {st.station_name}駅
              </option>
            ))}
          </select>
          
          <Button 
            colorScheme="red"
            onClick={handleStationChange}
            loading={loading}
            loadingText="切替中"
            px="6"
          >
            掲示板を切り替え
          </Button>
        </HStack>
      </Box>

      {/* 電光掲示板本体 */}
      <Box {...departureStyles.boardContainer}>
        {/* ローディングオーバーレイ（切り替え中のうっすら暗くなる演出） */}
        {loading && (
          <Flex {...departureStyles.loadingOverlay}>
            <Spinner size="xl" color="green.500" />
            <Text ml="4" fontWeight="bold" color="green.400">データを更新中...</Text>
          </Flex>
        )}

        {/* 掲示板ヘッダー */}
        <Flex {...departureStyles.boardHeader}>
          <Heading size="md" letterSpacing="2px" color="#EF2127">
            🔵 {currentStationName} 西東京バス 発車案内板
          </Heading>
          <Text style={boardStyles.ledGreen} fontSize="md">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Flex>

        {/* のりば一覧グリッド */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="5">
          {safeTerminalBoards.length > 0 ? (
            safeTerminalBoards.map((platform, idx) => (
              <Box key={idx} {...departureStyles.platformCardNishiTokyo}>
                
                {/* のりばタイトル */}
                <Flex {...departureStyles.platformHeaderNishiTokyo}>
                  <Text {...departureStyles.platformTitle}>
                    🚏 {platform.platformName}
                  </Text>
                  <Badge {...departureStyles.platformBadgeNishiTokyo}>
                    先発・次発
                  </Badge>
                </Flex>

                {/* 運行スケジュール */}
                <Box p="2">
                  {platform.trips.map((trip, tIdx) => (
                    <Flex 
                      key={tIdx} align="center" justify="space-between" py="2" 
                      borderBottom="1px solid #222" _last={{ borderBottom: "none" }}
                    >
                      <Flex align="center" flex="1" gap="3">
                        <Text style={boardStyles.ledOrange} fontSize="md">
                          {trip.time}
                        </Text>
                        <Text style={boardStyles.ledGreen} fontSize="sm" minW="60px">
                          [{trip.route}]
                        </Text>
                        <Text style={boardStyles.ledOrange} fontSize="md" truncate maxW="150px">
                          {trip.destination}
                        </Text>
                      </Flex>

                      {/* ステータス */}
                      <Box textAlign="right" minW="90px">
                        <Text style={trip.isApproaching ? boardStyles.ledRed : boardStyles.ledGreen} fontSize="sm">
                          {trip.status}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </Box>
              </Box>
            ))
          ) : (
            <Text p="5" color="gray.500" gridColumn="1/-1" textAlign="center">
              範囲内に直近で発車するバスが見つかりませんでした。
            </Text>
          )}
        </Grid>
      </Box>
    </Box>
  );
});