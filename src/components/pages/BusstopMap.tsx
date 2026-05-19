/* eslint-disable react-hooks/exhaustive-deps */
import { FC, memo, useState, useEffect, SubmitEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Flex, Input, Button, Text, useSlotRecipe, Heading, Separator } from '@chakra-ui/react';
import L from 'leaflet';

import { useStationSearch } from '../../hooks/useStationSearch';
import { searchHeaderRecipe } from '../recipes/searchHeaderRecipe';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { BusTimetableList } from '../organisms/timetable/BusTimetableList';

import 'leaflet/dist/leaflet.css';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ★ 地図の中心をプログラムから動かすための内包コンポーネント
const ChangeView: FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16); // 指定した座標にズームレベル14で移動
  }, [center, map]);
  return null;
};

export const BusstopMap: FC = memo(() => {
  const [searchQuery, setSearchQuery] = useState<string>(''); // 検索窓の入力状態はコンポーネントが持つ

  // ★ カスタムフックから必要な状態と関数を分割代入で取り出す
  const { 
    mapCenter, 
    busstops, 
    loading, 
    errorMessage, 
    selectedTimetable,
    loadingTimetable,
    searchStationAndBusstops,
    fetchTimetable 
  } = useStationSearch([35.6812, 139.7671]); // 初期値を渡せるように設計

  // UIイベントをハンドリングするラッパー関数
  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // フック側の核心ロジックを呼び出す
    await searchStationAndBusstops(searchQuery);
  };

  // ★ 修正部分：直接呼び出すのではなく、useSlotRecipe フックにレシピを渡す
  const recipe = useSlotRecipe({ key: "searchHeader", recipe: searchHeaderRecipe });
  // 型不一致を回避するため any にキャスト
  const styles: any = recipe();

  return (
    <Flex direction="column" h="100vh" w="100%">
      
      {/* 画面上部の検索ヘッダー */}
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
            {/* ★ ChakraのButtonはloadingプロパティを渡すだけで、
              自動的にローディングスピナーを表示し、非活性（disabled）にしてくれます。
            */}
            <Button 
              type="submit" 
              loading={loading}
              {...styles.button}
            >
              検索
            </Button>
          </Flex>
        </form>
        
        {errorMessage && (
          <Text {...styles.errorText}>
            {errorMessage}
          </Text>
        )}
        
        <Text {...styles.countText}>
          周辺のバス停件数: {busstops.length} 件
        </Text>
      </Box>

      {/* 地図表示エリア */}
      <Box flex="1" position="relative" h="100%" w="100%">
        <MapContainer center={mapCenter} zoom={16} style={{ height: '100vh', width: '100%' }}>
          
          {/* 地図の動的移動を制御するカスタムコンポーネント */}
          <ChangeView center={mapCenter} />

          <TileLayer
            attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
            url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
          />

          {busstops.map((stop) => (
            stop["geo:lat"] && stop["geo:long"] && (
                <Marker 
                    key={stop["owl:sameAs"]} 
                    position={[stop["geo:lat"], stop["geo:long"]]}
                    // ★ ピンをクリックした時に、フックの関数にID・バス停の名前を渡して実行
                    eventHandlers={{
                        click: () => fetchTimetable(stop["owl:sameAs"], stop["dc:title"]),
                    }}
                >
                <Popup>
                    {/* ★ ポップアップ内部を Chakra UI 3.0 仕様にアップデート */}
                  <Box minW="240px">
                    <Heading size="sm" mb="1">
                      🚏 {stop["dc:title"]}
                    </Heading>
                    
                    {/* 従来の <hr /> の代わりに Chakra 3.0 の Separator を使用 */}
                    <Separator my="2" />
                    
                    <Heading size="xs" color="fg.muted" mb="2">
                      標準時刻表
                    </Heading>
                    
                    {/* ★ 外だしした時刻表コンポーネントをすっきり呼び出すだけ */}
                    <BusTimetableList
                      selectedTimetable={selectedTimetable || []}
                      loadingTimetable={loadingTimetable}
                    />
                  </Box>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </Box>
    </Flex>
  );
});