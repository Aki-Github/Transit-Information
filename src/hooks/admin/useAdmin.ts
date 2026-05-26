import { useLoginUser } from "../useLoginUser";

export const useAdmin = () => {
  // すでに用意されているログインユーザー状態を取得
  const { loginUser } = useLoginUser();

  // ログインしており、かつ isAdmin が true の場合のみ true
  const isAdmin = loginUser?.isAdmin ?? false;

  return { isAdmin, loginUser };
};