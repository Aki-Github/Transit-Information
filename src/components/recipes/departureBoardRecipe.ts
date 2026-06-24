import { defineSlotRecipe } from "@chakra-ui/react";

export const departureBoardRecipe = defineSlotRecipe({
  slots: [
    "controlPanel",
    "controlPanelTitle",
    "controlBox",
    "boardContainer",
    "platformCardToei",
    "platformCardSeibu",
    "platformCardKeio",
    "platformCardNishiTokyo",
    "platformCardYokohama",
    "loadingOverlay",
    "boardHeader",
    "platformHeaderToei",
    "platformHeaderSeibu",
    "platformHeaderKeio",
    "platformHeaderNishiTokyo",
    "platformHeaderYokohama",
    "platformTitle",
    "platformBadgeToei",
    "platformBadgeSeibu",
    "platformBadgeKeio",
    "platformBadgeNishiTokyo",
    "platformBadgeYokohama",
  ],
  base: {
    // 操作パネル（上部のグレーのボックス）
    controlPanel: {
      backgroundColor: '#1A202C',
      padding: '4',
      borderRadius: 'xl',
      marginBottom: '5',
      border: '1px solid #4A5568',
    },

    // 操作パネル内のタイトルテキスト
    controlPanelTitle: {
      color: 'gray.300',
      fontSize: 'xs',
      marginBottom: '2',
      fontWeight: 'bold',
    },

    controlBox: {
      backgroundColor: '#2D3748',
      color: "white",
    },

    // 電光掲示板本体（外枠の青いボックス）
    boardContainer: {
      backgroundColor: '#111111',
      padding: '5',
      borderRadius: 'xl',
      boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
      border: '3px solid #2B6CB0',
      color: 'white',
      position: 'relative' as const, // 💡 TypeScriptの型推論を固定するために「as const」を付けます
    },

    // 各のりばを囲む個別のカード枠（都営グリーンの縁）
    platformCardToei: {
      border: '2px solid #38A169',
      borderRadius: 'lg',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    platformCardSeibu: {
      border: '2px solid #0bbfe3',
      borderRadius: 'lg',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    platformCardKeio: {
      border: '2px solid #00053a',
      borderRadius: 'lg',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    platformCardNishiTokyo: {
      border: '2px solid #EF2127',
      borderRadius: 'lg',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    platformCardYokohama: {
      border: '2px solid #007FFF',
      borderRadius: 'lg',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    // データを更新中のローディング背景
    loadingOverlay: {
      position: 'absolute' as const, // 💡 ここも「as const」で固定
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 'xl',
    },

    // 掲示板最上部の黒いヘッダーバー
    boardHeader: {
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#222',
      padding: '3',
      borderRadius: 'md',
      marginBottom: '5',
    },

    // 各のりば（都営グリーン）のタイトルバー
    platformHeaderToei: {
      backgroundColor: '#38A169',
      paddingX: '3',
      paddingY: '1.5',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    platformHeaderSeibu: {
      backgroundColor: '#0bbfe3',
      paddingX: '3',
      paddingY: '1.5',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    platformHeaderKeio: {
      backgroundColor: '#00053a',
      paddingX: '3',
      paddingY: '1.5',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    platformHeaderNishiTokyo: {
      backgroundColor: '#EF2127',
      paddingX: '3',
      paddingY: '1.5',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    platformHeaderYokohama: {
      backgroundColor: '#007FFF',
      paddingX: '3',
      paddingY: '1.5',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    platformTitle: {
      color: "white",
      fontSize: 'sm',
      fontWeight: 'bold',
    },

    platformBadgeToei: {
      backgroundColor: '#38A169',
      color: "white",
      fontSize: '10px',
    },

    platformBadgeSeibu: {
      backgroundColor: '#0bbfe3',
      color: "white",
      fontSize: '10px',
    },

    platformBadgeKeio: {
      backgroundColor: '#00053a',
      color: "white",
      fontSize: '10px',
    },

    platformBadgeNishiTokyo: {
      backgroundColor: '#EF2127',
      color: "white",
      fontSize: '10px',
    },

    platformBadgeYokohama: {
      backgroundColor: '#007FFF',
      color: "white",
      fontSize: '10px',
    },
  }
});