/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Box, Flex, Heading, Text, Badge, Separator, useSlotRecipe } from '@chakra-ui/react';
import L from 'leaflet';

import { useKeioBusRealtime } from '../../../hooks/bus/useKeioBusRealtime';
// ※京王バス専用のバス停一覧を静的 or 特定範囲から一括取得するカスタムフックを想定
import { useKeioBusstops } from '../../../hooks/bus/useKeioBusstops'; 
import { busMapPopupRecipe } from '../../recipes/busMapPopupRecipe';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

// 通常のバス停アイコン (青いピン)
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 走行中のバス専用アイコン (絵文字やSVGなど)
const activeBusIcon = L.icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/bus.png', // 必要に応じて任意の画像パスに変更
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export const KeioBusMonitor: FC = memo(() => {
  // 1. リアルタイム車両データの取得 (自動更新)
  const { vehicles } = useKeioBusRealtime(true);

  // 2. 京王バスの停留所データの取得
  // ※検索窓がないため、フック内で初期状態から「京王バスの全停留所」または「主要運行エリアの停留所」をあらかじめロードさせておきます
  const { busstops, loadingBusstops } = useKeioBusstops();

  // 3. スロットレシピの適用
  const popupRecipe = useSlotRecipe({ key: "busMapPopup", recipe: busMapPopupRecipe });
  const popupStyles: any = popupRecipe();

  // 初期地図の中心点 (例: 新宿駅・中野周辺など、京王バスの過密エリア)
  const defaultCenter: [number, number] = [35.6895, 139.6917];

  return (
    <Flex direction="column" h="100vh" w="100%" position="relative">
      
      {/* 💡 ヘッダーなしの代わりに、画面の隅に現在の稼働台数をオシャレに浮かせる「フローティングバッジ」 */}
      <Box 
        position="absolute" 
        top="4" 
        right="4" 
        zIndex="999" 
        bg="white/90" 
        backdropFilter="blur(4px)"
        p="3" 
        borderRadius="xl" 
        boxShadow="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <Heading size="xs" color="gray.800" mb="1">🚌 京王バス リアルタイムモニター</Heading>
        <Flex align="center" gap="2">
          <Badge colorPalette="blue" variant="solid">
            運行中: {vehicles.length} 台
          </Badge>
          {loadingBusstops && <Text fontSize="10px" color="gray.400">バス停読込中...</Text>}
        </Flex>
      </Box>

      {/* 地図表示エリア (画面いっぱいに表示) */}
      <Box flex="1" h="100%" w="100%">
        <MapContainer center={defaultCenter} zoom={14} style={{ height: '100vh', width: '100%' }}>
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ----------------------------------------------------
           * レイヤー1: 静的なバス停ピン（接近情報つき）
           * ---------------------------------------------------- */}
          {busstops.map((stop) => {
            // このバス停（stopId や owl:sameAs）に向かって走っているバスを、リアルタイム車両(vehicles)から探す
            const approachingBuses = vehicles.filter(
              (bus) => bus.stopId === stop["owl:sameAs"] || bus.stopId === stop.id
            );

            return (
              stop.latitude && stop.longitude && (
                <Marker 
                  key={stop.id || stop["owl:sameAs"]} 
                  position={[stop.latitude, stop.longitude]}
                >
                  <Popup>
                    <Box {...popupStyles.popupContainer}>
                      <Heading size="sm" mb="1">🚏 {stop.name || stop["dc:title"]}</Heading>
                      
                      {/* 接近状況のタイムリー表示 */}
                      {approachingBuses.length > 0 ? (
                        <Box {...popupStyles.approachingBox}>
                          <Heading {...popupStyles.approachingHeader}>⚠️ バス接近情報</Heading>
                          {approachingBuses.map((bus, index) => (
                            <Box key={`${bus.id}-${index}`} {...popupStyles.approachingRow}>
                              <Flex justify="space-between" align="center">
                                <Text {...popupStyles.approachingBusName}>
                                  車両番号: {bus.id}
                                </Text>
                                <Badge colorPalette="orange" variant="solid">
                                  {bus.currentStatus}
                                </Badge>
                              </Flex>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Box {...popupStyles.noBusBox}>
                          <Text {...popupStyles.noBusText}>現在、直前の区間にバスはありません</Text>
                        </Box>
                      )}
                    </Box>
                  </Popup>
                </Marker>
              )
            );
          })}

          {/* ----------------------------------------------------
           * レイヤー2: リアルタイムで走行中の京王バス
           * ---------------------------------------------------- */}
          {vehicles.map((bus) => (
            <Marker 
              key={bus.id} 
              position={[bus.latitude, bus.longitude]} 
              icon={activeBusIcon}
            >
              <Popup>
                <Box minW="260px">
                  <Heading size="sm" color="blue.700" mb="1">
                    🚌 京王バス ({bus.id}号車)
                  </Heading>
                  
                  <Badge colorPalette="blue" variant="subtle" mb="2">
                    ステータス: {bus.currentStatus}
                  </Badge>
                  
                  <Separator my="2" />
                  
                  {/* 運行中の位置タイムライン */}
                  <Box {...popupStyles.timelineContainer}>
                    <Box {...popupStyles.timelineItem}>
                      <Box {...popupStyles.timelineDotActive} />
                      <Text {...popupStyles.timelineText} fontWeight="bold" color="green.700">
                        <span>
                          まもなく到着：
                          {/* マスタ(busstops)から、バスの向かっている次の stopId の名前を探して表示 */}
                          {busstops.find(s => s.id === `keio:BusstopPole:${bus.stopId}` || s["owl:sameAs"] === `keio:BusstopPole:${bus.stopId}`)?.name || `バス停ID : ${bus.stopId}`}
                        </span>
                      </Text>
                    </Box>
                  </Box>

                  <Separator my="2" />
                  <Text fontSize="10px" color="gray.400" textAlign="right">
                    データ更新時刻: {new Date().toLocaleTimeString()}
                  </Text>
                </Box>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </Box>
    </Flex>
  );
});