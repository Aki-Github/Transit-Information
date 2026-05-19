import { FC, memo } from "react";
import { Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { LoginUserContext } from "../../../providers/LoginUserProvider";

export const LogoutButton: FC = memo(() => {
  const navigate = useNavigate();
  const { setLoginUser } = useContext(LoginUserContext);

  const onClickLogout = () => {
    // 1. ユーザー状態をクリア
    setLoginUser(null);
    // 2. ログイン画面（ルートなど）へ遷移
    navigate("/");
  };

  return (
    <Button
      colorScheme="red"
      variant="outline"
      size="sm"
      onClick={onClickLogout}
    >
      ログアウト
    </Button>
  );
});