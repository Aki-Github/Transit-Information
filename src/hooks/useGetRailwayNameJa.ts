  // 英語の路線名を日本語に変換するための辞書
  const RAILWAY_NAMES_JA: Record<string, string> = {
    Marunouchi: "丸の内線",
    MarunouchiBranch: "丸ノ内線（方南町方面）",
    Ginza: "銀座線",
    Hibiya: "日比谷線",
    Tozai: "東西線",
    Chiyoda: "千代田線",
    Yurakucho: "有楽町線",
    Hanzomon: "半蔵門線",
    Namboku: "南北線",
    Fukutoshin: "副都心線",
    Asakusa: "浅草線",
    Mita: "三田線",
    Shinjuku: "新宿線",
    Oedo: "大江戸線",
    Arakawa: "荒川線（東京さくらトラム）",
    NipporiToneri: "日暮里・舎人ライナー",
    TsukubaExpress: "つくばエクスプレス",
    Rinkai: "りんかい線",
    Yurikamome: "ゆりかもめ",
    TamaMonorail: "多摩モノレール",
    Blue: "ブルーライン",
    Green: "グリーンライン",
  };

  // 変換用の関数
  export const getRailwayNameJa = (railwayUrl: string): string => {
    const engName = railwayUrl.split('.').pop();
    if (!engName) return "不明な路線";
    
    // 辞書にあれば日本語、なければそのまま英語を返す
    return RAILWAY_NAMES_JA[engName] ?? engName;
  };