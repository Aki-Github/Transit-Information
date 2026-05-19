import { createSystem, defineConfig, defaultSystem, mergeConfigs } from "@chakra-ui/react";

// 1. 自分の追加したい設定だけを定義する
const customConfig = defineConfig({
  globalCss: {
    body: {
      backgroundColor: "gray.100",
      color: "gray.800",
    },
  },
});

// 2. defaultSystem の「中身（config）」と自分の「config」を合成する
// defaultSystem._config で元の設定にアクセスできます
const finalConfig = mergeConfigs(defaultSystem._config, customConfig);

// 3. 合成した設定で新しいシステムを作成する
export const system = createSystem(finalConfig);