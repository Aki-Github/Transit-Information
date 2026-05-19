/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, FC, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Leafletのデフォルトアイコンのバグ修正用（これがないとピンが表示されません）
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 1. 型定義
interface BusstopData {
  "owl:sameAs": string; // バス停ID
  "dc:title": string;   // バス停名
  "geo:lat": number;    // 緯度
  "geo:long": number;   // 経度
}

interface TimetableData {
  "owl:sameAs": string;
  "odpt:busTimetableObject": {
    "odpt:departureTime": string; // 出発時刻 (hh:mm)
    "odpt:destinationSign"?: string; // 行先
  }[];
}

export const ToeiBusMap: FC = memo(() => {
  const [busstops, setBusstops] = useState<BusstopData[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableData | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState<boolean>(false);

  const API_KEY = process.env.REACT_APP_ODPT_KEY;

  // ① 初期表示：都営バスのバス停一覧（最初の50件など）を取得
  useEffect(() => {
    const fetchBusstopsAroundTokyoStation = async () => {
        try {
            // 東京駅の座標
            const LAT = 35.6812;
            const LON = 139.7671;
            const RADIUS = 1000; // 半径1000メートル以内

            // URLに lat, lon, radius パラメータを付与して、東京駅周辺のバス停を取得
            const url = `https://api.odpt.org/api/v4/places/odpt:BusstopPole?lat=${LAT}&lon=${LON}&radius=${RADIUS}&acl:consumerKey=${API_KEY}`;
            
            const response = await fetch(url);
            const data: BusstopData[] = await response.json();
            
            console.log(`取得できたバス停の数: ${data.length}`);
            setBusstops(data);
        } catch (error) {
            console.error("バス停の取得に失敗:", error);
        }
    };

    fetchBusstopsAroundTokyoStation();
  }, []);

  // ② ピンがクリックされたら、そのバス停の時刻表を取得する
  const handleMarkerClick = async (busstopId: string) => {
    setLoadingTimetable(true);
    setSelectedTimetable(null);
    try {
      const url = `https://api.odpt.org/api/v4/odpt:BusTimetable?odpt:busstopPole=${busstopId}&acl:consumerKey=${API_KEY}`;
      const response = await fetch(url);
      const data: TimetableData[] = await response.json();
      if (data.length > 0) {
        // 最初の系統の時刻表をセット
        setSelectedTimetable(data[0]);
      }
    } catch (error) {
      console.error("時刻表の取得に失敗:", error);
    } finally {
      setLoadingTimetable(false);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer 
        center={[35.6812, 139.7671]} // 初期位置（東京駅付近）
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        {/* 国土地理院（標準地図）のタイルURLを指定 */}
        <TileLayer
          attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
          url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
        />

        {/* バス停をループしてマーカーを配置 */}
        {busstops.map((stop) => {
          // 緯度経度が正しく取れている場合のみプロット
          if (!stop["geo:lat"] || !stop["geo:long"]) return null;

          return (
            <Marker 
              key={stop["owl:sameAs"]} 
              position={[stop["geo:lat"], stop["geo:long"]]}
              eventHandlers={{
                click: () => handleMarkerClick(stop["owl:sameAs"]),
              }}
            >
              <Popup>
                <h3>🚏 {stop["dc:title"]}</h3>
                <hr />
                <h4>標準時刻表</h4>
                {loadingTimetable && <p>時刻表を読み込み中...</p>}
                {selectedTimetable ? (
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <ul>
                      {selectedTimetable["odpt:busTimetableObject"].map((obj, index) => (
                        <li key={index}>
                          <strong>{obj["odpt:departureTime"]}</strong> 
                          {obj["odpt:destinationSign"] ? ` (${obj["odpt:destinationSign"]})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  !loadingTimetable && <p>時刻表データがありません</p>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});