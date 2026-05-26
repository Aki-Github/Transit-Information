import { OperatorConfig } from "../../types/api/traffic"; // 型をインポート

export const OPERATORS_CONFIG: OperatorConfig[] = [
  { 
      id: "odpt.Operator:JR-East", 
      title: "🚃 JR東日本 運行情報",
      // 主要な路線を定義（getRailwayNameJa が対応しているもの）
      railwayIds: [
        "odpt.Railway:JR-East.Yamanote",
        "odpt.Railway:JR-East.ChuoQuick",
        "odpt.Railway:JR-East.ChuoSobuLocal",
        "odpt.Railway:JR-East.SobuRapid",
        "odpt.Railway:JR-East.KeihinTohoku",
        "odpt.Railway:JR-East.ShonanShinjuku",
        "odpt.Railway:JR-East.Saikyo",
        "odpt.Railway:JR-East.Musashino",       // 武蔵野線
        "odpt.Railway:JR-East.Nambu",           // 南武線
        "odpt.Railway:JR-East.Yokohama",        // 横浜線
        "odpt.Railway:JR-East.Keiyo",           // 京葉線
        "odpt.Railway:JR-East.JobanRapid",      // 常磐快速線
        "odpt.Railway:JR-East.JobanLocal",      // 常磐緩行線
        "odpt.Railway:JR-East.Utsunomiya",      // 宇都宮線（東北線）
        "odpt.Railway:JR-East.Takasaki",        // 高崎線
        "odpt.Railway:JR-East.Tokaido",         // 東海道線
        "odpt.Railway:JR-East.Itsukaichi",      // 五日市線
        "odpt.Railway:JR-East.Ome",             // 青梅線
        "odpt.Railway:JR-East.Tsurumi",         // 鶴見線
        "odpt.Railway:JR-East.Kawagoe",         // 川越線
        "odpt.Railway:JR-East.Hachiko",         // 八高線
      ]
    },
    { 
      id: "odpt.Operator:TokyoMetro", 
      title: "🚃 東京メトロ 運行情報",
      railwayIds: [] // 東京メトロの路線IDをここに追加
    },
    { 
      id: "odpt.Operator:Toei", 
      title: "🚃 東京都交通局 運行情報",
      railwayIds: [] // 東京都交通局の路線IDをここに追加
    },
    {
      id: "odpt.Operator:Tokyu",
      title: "🚃 東急電鉄 運行情報",
      railwayIds: [
        "odpt.Railway:Tokyu.Toyoko",
        "odpt.Railway:Tokyu.DenEnToshi",
        "odpt.Railway:Tokyu.Meguro",
        "odpt.Railway:Tokyu.Oimachi",
        "odpt.Railway:Tokyu.Ikegami"
      ]
    },
    {
      id: "odpt.Operator:Odakyu",
      title: "🚃 小田急電鉄 運行情報",
      railwayIds: [
        "odpt.Railway:Odakyu.Odawara",
        "odpt.Railway:Odakyu.Enoshima",
        "odpt.Railway:Odakyu.Tama"
      ]
    },
    { 
      id: "odpt.Operator:Keio", 
      title: "🚃 京王電鉄 運行情報",
      railwayIds: [
        "odpt.Railway:Keio.Keio",               // 京王線
        "odpt.Railway:Keio.Sagamihara",         // 相模原線
        "odpt.Railway:Keio.Takao",              // 高尾線
        "odpt.Railway:Keio.Inokashira",         // 井の頭線
        "odpt.Railway:Keio.New",                // 京王新線
        "odpt.Railway:Keio.Dobutsuen",          // 動物園線
        "odpt.Railway:Keio.Keibajo"            // 競馬場線
      ]
    },
    { 
      id: "odpt.Operator:Keikyu", 
      title: "🚃 京浜急行電鉄 運行情報",
      railwayIds: [
        "odpt.Railway:Keikyu.Main",             // 京急本線
        "odpt.Railway:Keikyu.Airport",          // 空港線
        "odpt.Railway:Keikyu.Daishi",           // 大師線
        "odpt.Railway:Keikyu.Zushi",            // 逗子線
        "odpt.Railway:Keikyu.Kurihama"         // 久里浜線
      ]
    },
    { 
      id: "odpt.Operator:Keisei", 
      title: "🚃 京成電鉄 運行情報",
      railwayIds: [
        "odpt.Railway:Keisei.Main",             // 京成本線
        "odpt.Railway:Keisei.Oshiage",          // 押上線
        "odpt.Railway:Keisei.Kanamachi",        // 金町線
        "odpt.Railway:Keisei.Chiba",            // 千葉線
        "odpt.Railway:Keisei.Chihara",          // 千原線
        "odpt.Railway:Keisei.HigashiNarita",    // 東成田線
        "odpt.Railway:Keisei.NaritaSkyAccess"   // 成田スカイアクセス線
      ]
    },
    { 
      id: "odpt.Operator:Seibu", 
      title: "🚃 西武鉄道 運行情報",
      railwayIds: [
        "odpt.Railway:Seibu.Ikebukuro",         // 池袋線
        "odpt.Railway:Seibu.Shinjuku",          // 新宿線
        "odpt.Railway:Seibu.Haijima",           // 拝島線
        "odpt.Railway:Seibu.Tamako",            // 多摩湖線
        "odpt.Railway:Seibu.Kokubunji",         // 国分寺線
        "odpt.Railway:Seibu.Tamagawa",          // 多摩川線
        "odpt.Railway:Seibu.Sayama",            // 狭山線
        "odpt.Railway:Seibu.Toshima",           // 豊島線
        "odpt.Railway:Seibu.SeibuChichibu",     // 西武秩父線
        "odpt.Railway:Seibu.Yamahashira"        // 山口線（レオライナー）
      ]
    },
    { 
      id: "odpt.Operator:Tobu", 
      title: "🚃 東武鉄道 運行情報",
      railwayIds: [
        "odpt.Railway:Tobu.Skytree",            // 東武スカイツリーライン（伊勢崎線の一部）
        "odpt.Railway:Tobu.Isesaki",            // 伊勢崎線
        "odpt.Railway:Tobu.Tojo",               // 東上線
        "odpt.Railway:Tobu.Noda",               // 野田線（東武アーバンパークライン）
        "odpt.Railway:Tobu.Nikko",              // 日光線
        "odpt.Railway:Tobu.Kinugawa",           // 鬼怒川線
        "odpt.Railway:Tobu.Sano",               // 佐野線
        "odpt.Railway:Tobu.Kiryu",              // 桐生線
        "odpt.Railway:Tobu.Utsunomiya",         // 宇都宮線
        "odpt.Railway:Tobu.Ogose"               // 越生線
      ]
    },
    { 
      id: "odpt.Operator:Sotetsu", 
      title: "🚃 相模鉄道 運行情報",
      railwayIds: [
        "odpt.Railway:Sotetsu.Main",            // 相鉄本線
        "odpt.Railway:Sotetsu.Izumino",         // いずみ野線
        "odpt.Railway:Sotetsu.ShinYokohama"     // 相鉄新横浜線
      ] // 相模鉄道の路線IDをここに追加
    },
    { 
      id: "odpt.Operator:MIR", 
      title: "🚃 つくばエクスプレス 運行情報",
      railwayIds: [] // つくばエクスプレスの路線IDをここに追加
    },
    { 
      id: "odpt.Operator:TWR", 
      title: "🚃 東京臨海高速鉄道 運行情報",
      railwayIds: [] // 東京臨海高速鉄道の路線IDをここに追加
    },
    { 
      id: "odpt.Operator:TamaMonorail", 
      title: "🚃 多摩モノレール 運行情報",
      railwayIds: [] // 多摩モノレールの路線IDをここに追加
    },
    { 
      id: "odpt.Operator:YokohamaMunicipal", 
      title: "🚃 横浜市交通局 運行情報",
      railwayIds: [] // 横浜市交通局の路線IDをここに追加
    },
];