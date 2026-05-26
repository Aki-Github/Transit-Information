import { defineSlotRecipe } from "@chakra-ui/react";

export const liveMapRecipe = defineSlotRecipe({
  className: "live-map",
  slots: [
    "container",
    "header",
    "headerTitle",
    "headerSubtitle",
    "headerBadge",
    "headerTrack2Columns",
    "headerTitle2Columns",
    "trackScrollArea",
    "trackScrollArea2Columns",
    "stationRow",
    "stationLeftSide",
    "stationRightSide",
    "betweenRow",
    "betweenLeftSide",
    "betweenRightSide",
    "leftTrainTrack",
    "rightTrainTrack",
    "centerStationNode",
    "stationCode",
    "stationName",
    "trackLine",
    "stationDot",
    "destinationText",
    "dialogContent",
    "dialogTitle",
    "dialogSubtitle",
  ],
  base: {
    container: {
      p: { base: "3", md: "6" },
      bg: "gray.950",
      color: "white",
      borderRadius: "xl",
      boxShadow: "2xl",
      maxW: { base: "600px", md: "1000px" },
      mx: "auto",
    },
    header: {
      justifyContent: "space-between",
      alignItems: "center",
      mb: "5",
      borderBottom: "2px solid",
      borderColor: "rose.900",
      pb: "3",
    },
    headerTitle: {
      color: "rose.500",
      fontWeight: "extrabold",
      display: "flex",
      alignItems: "center",
      gap: "2"
    },
    headerSubtitle: {
      fontSize: "11px",
      color: "gray.400",
      mt: "0.5"
    },
    headerBadge: {
      colorPalette: "rose",
      fontSize: "xs",
      bg: "rose.500",
      color: "white",
      px: "2",
      py: "0.5",
      borderRadius: "sm"
    },
    headerTrack2Columns: {
      bg: "gray.900",
      p: "2",
      textAlign: "center",
      borderRadius: "md",
      mb: "2"
    },
    headerTitle2Columns: {
      fontWeight: "bold",
      color: "magenta.300",
      fontSize: "sm"
    },
    trackScrollArea: {
      maxH: { base: "650px", md: "800px" },
      overflowY: "auto",
      pr: "2",
    },
    trackScrollArea2Columns: {
      maxH: { base: "650px", md: "800px" },
      flex: "1",
      overflowY: "auto",
      border: "1px solid",
      borderColor: "gray.800",
      p: "2",
      pr: "2",
      borderRadius: "md"
    },
    // 駅の行
    stationRow: {
      display: "flex",
      alignItems: "center",
      minH: "64px",
      py: "1",
      position: "relative",
      borderBottom: "1px solid",
      borderColor: "whiteAlpha.100",
    },
    stationLeftSide: {
        border:"1px solid",
        px:"2",
        py:"1",
        borderRadius:"md",
        fontSize:"10px",
        textAlign:"right",
        boxShadow:"md",
        minW:"105px",
        maxW:"130px"
    },
    stationRightSide: {
        border:"1px solid",
        px:"2",
        py:"1",
        borderRadius:"md",
        fontSize:"10px",
        boxShadow:"md",
        minW:"105px",
        maxW:"130px"
    },
    // 駅間の行
    betweenRow: {
      display: "flex",
      alignItems: "center",
      minH: "48px",
      py: "1",
      position: "relative",
      bg: "whiteAlpha.50/2",
    },
    betweenLeftSide: {
      border:"1px solid",
      px:"1.5",
      py:"0.5",
      borderRadius:"sm",
      fontSize:"9px",
      textAlign:"right",
      minW:"105px",
      maxW:"130px",
      whiteSpace:"nowrap",
      overflow:"hidden",
      textOverflow:"ellipsis"
    },
    betweenRightSide: {
      border:"1px solid",
      px:"1.5",
      py:"0.5",
      borderRadius:"sm",
      fontSize:"9px",
      textAlign:"right",
      minW:"105px",
      maxW:"130px",
      whiteSpace:"nowrap",
      overflow:"hidden",
      textOverflow:"ellipsis"
    },
    leftTrainTrack: {
      flex: "1",
      justifyContent: "flex-end",
      pr: { base: "2", md: "6" },
      alignItems: "center",
      flexWrap: "wrap",
      gap: "1.5",
    },
    rightTrainTrack: {
      flex: "1",
      justifyContent: "flex-start",
      pl: { base: "2", md: "6" },
      alignItems: "center",
      flexWrap: "wrap",
      gap: "1.5",
    },
    // 中央の駅・線路エリア（共通）
    centerStationNode: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      w: "140px",
      minW: "140px",
      alignSelf: "stretch", 
      zIndex: "2",
    },
    
    // 線路（赤い縦線・決定版）
    trackLine: {
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      top: "0",
      bottom: "0",
      w: "4px",
      bg: "rose.500",
      opacity: "0.6",
      zIndex: "1",
    },
    stationDot: {
      w: "12px",
      h: "12px",
      borderRadius: "full",
      bg: "gray.950",
      border: "3px solid",
      borderColor: "white",
      mb: "1",
    },  
    stationCode: {
      fontSize: "9px", 
      color: "gray.400", 
      fontWeight: "mono",
      lineHeight: "1"
    },
    stationName: {
      fontSize: "xs", 
      fontWeight: "bold", 
      color: "white", 
      textAlign: "center", 
      mt: "0.5"
    },
    destinationText: {
      fontSize: "9px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    dialogContent: {
      bg:"gray.900", 
      color:"white", 
      borderColor:"whiteAlpha.200", 
      p:"4",
      position:"fixed",
      top:"50%",
      left:"50%",
      transform:"translate(-50%, -50%)",
      zIndex:"9999", 
      boxShadow:"2xl",
      maxW:"md",
      w:"90%"
    },
    dialogTitle: {
      fontSize:"lg",
      fontWeight:"bold"
    },
    dialogSubtitle: {
      color:"gray.400",
      fontSize:"sm"
    },
  },
});