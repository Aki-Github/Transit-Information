import { FC, memo } from 'react';
import { useNishiTokyoBusRealtime } from "../../hooks/bus/useNishiTokyoBusRealtime";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export const Test: FC = memo(() => {
  const { vehicles } = useNishiTokyoBusRealtime(true);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {/* 1. 地図の親玉コンポーネント */}
      <MapContainer center={[35.6895, 139.6917]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* 🟢 2. MapContainerの内側でバスのループ処理を行う */}
        {vehicles.map((bus) => (
          <Marker key={bus.id} position={[bus.latitude, bus.longitude]}>
            <Popup>
              <div>
                <h3>🚌 西東京バス ({bus.id})</h3>
                <p>状態: {bus.currentStatus}</p>
                <p>次のバス停ID: {bus.stopId}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
});