import { FC, ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../../hooks/admin/useAdmin";
import { Center, Spinner } from "@chakra-ui/react";

interface AdminGuardProps {
  children: ReactNode;
}

export const AdminGuard: FC<AdminGuardProps> = ({ children }) => {
  const { isAdmin, loginUser } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    // ログイン情報が確定している状態で、管理者でなければホームへリダイレクト
    if (loginUser && !isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, loginUser, navigate]);

  // まだログイン情報を読み込み中などの場合はローディングを表示
  if (!loginUser) {
    return (
      <Center h="100vh">
        <Spinner color="teal.500" />
      </Center>
    );
  }

  // 管理者であれば、中身（管理画面）を表示する
  return isAdmin ? <>{children}</> : null;
};