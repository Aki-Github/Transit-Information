import { KeioBusMonitor } from "../components/pages/busmap/KeioBusMonitor";
import { TerminalDepartureBoardToei } from "../components/pages/busmap/TerminalDepartureBoardToei";
import { BusStopTokyoMap } from "../components/pages/busmap/BusStopTokyoMap";
import { TerminalDepartureBoardSeibu } from "../components/pages/busmap/TerminalDepartureBoardSeibu";
import { TerminalDepartureBoardKeio } from "../components/pages/busmap/TerminalDepartureBoardKeio";
import { TerminalDepartureBoardNishiTokyo } from "../components/pages/busmap/TerminalDepartureBoardNishiTokyo";
import { BusStopKanagawaMap } from "../components/pages/busmap/BusStopKanagawaMap";
import { TerminalDepartureBoardYokohama } from "../components/pages/busmap/TerminalDepartureBoardYokohama";

export const BusRoutes = [
  {
    path: "tokyo",
    element: <BusStopTokyoMap />
  },
  {
    path: "kanagawa",
    element: <BusStopKanagawaMap />
  },
  {
    path: "board_toei",
    element: <TerminalDepartureBoardToei />
  },
  {
    path: "board_seibu",
    element: <TerminalDepartureBoardSeibu />
  },
  {
    path: "board_keio",
    element: <TerminalDepartureBoardKeio />
  },
  {
    path: "board_nishitokyo",
    element: <TerminalDepartureBoardNishiTokyo />
  },
  {
    path: "board_yokohama",
    element: <TerminalDepartureBoardYokohama />
  },  
  {
    path: "keio",
    element: <KeioBusMonitor />
  },
  ];