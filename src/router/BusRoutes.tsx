import { KeioBusMonitor } from "../components/pages/busmap/KeioBusMonitor";
import { BusStopTokyoMap } from "../components/pages/BusStopTokyoMap";

export const BusRoutes = [
  {
    path: "tokyo",
    element: <BusStopTokyoMap />
  },
  {
    path: "keio",
    element: <KeioBusMonitor />
  },
  ];