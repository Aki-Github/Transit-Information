import { FC, useState } from "react";
import { Box, Heading, Text, Button, Stack, Card, Badge, Flex, SimpleGrid } from "@chakra-ui/react";

import { useMessage } from '../../hooks/useMessage';
import { useSyncTimetable } from "../../hooks/admin/useSyncTimetable";

// 🗺️ 都営地下鉄4路線の定義マスタ
const SUBWAY_LINES = [
  { id: "Asakusa",  name: "浅草線", color: "red.500",    apiId: "odpt.Railway:Toei.Asakusa" },
  { id: "Mita",     name: "三田線", color: "blue.500",    apiId: "odpt.Railway:Toei.Mita" },
  { id: "Shinjuku", name: "新宿線", color: "green.500",   apiId: "odpt.Railway:Toei.Shinjuku" },
  { id: "Oedo",     name: "大江戸線", color: "purple.500", apiId: "odpt.Railway:Toei.Oedo" },
  { id: "Arakawa", name: "さくらトラム", color: "pink.500", apiId: "odpt.Railway:Toei.Arakawa" },
];

export const AdminDashboard: FC = () => {
  // 現在どの路線を同期処理中かを管理するステート（null の時は何も処理していない）
  const [ activeLine, setActiveLine ] = useState<string | null>(null);
  const { showMessage } = useMessage();
  const { syncTimetable, loading } = useSyncTimetable();

  const handleSyncTimetable = async (lineId: string, lineName: string) => {
    // ユーザーに確認を促す
    const isConfirmed = window.confirm(`💥 ${lineName} の全駅時刻表データを同期します。よろしいですか？`);
    if (!isConfirmed) return;

    setActiveLine(lineId); // ローディング対象をセット

    // 同期処理の実行
    const result = await syncTimetable(lineId);

    if (result.success) {
      showMessage({
          title: `🎉 同期が成功しました！合計 ${result.count} 件のタイムテーブルデータを更新しました。`,
          type: 'success'
        });
    } else {
      showMessage({
          title: `❌ 同期に失敗しました`,
          type: 'error'
        });
    }

    setActiveLine(null);
  };

  return (
    <Box maxW="4xl" mx="auto" p="6" color="white">
      <Heading size="lg" mb="2" borderBottom="2px solid" color="gray.800" borderColor="teal.500" pb="2">
        🛠️ 首都圏運行情報アプリ - 管理者ダッシュボード
      </Heading>
      <Text color="gray.400" mb="6">
        アプリケーションのマスタデータ管理および外部API（odpt）とのデータ同期を行います。
      </Text>

      <Stack gap="6">
        <Card.Root bg="gray.900" borderColor="gray.800" variant="outline">
          <Card.Header>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="teal.300">📅 時刻表データの管理</Heading>
              <Badge colorPalette="teal">station_timetables</Badge>
            </Flex>
          </Card.Header>
          <Card.Body>
            <Text fontSize="sm" color="gray.300" mb="4">
              東京メトロ・都営地下鉄などの公式な「駅時刻表データ」をodpt APIからフェッチし、Supabaseのデータベースに最新情報を一括保存（UPSERT）します。
            </Text>
          </Card.Body>
          {/* ⭕ 4路線の同期ボタンを2列の綺麗に並んだグリッドで配置 */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              {SUBWAY_LINES.map((line) => {
                // このボタンが現在同期中かどうか
                const isCurrentLoading = loading && activeLine === line.id;
                // 他の路線が同期中かどうか（自分以外のボタンを無効化するため）
                const isAnyOtherLoading = loading && activeLine !== line.id;

                return (
                  <Box 
                    key={line.id} 
                    p="4" 
                    bg="gray.950" 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="gray.800"
                  >
                    <Flex justify="space-between" align="center" mb="3">
                      <Flex align="center" gap="2">
                        <Box w="3" h="3" borderRadius="full" bg={line.color} />
                        <Text fontWeight="bold" fontSize="sm">{line.name}</Text>
                      </Flex>
                      <Text fontSize="10px" color="gray.500" fontFamily="mono">{line.id}</Text>
                    </Flex>
                    
                    <Button 
                      w="full"
                      colorPalette="teal" 
                      variant="outline"
                      size="sm"
                      loading={isCurrentLoading}
                      disabled={isAnyOtherLoading}
                      onClick={() => handleSyncTimetable(line.id, line.name)}
                    >
                      🔄 {line.name}データを同期
                    </Button>
                  </Box>
                );
              })}
            </SimpleGrid>
        </Card.Root>
      </Stack>
    </Box>
  );
};