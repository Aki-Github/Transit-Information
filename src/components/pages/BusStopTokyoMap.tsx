/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo, useState, useEffect, SubmitEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Flex, Input, Button, Text, useSlotRecipe, Heading, Separator, Badge } from '@chakra-ui/react';
import L from 'leaflet';

import { useStationSearch } from '../../hooks/bus/useStationSearch';
import { useActiveTokyoBuses } from '../../hooks/bus/useActiveTokyoBuses';
import { searchHeaderRecipe } from '../recipes/searchHeaderRecipe';
import { busMapPopupRecipe } from '../recipes/busMapPopupRecipe';
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

// 走行中のバス専用アイコンを作成
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

interface MapControllerProps {
  onSearchCurrentCenter: (lat: number, lon: number) => Promise<void>;
  loading: boolean;
}

/**
 * 💡 画面上に浮かぶ「現在地で検索」ボタンを地図コンポーネント内部に定義
 * MapContainer の内側にあるため、useMap() を安全に呼び出して現在の中心座標をブッコ抜けます。
 */
const MapController: FC<MapControllerProps> = ({ onSearchCurrentCenter, loading }) => {
  const map = useMap();

  const handleGetCurrentCenter = async () => {
    const center = map.getCenter(); // 現在ユーザーが表示している地図の真ん中の座標を取得
    await onSearchCurrentCenter(center.lat, center.lng);
  };

  return (
    <Box
      position="absolute"
      top="20px"
      left="50%"
      transform="translateX(-50%)"
      zIndex="1000" // レイヤーの最前面に配置
    >
      <Button
        onClick={handleGetCurrentCenter}
        loading={loading}
        colorPalette="teal"
        variant="solid"
        size="sm"
        borderRadius="full"
        boxShadow="0 4px 12px rgba(0,0,0,0.15)"
        fontWeight="bold"
        px="6"
      >
        🔍 このエリアで再検索
      </Button>
    </Box>
  );
};

export const BusStopTokyoMap: FC = memo(() => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { 
    mapCenter, 
    busstops, // これが実質「バス停マスタ」の役割を果たします
    loading, 
    errorMessage, 
    selectedTimetable,
    loadingTimetable,
    destination, // 追加で行先も取得しておく（例: "渋谷駅行き"）
    searchStationAndBusstops,
    searchByCoordinates, // 💡 フックに追加した関数を展開
    fetchTimetable 
  } = useStationSearch([35.6812, 139.7671]);

  const { activeBuses } = useActiveTokyoBuses(busstops);

  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    await searchStationAndBusstops(searchQuery);
  };

// 💡 レシピのインスタンス化
  const headerRecipe = useSlotRecipe({ key: "searchHeader", recipe: searchHeaderRecipe });
  const headerStyles: any = headerRecipe();

  const popupRecipe = useSlotRecipe({ key: "busMapPopup", recipe: busMapPopupRecipe });
  const popupStyles: any = popupRecipe();

  return (
    <Flex direction="column" h="100vh" w="100%">
      
      {/* 検索ヘッダー */}
      <Box {...headerStyles.container}>
        <form onSubmit={handleSearch}>
          <Flex {...headerStyles.form}>
            <Input
              type="text"
              placeholder="駅名もしくは地名を入力（例：東京、新宿、麻生）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              {...headerStyles.input}
            />
            <Button type="submit" loading={loading} {...headerStyles.button}>
              検索
            </Button>
          </Flex>
        </form>
        {errorMessage && <Text {...headerStyles.errorText}>{errorMessage}</Text>}
        <Flex justify="space-between" align="center" mt="1">
          <Text {...headerStyles.countText}>周辺のバス停件数: {busstops.length} 件 （対応事業者：都営バス、西武バス、京王バス、東急バス）</Text>
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

          {/* 💡 コントローラーを配置（ボタンが地図上部中央にフロート配置されます） */}
          <MapController 
            onSearchCurrentCenter={searchByCoordinates} 
            loading={loading} 
          />

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
                    <Box {...popupStyles.popupContainer}>
                      <Heading size="sm" mb="1">🚏 {stop["dc:title"]}</Heading>
                      
                      {/* 接近情報の表示セクション */}
                      {approachingBuses.length > 0 ? (
                        <Box {...popupStyles.approachingBox}>
                          <Heading {...popupStyles.approachingHeader}>⚠️ バス接近情報</Heading>

                            {approachingBuses.map((bus, index) => (
                              <Box key={`${bus.id}-${index}`} {...popupStyles.approachingRow}>
                                <Flex justify="space-between" align="center">
                                  <Text {...popupStyles.approachingBusName}>
                                    {bus.operatorName} ({bus.busNumber}号車)
                                  </Text>
                                  <Badge colorPalette="orange" variant="solid">
                                    あと約 {Math.max(1, 2 + bus.delayMin)} 分
                                  </Badge>
                                </Flex>
                                
                                <Text {...popupStyles.approachingDestination}>
                                  🏁 終点: {bus.destinationSign}
                                </Text>
                              </Box>
                            ))}
                        </Box>
                      ) : (
                        <Box {...popupStyles.noBusBox}>
                          <Text {...popupStyles.noBusText}>現在、直前の区間にバスはありません</Text>
                        </Box>
                      )}

                      <Separator my="2" />
                      <Heading {...popupStyles.sectionHeader}>標準時刻表</Heading>
                      <BusTimetableList
                        selectedTimetable={selectedTimetable || []}
                        loadingTimetable={loadingTimetable}
                        destination={destination}
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
                  
                  {/* 運行ルートのタイムライン風表示 */}
                  <Box {...popupStyles.timelineContainer}>
                    
                    {/* 1. 前の停留所 */}
                    <Box {...popupStyles.timelineItem}>
                      <Box {...popupStyles.timelineDotPrev} />
                      <Text {...popupStyles.timelineText} color="gray.500">
                        {bus.toBusstopPoleId ? `前：${bus.fromStationName}（発車済）` : `今：${bus.fromStationName}（到着済）`}
                      </Text>
                    </Box>

                    {/* 2. 今向かっている停留所（次） */}
                    <Box {...popupStyles.timelineItem}>
                      <Box {...popupStyles.timelineDotActive} />
                      
                      <Text {...popupStyles.timelineText} fontWeight="bold" color="green.700">
                        <span>
                          {bus.toBusstopPoleId ? `次：${bus.nextBusstopName || '走行中...'}` : "終点到着"}
                        </span>
                        
                        {bus.arrivalEstimateTime && (
                          <Box as="span" {...popupStyles.timelineTime}>
                            ⏱️ {bus.arrivalEstimateTime} 着予定
                          </Box>
                        )}
                      </Text>
                      
                      {bus.toBusstopPoleId && (
                        <Text fontSize="10px" color="gray.500" ml="1" mt="0.5">
                          到着目安: あと約 {Math.max(1, 2 + bus.delayMin)} 分
                        </Text>
                      )}
                    </Box>

                    {/* 3. 次の次の停留所 */}
                    {bus.nextNextBusstopName && (
                      <Box {...popupStyles.timelineItem}>
                        <Box {...popupStyles.timelineDotNextNext} />
                        <Text {...popupStyles.timelineText} color="orange.700" fontWeight="medium">
                          次々：{bus.nextNextBusstopName}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Separator my="2" />
                  
                  <Flex {...popupStyles.statusFlex}>
                    <Text {...popupStyles.statusLabel}>運行状況:</Text>
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