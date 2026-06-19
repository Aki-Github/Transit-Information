import { FC, memo, useEffect, useState } from 'react';
import { useSlotRecipe, Box, Flex, Grid, Text, Heading, Badge, Spinner, Button, HStack } from '@chakra-ui/react';

import { useBusPoleTimeTable } from '../../../hooks/bus/useBusPoleTimeTable';
import { departureBoardRecipe } from '../../recipes/departureBoardRecipe';
import { supabase } from '../../../lib/supabaseClient';

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

const LINE_OPTIONS: LineOption[] = [
  { line_cd: '11301', line_name: 'JR東海道線' },
  { line_cd: '11302', line_name: 'JR山手線' },
  { line_cd: '11313', line_name: 'JR中央・総武線' },
  { line_cd: '11314', line_name: 'JR総武快速線' },
  { line_cd: '11319', line_name: 'JR上野東京ライン' },
  { line_cd: '11320', line_name: 'JR常磐線' },
  { line_cd: '11332', line_name: 'JR京浜東北線' },
  { line_cd: '21002', line_name: '東武伊勢崎線' },
  { line_cd: '23001', line_name: '京成本線' },
  { line_cd: '23002', line_name: '京成押上線' },
  { line_cd: '28001', line_name: '東京メトロ銀座線' },
  { line_cd: '28002', line_name: '東京メトロ丸の内線' },
  { line_cd: '28003', line_name: '東京メトロ日比谷線' },
  { line_cd: '28004', line_name: '東京メトロ東西線' },
  { line_cd: '28005', line_name: '東京メトロ千代田線' },
  { line_cd: '28006', line_name: '東京メトロ有楽町線' },
  { line_cd: '28008', line_name: '東京メトロ半蔵門線' },
  { line_cd: '28009', line_name: '東京メトロ南北線' },
  { line_cd: '28010', line_name: '東京メトロ副都心線' },
  { line_cd: '99301', line_name: '都営大江戸線' },
  { line_cd: '99302', line_name: '都営浅草線' },
  { line_cd: '99303', line_name: '都営三田線' },
  { line_cd: '99304', line_name: '都営新宿線' },
  { line_cd: '99305', line_name: '東京さくらトラム' },
  { line_cd: '99309', line_name: 'つくばエクスプレス' },
  { line_cd: '99311', line_name: 'ゆりかもめ' },
  { line_cd: '99336', line_name: '東京モノレール' },
  { line_cd: '99337', line_name: 'りんかい線' },
  { line_cd: '99342', line_name: '日暮里・舎人ライナー' },
  { line_cd: '11315', line_name: 'JR青梅線' },
];

const operator: string = 'odpt.Operator:Toei';

// ==========================================
// 📋 型定義
// ==========================================
interface LineOption { line_cd: string; line_name: string; }
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
export const TerminalDepartureBoardToei: FC = memo(() => {
  // フックから座標更新関数（searchByCoordinates）も追加で受け取る
  const { terminalBoards, loading, errorMessage, searchByCoordinates } : UseBusPoleTimeTableReturn = useBusPoleTimeTable([35.6812, 139.7671], operator);

  // 選択中の路線コード (初期値は東海道線)
  const [selectedLineCd, setSelectedLineCd] = useState<string>('11301');
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedStationIndex, setSelectedStationIndex] = useState<string>('0');
  const [stationLoading, setStationLoading] = useState<boolean>(true);

  // 🛠️ 修正1: v3の slotRecipe からスタイルマップを展開
  const departureRecipe = useSlotRecipe({ key: "departureBoard", recipe: departureBoardRecipe });
  const departureStyles = departureRecipe() as Record<string, any>;

  //  選択された路線（selectedLineCd）が変わるたびに Supabase から駅を再取得
  useEffect(() => {
    const fetchStationsByLine = async () => {
      try {
        setStationLoading(true);
        
        // selectedLineCd に完全一致する駅だけを取得
        const { data, error } = await supabase
          .from('station_locations')
          .select('station_name, lat, lon')
          .eq('line_cd', selectedLineCd) 
          .eq('pref_cd', 13) // 東京都内の駅に絞る（必要に応じて変更）
          .order('station_cd', { ascending: true });

        if (error) throw error;

        if (data) {
          // 駅名の重複排除
          const uniqueStations: StationOption[] = [];
          const seen = new Set();
          
          data.forEach((item: any) => {
            if (!seen.has(item.station_name)) {
              seen.add(item.station_name);
              uniqueStations.push({
                station_name: item.station_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
              });
            }
          });

          setStations(uniqueStations);
          setSelectedStationIndex('0'); // 💡 路線が変わったら駅の選択肢を先頭（0番目）にリセット
        }
      } catch (err) {
        console.error("駅リストの取得に失敗しました:", err);
      } finally {
        setStationLoading(false);
      }
    };

    fetchStationsByLine();
  }, [selectedLineCd]); // 🟢 selectedLineCd が変わるたびに発火する

  // ボタン押下時に、選択された駅の座標でフックの検索を実行
  const handleStationChange = async () => {
    const index = parseInt(selectedStationIndex, 10);
    if (stations[index]) {
      const target = stations[index];
      console.log(`駅を切り替えます: ${target.station_name} (${target.lat}, ${target.lon})`);

      // カスタムフック側の座標を上書きして再フェッチを走らせる
      await searchByCoordinates(target.lat, target.lon);
    }
  };

  if (stationLoading) {
    return (
      <Flex justify="center" align="center" p="10">
        <Spinner size="lg" color="blue.500" />
        <Text ml="4">マスターデータを読み込み中...</Text>
      </Flex>
    );
  }

  if (errorMessage) {
    return <Text color="red.500" p="5">{errorMessage}</Text>;
  }

  // 表示中の駅名を取得
  const currentStationName = `${stations[parseInt(selectedStationIndex, 10)]?.station_name}駅周辺` || "東京駅周辺";

  // クラッシュ防止ガード（安全対策）
  const safeTerminalBoards = Array.isArray(terminalBoards) ? terminalBoards : [];

  return (
    <Box maxW="1000px" mx="auto" p="5">
      
      {/* 路線×駅の2連動・操作パネル */}
      <Box {...departureStyles.controlPanel}>
        <Text {...departureStyles.controlPanelTitle}>
          表示エリア切り替え（路線・駅選択）
        </Text>
        <HStack gap="4">
          
          {/* 路線名セレクト */}
          <select
            value={selectedLineCd}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLineCd(e.target.value)}
            style={{ 
              ...boardStyles.selectField, 
              maxWidth: '250px'
            }}
          >
            {LINE_OPTIONS.map((line) => (
              <option key={line.line_cd} value={line.line_cd} {...departureStyles.controlBox}>
                {line.line_name}
              </option>
            ))}
          </select>

          {/* 駅名セレクト */}
          <select
            value={selectedStationIndex}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStationIndex(e.target.value)}
            disabled={stationLoading || stations.length === 0}
            style={{ 
              ...boardStyles.selectField, 
              maxWidth: '250px',
              backgroundColor: stationLoading ? '#1A202C' : '#2D3748',
              color: stationLoading ? '#718096' : 'white',
              cursor: stationLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {stationLoading ? (
              <option>駅データを読込中...</option>
            ) : stations.length > 0 ? (
              stations.map((st, idx) => (
                <option key={idx} value={idx} {...departureStyles.controlBox}>
                  {st.station_name}駅
                </option>
              ))
            ) : (
              <option>該当する駅がありません</option>
            )}
          </select>
          
          <Button 
            colorScheme="blue" 
            onClick={handleStationChange}
            loading={loading}
            loadingText="切替中"
            px="6"
            disabled={stationLoading || stations.length === 0}
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
          <Heading size="md" letterSpacing="2px" color="green.400">
            🟢 {currentStationName} 都営バス 発車案内板
          </Heading>
          <Text style={boardStyles.ledGreen} fontSize="md">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Flex>

        {/* のりば一覧グリッド */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="5">
          {safeTerminalBoards.length > 0 ? (
            safeTerminalBoards.map((platform, idx) => (
              <Box key={idx} {...departureStyles.platformCardToei}>
                
                {/* のりばタイトル */}
                <Flex {...departureStyles.platformHeaderToei}>
                  <Text {...departureStyles.platformTitle}>
                    🚏 {platform.platformName}
                  </Text>
                  <Badge {...departureStyles.platformBadgeToei}>
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