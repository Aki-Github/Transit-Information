import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMessage } from './useMessage';
import { useLoginUser } from './useLoginUser';
import { supabase } from '../lib/supabaseClient'; // 事前に作成したクライアントをインポート

export const useAuth = () => {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { setLoginUser } = useLoginUser();

  const [loading, setLoading] = useState(false);

  // 引数を email と password に変更
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);

  // ログイン処理を実装
  try {
      // 1. Supabaseでログイン実行
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // ログイン失敗（パスワード間違い、ユーザー未登録など）
        showMessage({
          title: 'ログインに失敗しました',
          type: 'error'
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // 2. ログイン成功
        // profilesテーブルから isAdmin などの追加情報を取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, full_name, is_admin')
          .eq('id', data.user.id)
          .single();

        setLoginUser({
          id: data.user.id,
          name: profile?.full_name ?? "Guest",
          username: profile?.name ?? "guest",
          email: data.user.email ?? "",
          isAdmin: profile?.is_admin ?? false
        });

        showMessage({
          title: 'ログインしました',
          type: 'success'
        });
        
        navigate('/home');
      }
    } catch (error) {
      // ネットワークエラーなど予期せぬエラー
      showMessage({
        title: 'エラーが発生しました',
        type: 'error'
      });
      setLoading(false);
    }
  }, [navigate, showMessage, setLoginUser]);

  return { login, loading };
};