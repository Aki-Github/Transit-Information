import { FC, memo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Login } from '../components/pages/Login';
import { HomeRoutes } from './HomeRoutes';
import { LiveRoutes } from './LiveRoutes';
import { Page404 } from '../components/pages/Page404';
import { HeaderLayout } from '../components/templates/HeaderLayout';
import { AdminGuard } from '../components/pages/AdminGuard';
import { AdminDashboard } from '../components/pages/AdminDashboard';

export const Router: FC = memo(() => {
  return (
    <Routes>
      <Route path="/" element={<Login/>}/>
      {/* 🏠 ホーム関連ルート */}
      <Route path="/home" element={<HeaderLayout />}>
        {HomeRoutes.map((route) => (
          <Route
            key={route.path}
            // index: true を使うと、親と同じパス("/home")の場合にその要素を出す設定になります
            index={route.path === "/"} 
            path={route.path === "/" ? undefined : route.path}
            element={route.element}
          />
        ))}
      </Route>
      {/* 🚇 ライブナビ関連ルート */}
      <Route path="/live" element={<HeaderLayout />}>
        {LiveRoutes.map((route) => (
          <Route
            key={route.path}
            // index: true を使うと、親と同じパス("/home")の場合にその要素を出す設定になります
            index={route.path === "/"} 
            path={route.path === "/" ? undefined : route.path}
            element={route.element}
          />
        ))}
      </Route>
        {/* ⭕ 管理者専用ルート（HeaderLayout の中にネストし、AdminGuardで囲う） */}
      <Route path="/admin" element={<HeaderLayout />}>
        <Route 
          index // 親のパス（/admin）のときにそのまま表示する設定
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          } 
        />
      </Route>
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
});