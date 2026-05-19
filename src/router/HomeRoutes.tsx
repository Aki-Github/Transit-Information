import { Home } from "../components/pages/Home";
import { Page404 } from "../components/pages/Page404";
import { EnglishInfo } from "../components/pages/EnglishInfo";
import { BusstopMap } from "../components/pages/BusstopMap";

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
    path: "*",
    element: <Page404 />,
  },
];