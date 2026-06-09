import { Home } from "../components/pages/Home";
import { Page404 } from "../components/pages/Page404";
import { EnglishInfo } from "../components/pages/EnglishInfo";
import { BusstopMap } from "../components/pages/BusstopMap";
import { Test } from "../components/pages/Test";
import { BusRouteMap } from "../components/pages/BusRouteMap";

export const HomeRoutes = [
  {
    path: "",
    element: <Home />,
  },
  {
    path: "english_info",
    element: <EnglishInfo />,
  },
  {
    path: "busstop_map",
    element: <BusstopMap />,
  },
  {
    path: "busRoute_map",
    element: <BusRouteMap />,
  },  {
    path: "test",
    element: <Test />,
  },
  {
    path: "*",
    element: <Page404 />,
  },
];