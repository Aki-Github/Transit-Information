import { defineSlotRecipe } from "@chakra-ui/react";

const timetableItemConfig = defineSlotRecipe({
  className: "timetable-item",
  slots: [
    "itemContainer", 
    "headerFlex", 
    "busBadge", 
    "destinationHeading", 
    "dayLabel", 
    "timeList", 
    "timeListItem", 
    "timeText", 
    "destinationSignText"
  ],
  base: {
    itemContainer: {
      mb: "3",
      pb: "2",
      borderBottom: "1px dashed",
      borderColor: "border.muted",
    },
    headerFlex: {
      alignItems: "center",
      gap: "2",
      flexWrap: "wrap",
      mb: "1",
    },
    busBadge: {
      bg: "blue.subtle",
      color: "blue.fg",
      fontWeight: "bold",
      px: "2",
      py: "0.5",
      borderRadius: "sm",
      fontSize: "xs",
    },
    destinationHeading: {
      fontSize: "xs",
      fontWeight: "bold",
    },
    dayLabel: {
      color: "orange.fg",
      fontSize: "xs",
      fontWeight: "medium",
      mb: "1",
    },
    timeList: {
      // 外部インラインスタイルで残っていた部分もここに統合します！
      paddingLeft: "20px",
      margin: "5px 0 0 0",
    },
    timeListItem: {
      mb: "0.5",
    },
    timeText: {
      fontWeight: "semibold",
    },
    destinationSignText: {
      color: "fg.muted",
      fontSize: "xs",
    },
  },
});

export const timetableItemRecipe = timetableItemConfig;

const professionalTimetableConfig = defineSlotRecipe({
  className: "pro-timetable",
  slots: ["wrapper", "header", "busNumber", "gridContainer", "headerCell", "hourCell", "minuteCell"],
  base: {
    wrapper: {
      border: "2px solid",
      borderColor: "gray.800",
      bg: "white",
      color: "gray.900",
      p: "2",
      maxH: "450px", // ポップアップ内でスクロールできるように
      overflowY: "auto",
    },
    header: {
      textAlign: "center",
      fontWeight: "bold",
      fontSize: "md",
      borderBottom: "2px solid",
      borderColor: "gray.800",
      py: "1",
    },
    busNumber: {
      bg: "blue.subtle", 
      color: "blue.fg",
      fontWeight: "bold", 
      px: "2", 
      py: "0.5", 
      borderRadius: "sm",
      fontSize: "xs",
    },
    gridContainer: {
      // 「時（固定）」「平日（可変）」「土日祝（可変）」の3カラム構造
      display: "grid",
      // ★ 時(32px) ＋ 残りを3等分（平日、土曜、休日）
      gridTemplateColumns: "32px 1fr 1fr 1fr",
      textAlign: "center",
      fontSize: "xs",
    },
    headerCell: {
      fontWeight: "bold",
      py: "1",
      borderBottom: "2px solid",
      borderColor: "gray.800",
    },
    hourCell: {
      bg: "blue.500", // 画像のような青色の時間軸バー
      color: "white",
      fontWeight: "extrabold",
      fontSize: "sm",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: "1px solid",
      borderColor: "gray.300",
    },
    minuteCell: {
      py: "1.5",
      px: "2",
      textAlign: "left",
      display: "flex",
      flexWrap: "wrap",
      gap: "2",
      borderBottom: "1px solid",
      borderColor: "gray.300",
      borderLeft: "1px solid",
    },
  },
});

export const professionalTimetableRecipe = professionalTimetableConfig;