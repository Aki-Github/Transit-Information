import { defineRecipe } from "@chakra-ui/react";

// 1. まずは設定（定義）を作る（これは内部だけで使うので export を外します）
const trainCardConfig = defineRecipe({
  base: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.muted",
    my: 0,
    p: "3",
    borderRadius: "md",
  },
  variants: {
    status: {
      normal: {
        bg: "green.50",
        borderColor: "green.250",
      },
      delay: {
        bg: "red.50",
        borderColor: "red.250",
      },
      noInfo: {
        bg: "orange.50",
        borderColor: "orange.250",
      },
    },
  },
});

// 2. 【重要】これを実際にコンポーネントで使える「関数」に変換して export する
// ※ Chakra 3.0 の最上位（@chakra-ui/react）から直接呼べるユーティリティ、またはプロジェクトの構成によっては `recipe` マクロ等を使用します
export const trainCardRecipe = trainCardConfig;