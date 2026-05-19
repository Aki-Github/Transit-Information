import { Box, Flex, Heading, Input, Separator, Stack } from '@chakra-ui/react';
import { FC, memo, useState, ChangeEvent } from 'react';
import { PrimaryButton } from '../atomos/button/PrimaryButton';
import { useAuth } from '../../hooks/useAuth';

export const Login: FC = memo(() => {
  const { login, loading } = useAuth();

  // メールアドレス（旧userId）とパスワードの状態
  // const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);
    // const onChangeUserId = (e: React.ChangeEvent<HTMLInputElement>) => {
    //   setUserId(e.target.value);
    // };

  const onClickLogin = () => login(email, password);

  return (
    <Flex align="center" justify="center" height="100vh">
      <Box bg="white" w="sm" p={4} borderRadius="md" boxShadow="md">
        <Heading as="h1" size="lg" textAlign="center">
          首都圏運行情報アプリ
        </Heading>
        <Separator my={4} />
        <Stack gap={6} py={4} px={10}>
          <Input
            placeholder="メールアドレス"
            mb={4}
            value={email}
            onChange={onChangeEmail}
          />
          <Input
            placeholder="パスワード"
            type="password"
            mb={4}
            value={password}
            onChange={onChangePassword}
          />
          <PrimaryButton 
            onClick={onClickLogin} 
            loading={loading} 
            disabled={email === '' || password === ''}
          >
            ログイン
          </PrimaryButton>
        </Stack>
      </Box>
    </Flex>
  );
});