export type OperatorConfig = {
  id: string;          // 事業者ID (例: "odpt.Operator:JR-East")
  title: string;       // 画面表示用のタイトル
  railwayIds: string[]; // その事業者が持つ主要路線のIDリスト
};