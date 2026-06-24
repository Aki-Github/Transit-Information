import { defineSlotRecipe } from "@chakra-ui/react";

// 検索ヘッダー専用のマルチパートレシピを定義
const searchHeaderConfig = defineSlotRecipe({
  className: "search-header",
  slots: ["container", "form", "input", "button", "errorText", "countText", "mapButtonContainer", "mapButton"],
  base: {
    container: {
      padding: "15px",
      backgroundColor: "#f5f5f5",
      borderBottom: "1px solid",
      borderColor: "#ddd",
      zIndex: 1000,
    },
    form: {
      display: "flex",
      gap: "10px",
      maxWidth: "500px",
    },
    input: {
      flex: 1,
      padding: "8px",
      fontSize: "16px",
      borderRadius: "4px",
      border: "1px solid",
      borderColor: "#ccc",
      backgroundColor: "white",
      _focus: {
        borderColor: "#007bff",
        outline: "none",
      }
    },
    button: {
      padding: "8px 16px",
      fontSize: "16px",
      borderRadius: "4px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      cursor: "pointer",
      _hover: {
        backgroundColor: "#0056b3",
      },
      _disabled: {
        backgroundColor: "#ccc",
        cursor: "not-allowed",
      }
    },
    errorText: {
      color: "red",
      margin: "5px 0 0 0",
      fontSize: "14px",
    },
    countText: {
      margin: "5px 0 0 0",
      fontSize: "12px",
      color: "#666",
    },
    // 💡 移動してきたスタイル群
    mapButtonContainer: {
      position: "absolute",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "1000",
    },
    mapButton: {
      borderRadius: "full",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontWeight: "bold",
      px: "6",
      cursor: "pointer",
    }
  },
});

export const searchHeaderRecipe = searchHeaderConfig;