import { Asakusa } from "../components/pages/livemap/Asakusa";
import { Mita } from "../components/pages/livemap/Mita";
import { Arakawa } from "../components/pages/livemap/Arakawa";
import { Oedo } from "../components/pages/livemap/Oedo";
import { Shinjuku } from "../components/pages/livemap/Shinjuku";

export const LiveRoutes = [
  {
    path: "asakusa",
    element: <Asakusa />
  },
  {
    path: "mita",
    element: <Mita />
  },
  {
    path: "shinjuku",
    element: <Shinjuku />
  },
  {
    path: "oedo",
    element: <Oedo />
  },
  {
    path: "arakawa",
    element: <Arakawa />
  }];