import { Box, Flex, Heading, Link } from '@chakra-ui/react';
import { FC, memo, useState, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from "../../../components/ui/menu";

import { MenuIconButton } from '../../atomos/button/MenuIconButton';
import { MenuDrawer } from '../../molecules/MenuDrawer';
import { LoginUserContext } from "../../../providers/LoginUserProvider";
import { supabase } from "../../../lib/supabaseClient"; // これを追加
import { useAdmin } from "../../../hooks/admin/useAdmin";

export const Header: FC = memo(() => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin(); // ⭕ 管理者判定を取得
  const { setLoginUser } = useContext(LoginUserContext);

  // 開閉状態を自分で持つようにします
  const [open, setOpen] = useState(false);

  // 便利なハンドラを用意
  const onOpen = () => setOpen(true);
  
  // 遷移と閉じるを同時に行う関数
  const onClickNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // ログアウト処理の関数
  const onClickLogout = async () => {
    try {
      // 1. Supabaseのセッションを破棄
      await supabase.auth.signOut();
      
      // 2. Reactアプリ内のユーザー状態をクリア
      setLoginUser(null);
      
      // 3. ログイン画面へ遷移
      navigate("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <>
      <Flex 
        as="nav" 
        bg="teal.500" 
        color="gray.50" 
        align="center" 
        justify="space-between" 
        padding={{ base: 3, md: 5 }}
      >
        <RouterLink to="/home" style={{ textDecoration: "none", color: "inherit" }}>
          <Flex 
            align="center" 
            mr={8} 
            _hover={{ cursor: "pointer", opacity: 0.8 }}
          >
            <Heading as="h1" fontSize={{ base: "md", md: "lg" }}>
              首都圏運行情報アプリ
            </Heading>
          </Flex>
        </RouterLink>

        <Flex align="center" fontSize="sm" flexGrow={2} display={{ base: "none", md: "flex" }}>
          <Box pr={4}>
            <RouterLink to="/home/english_info" style={{ textDecoration: "none" }}>
              <Link as="span" color="inherit" _hover={{ opacity: 0.8 }}>
                English Info
              </Link> 
            </RouterLink>
          </Box>

          {/* <Box pr={4}>
            <RouterLink to="/home/departure_board" style={{ textDecoration: "none" }}>
              <Link as="span" color="inherit" _hover={{ opacity: 0.8 }}>
                発車情報
              </Link> 
            </RouterLink>
          </Box> */}

          {/* バス運行ナビ */}
          <Box pr={4}>
            <MenuRoot positioning={{ placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <Link 
                  as="span" 
                  color="inherit" 
                  _hover={{ opacity: 0.8, cursor: "pointer" }}
                  userSelect="none"
                >
                  バス運行ナビ ▼
                </Link>
              </MenuTrigger>

              <MenuContent bg="gray.800" borderColor="gray.700" color="white" minW="160px">
                <MenuItem 
                  value="map_tokyo" 
                  color="white"
                  _hover={{ bg: "gray.600", color: "white" }} 
                  onClick={() => navigate("/bus/tokyo")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 バス停マップ（東京・埼玉）
                </MenuItem>
                <MenuItem 
                  value="board_toei" 
                  color="white"
                  _hover={{ bg: "green.600", color: "white" }} 
                  onClick={() => navigate("/bus/board_toei")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 発車掲示板（都営バス）
                </MenuItem>
                <MenuItem 
                  value="board_seibu" 
                  color="white"
                  _hover={{ bg: "#0bbfe3", color: "white" }} 
                  onClick={() => navigate("/bus/board_seibu")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 発車掲示板（西武バス）
                </MenuItem>
                <MenuItem 
                  value="board_keio" 
                  color="white"
                  _hover={{ bg: "#00053a", color: "white" }} 
                  onClick={() => navigate("/bus/board_keio")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 発車掲示板（京王バス）
                </MenuItem>
                <MenuItem 
                  value="board_nishitokyo" 
                  color="white"
                  _hover={{ bg: "#EF2127", color: "white" }} 
                  onClick={() => navigate("/bus/board_nishitokyo")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 発車掲示板（西東京バス）
                </MenuItem>
                <MenuItem 
                  value="keio" 
                  color="white"
                  _hover={{ bg: "red.600", color: "white" }} 
                  onClick={() => navigate("/bus/keio")}
                  cursor="pointer"
                  py="2"
                >
                  🚌 京王バス（モニター）
                </MenuItem>
              </MenuContent>
            </MenuRoot>
          </Box>

          {/* 東京都交通局運行ナビ */}
          <Box pr={4}>
            <MenuRoot positioning={{ placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <Link 
                  as="span" 
                  color="inherit" 
                  _hover={{ opacity: 0.8, cursor: "pointer" }}
                  userSelect="none"
                >
                  東京都交通局運行ナビ ▼
                </Link>
              </MenuTrigger>

              <MenuContent bg="gray.800" borderColor="gray.700" color="white" minW="160px">
                <MenuItem 
                  value="asakusa" 
                  color="white"
                  _hover={{ bg: "red.600", color: "white" }} 
                  onClick={() => navigate("/live/asakusa")}
                  cursor="pointer"
                  py="2"
                >
                  🚇 浅草線ナビ
                </MenuItem>
                <MenuItem 
                  value="mita" 
                  color="white"
                  _hover={{ bg: "blue.600", color: "white" }} 
                  onClick={() => navigate("/live/mita")}
                  cursor="pointer"
                  py="2"
                >
                  🚇 三田線ナビ
                </MenuItem>
                <MenuItem 
                  value="shinjuku" 
                  color="white"
                  _hover={{ bg: "green.600", color: "white" }} 
                  onClick={() => navigate("/live/shinjuku")}
                  cursor="pointer"
                  py="2"
                >
                  🚇 新宿線ナビ
                </MenuItem>
                <MenuItem 
                  value="oedo" 
                  color="white"
                  _hover={{ bg: "purple.600", color: "white" }} 
                  onClick={() => navigate("/live/oedo")}
                  cursor="pointer"
                  py="2"
                >
                  🚇 大江戸線ナビ
                </MenuItem>
                <MenuItem 
                  value="arakawa" 
                  color="white"
                  _hover={{ bg: "pink.600", color: "white" }} 
                  onClick={() => navigate("/live/arakawa")}
                  cursor="pointer"
                  py="2"
                >
                  🚇 さくらトラム ナビ
                </MenuItem>
              </MenuContent>
            </MenuRoot>
          </Box>

          {/* 管理者（isAdmin === true）の時だけ、ひっそりとメニューを表示する */}
          {isAdmin && (
            <Box pr={4}>
              <RouterLink to="/admin" style={{ textDecoration: "none" }}>
                <Link as="span" color="inherit" _hover={{ opacity: 0.8 }}>
                  管理者ダッシュボード
                </Link>
              </RouterLink>
            </Box>
          )}

          <RouterLink to="/home/settings" style={{ textDecoration: "none", color: "inherit" }}>
            <Link 
              as="span" 
              color="inherit" 
              _hover={{ opacity: 0.8, cursor: "pointer" }} // カーソルをポインターにする
              onClick={onClickLogout} // クリックイベントを設定
            >
              ログアウト
            </Link>
          </RouterLink>
        </Flex>

        <MenuIconButton onOpen={onOpen} />
      </Flex>

      <MenuDrawer open={open} setOpen={setOpen} onClickNav={onClickNav} />
    </>
  );
});