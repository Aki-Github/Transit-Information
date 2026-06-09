/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo, useState, useEffect, SubmitEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Flex, Input, Button, Text, useSlotRecipe, Heading, Separator, Badge } from '@chakra-ui/react';
import L from 'leaflet';

import { useStationSearch } from '../../hooks/bus/useStationSearch';
import { useActiveBuses } from '../../hooks/bus/useActiveBuses';
import { searchHeaderRecipe } from '../recipes/searchHeaderRecipe';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { BusTimetableList } from '../organisms/timetable/BusTimetableList';

import 'leaflet/dist/leaflet.css';

// 通常のバス停アイコン
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 走行中のバス専用アイコンを作成 (絵文字やSVG等でお好みに変更可能)
const activeBusIcon = L.icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/bus.png', // Googleのバスピン等（任意に変更可）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// 地図の中心をプログラムから動かすための内包コンポーネント
const ChangeView: FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
};

export const BusRouteMap: FC = memo(() => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { 
    mapCenter, 
    busstops, // これが実質「バス停マスタ」の役割を果たします
    loading, 
    errorMessage, 
    selectedTimetable,
    loadingTimetable,
    searchStationAndBusstops,
    fetchTimetable 
  } = useStationSearch([35.6812, 139.7671]);

  // 💡 ★ここを差し替え：膨大だった内部ロジックをフック1行で解決！
  const { activeBuses } = useActiveBuses(busstops);

  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    await searchStationAndBusstops(searchQuery);
  };

  const recipe = useSlotRecipe({ key: "searchHeader", recipe: searchHeaderRecipe });
  const styles: any = recipe();

  return (
    <Flex direction="column" h="100vh" w="100%">
      
      {/* 検索ヘッダー */}
      <Box {...styles.container}>
        <form onSubmit={handleSearch}>
          <Flex {...styles.form}>
            <Input
              type="text"
              placeholder="駅名もしくは地名を入力（例：東京、新宿、麻生）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              {...styles.input}
            />
            <Button type="submit" loading={loading} {...styles.button}>
              検索
            </Button>
          </Flex>
        </form>
        {errorMessage && <Text {...styles.errorText}>{errorMessage}</Text>}
        <Flex justify="space-between" align="center" mt="1">
          <Text {...styles.countText}>周辺のバス停件数: {busstops.length} 件</Text>
          {/* 💡 走行中台数のバッジ表示（あるとリッチに見えます） */}
          {activeBuses.length > 0 && (
            <Text fontSize="xs" color="blue.600" fontWeight="bold">
              🚌 運行中のバス: {activeBuses.length} 台を検知
            </Text>
          )}
        </Flex>
      </Box>

      {/* 地図表示エリア */}
      <Box flex="1" position="relative" h="100%" w="100%">
        <MapContainer center={mapCenter} zoom={16} style={{ height: '100vh', width: '100%' }}>
          
          <ChangeView center={mapCenter} />

          <TileLayer
            attribution='© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
            url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
          />

          {/* ----------------------------------------------------
           * レイヤー1: 通常のバス停ピン（接近情報を計算して表示）
           * ---------------------------------------------------- */}
          {busstops.map((stop) => {
            // 💡 2. このバス停ピン（owl:sameAs）に向かって走っているバスを全件から探す！
            const approachingBuses = activeBuses.filter(
              (bus) => bus.toBusstopPoleId === stop["owl:sameAs"]
            );

            return (
              stop["geo:lat"] && stop["geo:long"] && (
                <Marker 
                  key={stop["owl:sameAs"]} 
                  position={[stop["geo:lat"], stop["geo:long"]]}
                  eventHandlers={{
                    click: () => fetchTimetable(stop["owl:sameAs"], stop["dc:title"]),
                  }}
                >
                  <Popup>
                    <Box minW="260px">
                      <Heading size="sm" mb="1">🚏 {stop["dc:title"]}</Heading>
                      
                      {/* 💡 接近情報の表示セクション */}
                      {approachingBuses.length > 0 ? (
                        <Box bg="orange.50" p="2" borderRadius="md" my="2" border="1px solid" borderColor="orange.200">
                          <Heading size="xs" color="orange.700" mb="1">⚠️ バス接近情報</Heading>

                            {approachingBuses.map((bus, index) => (
                              <Box key={`${bus.id}-${index}`} py="1" _notFirst={{ borderTop: "1px dashed", borderColor: "orange.200", mt: "1" }}>
                                <Flex justify="space-between" align="center">
                                  <Text fontSize="xs" color="gray.700" fontWeight="bold">
                                    {bus.operatorName} ({bus.busNumber}号車)
                                  </Text>
                                  <Badge colorPalette="orange" variant="solid">
                                    あと約 {Math.max(1, 2 + bus.delayMin)} 分
                                  </Badge>
                                </Flex>
                                
                                {/* 👇★ここを追加：接近中のバスの行先バッジを表示 */}
                                <Text fontSize="10px" color="blue.600" mt="0.5" fontWeight="medium">
                                  🏁 終点: {bus.destinationSign}
                                </Text>
                              </Box>
                            ))}
                        </Box>
                      ) : (
                        <Box bg="gray.50" p="1.5" borderRadius="md" my="2" textAlign="center">
                          <Text fontSize="xs" color="gray.500">現在、直前の区間にバスはありません</Text>
                        </Box>
                      )}

                      <Separator my="2" />
                      <Heading size="xs" color="fg.muted" mb="2">標準時刻表</Heading>
                      <BusTimetableList
                        selectedTimetable={selectedTimetable || []}
                        loadingTimetable={loadingTimetable}
                      />
                    </Box>
                  </Popup>
                </Marker>
              )
            );
          })}

          {/* ----------------------------------------------------
          * レイヤー2: リアルタイム走行中のバス
          * ---------------------------------------------------- */}
          {activeBuses.map((bus, index) => (
            <Marker key={bus.id || `bus-${index}`} position={bus.position} icon={activeBusIcon}>
              <Popup>
                <Box minW="270px">
                  <Heading size="sm" color="blue.700" mb="1">
                    🚌 {bus.operatorName} ({bus.busNumber}号車)
                  </Heading>
                  
                  <Badge colorPalette="blue" variant="subtle" mb="2">
                    🏁 終点: {bus.destinationSign}
                  </Badge>
                  
                  <Separator my="2" />
                  
                  {/* 💡 運行ルートのタイムライン風表示（3駅仕様へ進化） */}
                  <Box pl="2" borderLeft="2px solid" borderColor="blue.100" position="relative">
                    
                    {/* 1. 前の停留所 */}
                    <Box mb="3" position="relative">
                      <Box position="absolute" left="-13px" top="4px" w="8px" h="8px" borderRadius="full" bg="gray.300" />
                      <Text fontSize="xs" color="gray.500">
                        前：{bus.fromStationName}（発車済）
                      </Text>
                    </Box>

                    {/* 2. 今向かっている停留所（次） */}
                    <Box mb="3" position="relative">
                      <Box position="absolute" left="-13px" top="3px" w="10px" h="10px" borderRadius="full" bg="green.500" />
                      
                      {/* 🟢 修正ポイント：1つのText要素の中で左右に泣き別れさせます。これにより縦位置のズレは物理的に100%発生しなくなります */}
                      <Text fontSize="xs" fontWeight="bold" color="green.700" display="flex" alignItems="center" w="full">
                        {/* バス停名テキスト（前・次々と完全に同じ左端からスタートします） */}
                        <span>
                          次：{busstops.find(s => s["owl:sameAs"] === bus.toBusstopPoleId)?.["dc:title"] || "走行中..."}
                        </span>
                        
                        {/* 右側：計算された到着予測時刻（ms="auto" で文字の高さのまま自動的に右端へ吸着します） */}
                        {bus.arrivalEstimateTime && (
                          <Box as="span" color="blue.600" ms="auto" textAlign="right">
                            ⏱️ {bus.arrivalEstimateTime} 着予定
                          </Box>
                        )}
                      </Text>
                      
                      <Text fontSize="10px" color="gray.500" ml="1" mt="0.5">
                        到着目安: あと約 {Math.max(1, 2 + bus.delayMin)} 分
                      </Text>
                    </Box>

                    {/* 3. 次の次の停留所 */}
                    {bus.nextNextBusstopName && (
                      <Box position="relative">
                        <Box position="absolute" left="-13px" top="4px" w="8px" h="8px" borderRadius="full" bg="orange.400" />
                        <Text fontSize="xs" color="orange.700" fontWeight="medium">
                          次々：{bus.nextNextBusstopName}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Separator my="2" />
                  
                  <Flex align="center" gap="1">
                    <Text fontSize="xs" fontWeight="bold">運行状況:</Text>
                    {bus.delayMin > 0 ? (
                      <Text fontSize="xs" color="red.600" fontWeight="bold">⚠️ 約 {bus.delayMin} 分遅れ</Text>
                    ) : (
                      <Text fontSize="xs" color="green.600" fontWeight="bold">✅ 定刻</Text>
                    )}
                  </Flex>
                </Box>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </Box>
    </Flex>
  );
});