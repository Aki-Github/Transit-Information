export const getTrainStyles = (trainTypeStr: string) => {
  const type = trainTypeStr.toLowerCase();

  // 1. 急行（Express）の場合 -> 青（駅間はライトブルー）
  if (type.includes("express") && !type.includes("limited") && !type.includes("rapid")) {
    return { 
      bg: "blue.600", borderColor: "blue.400", color: "white", textColorSub: "blue.100",
      betweenBg: "blue.950", betweenBorder: "blue.300", // ★駅間用：深い青背景に明るい青枠
      typeLabel: "急行" // ★種別表示用の日本語ラベル
    };
  }
  
  // 2. 特急（LimitedExpress）の場合 -> 赤（駅間はライトレッド/ピンク）
  if (type.includes("limitedexpress") || type.includes("tokkyu")) {
    return { 
      bg: "red.600", borderColor: "red.400", color: "white", textColorSub: "red.100",
      betweenBg: "red.950", betweenBorder: "red.300", // ★駅間用：深い赤背景に明るい赤枠
      typeLabel: "特急" // ★種別表示用の日本語ラベル
    };
  }
  
  // 3. 快特・エアポート快特（RapidExpress / AirportAccessExpress 等）-> 緑（駅間はミントグリーン）
  if (type.includes("rapid") || type.includes("airport")) {
    return { 
      bg: "green.600", borderColor: "green.400", color: "white", textColorSub: "green.100",
      betweenBg: "green.950", betweenBorder: "green.300", // ★駅間用：深い緑背景に明るい緑枠
      typeLabel: "快特" // ★種別表示用の日本語ラベル
    };
  }

  // 4. 普通（Local）またはその他 -> 背景白、白枠（駅間は薄いグレー枠）
  return { 
    bg: "white", borderColor: "whiteAlpha.400", color: "black", textColorSub: "black",
    betweenBg: "gray.900", betweenBorder: "gray.300", // ★駅間用：ダーク背景に上品な薄グレー枠
    typeLabel: "普通" // ★種別表示用の日本語ラベル
  };
};