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
  { line_cd: '24001', line_name: '京王線' },
  { line_cd: '24002', line_name: '京王相模原線' },
  { line_cd: '24003', line_name: '京王高尾線' },
  { line_cd: '24004', line_name: '京王競馬場線' },
  { line_cd: '24005', line_name: '京王動物園線' },
  { line_cd: '24006', line_name: '京王井の頭線' },
  { line_cd: '24007', line_name: '京王新線' },
  { line_cd: '11311', line_name: 'JR中央線' },
  { line_cd: '25001', line_name: '小田急小田原線' },
  { line_cd: '22012', line_name: '西武多摩川線' },
  { line_cd: '11303', line_name: 'JR南武線' },
  { line_cd: '11305', line_name: 'JR武蔵野線' },
  { line_cd: '11306', line_name: 'JR横浜線' },
];

const operator: string = 'odpt.Operator:KeioBus';

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
export const TerminalDepartureBoardKeio: FC = memo(() => {
  // フックから座標更新関数（searchByCoordinates）も追加で受け取る
  const { terminalBoards, loading, errorMessage, searchByCoordinates } : UseBusPoleTimeTableReturn = useBusPoleTimeTable([35.690163, 139.699187], operator);

  // 選択中の路線コード (初期値は京王線)
  const [selectedLineCd, setSelectedLineCd] = useState<string>('24001');
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedStationIndex, setSelectedStationIndex] = useState<string>('0');
  const [stationLoading, setStationLoading] = useState<boolean>(true);

  // v3の slotRecipe からスタイルマップを展開
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
          .eq('pref_cd', 13)    // 東京の駅に絞る
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
  }, [selectedLineCd]);

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

// 💡 安全対策ガードをローディング判定より上に移動させておきます
  const safeTerminalBoards = Array.isArray(terminalBoards) ? terminalBoards : [];

  // 🟢 「駅データの読込中」または「初回起動時（バスデータがまだ0件で、ロード中のとき）」はローディング画面を維持する
  if (stationLoading || (loading && safeTerminalBoards.length === 0)) {
    return (
      <Flex justify="center" align="center" p="10" h="400px" direction="column" gap="4">
        <Spinner size="lg" color="blue.500" />
        <Text ml="4" fontSize="md" color="gray.300" fontWeight="bold">
          {stationLoading ? "マスターデータを読み込み中..." : "バスのリアルタイム運行データを読み込み中..."}
        </Text>
      </Flex>
    );
  }

  if (errorMessage) {
    return <Text color="red.500" p="5">{errorMessage}</Text>;
  }

  // 表示中の駅名を取得
  const currentStationName = `${stations[parseInt(selectedStationIndex, 10)]?.station_name}駅周辺` || "新宿駅周辺";

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
          <Heading size="md" letterSpacing="2px" color="white">
            🔵 {currentStationName} 京王バス 発車案内板
          </Heading>
          <Text style={boardStyles.ledGreen} fontSize="md">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Flex>

        {/* のりば一覧グリッド */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="5">
          {safeTerminalBoards.length > 0 ? (
            safeTerminalBoards.map((platform, idx) => (
              <Box key={idx} {...departureStyles.platformCardKeio}>
                
                {/* のりばタイトル */}
                <Flex {...departureStyles.platformHeaderKeio}>
                  <Text {...departureStyles.platformTitle}>
                    🚏 {platform.platformName}
                  </Text>
                  <Badge {...departureStyles.platformBadgeKeio}>
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