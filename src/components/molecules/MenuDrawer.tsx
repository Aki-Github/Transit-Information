import { Drawer, Button, Stack } from '@chakra-ui/react';
import { FC, memo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginUserContext } from '../../providers/LoginUserProvider';
import { supabase } from '../../lib/supabaseClient'; // Supabaseクライアント

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onClickNav: (path: string) => void;
};

export const MenuDrawer: FC<Props> = memo((props) => {
  const { open, setOpen, onClickNav } = props;

  const navigate = useNavigate();
  const { setLoginUser } = useContext(LoginUserContext);

  // ドロワー用のログアウト処理
  const onClickLogout = async () => {
    try {
      // 1. まずドロワーを閉じる（画面遷移後の残存を防ぐため）
      setOpen(false);
      
      // 2. Supabaseのセッションを破棄
      await supabase.auth.signOut();
      
      // 3. Reactアプリ内のユーザー状態をクリア
      setLoginUser(null);
      
      // 4. ログイン画面へ遷移
      navigate("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <Drawer.Root 
        open={open} 
        onOpenChange={(e) => setOpen(e.open)} 
        placement="top"
        >
        <Drawer.Backdrop />
        <Drawer.Content>
            <Drawer.Body p={0} bg="gray.100">
            <Stack gap="2" mt="4">
                <Button w="100%" variant="ghost" justifyContent="start" onClick={() => onClickNav("/home")}>
                TOP
                </Button>
                <Button w="100%" variant="ghost" justifyContent="start" onClick={() => onClickNav("/home/english_info")}>
                English Info
                </Button>
                <Button w="100%" variant="ghost" justifyContent="start" onClick={() => onClickNav("/home/busstop_map")}>
                バス停マップ
                </Button>
                <Button 
                  w="100%" 
                  variant="ghost" 
                  justifyContent="start" 
                  color="red.500" 
                  _hover={{ bg: "red.50", color: "red.600" }}
                  onClick={onClickLogout}
                >
                  ログアウト
                </Button>
            </Stack>
            </Drawer.Body>
            <Drawer.CloseTrigger />
        </Drawer.Content>
    </Drawer.Root>
  );
});