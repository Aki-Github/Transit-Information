import { FC, memo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Login } from '../components/pages/Login';
import { HomeRoutes } from './HomeRoutes';
import { Page404 } from '../components/pages/Page404';
import { HeaderLayout } from '../components/templates/HeaderLayout';

export const Router: FC = memo(() => {
  return (
    <Routes>
        <Route path="/" element={<Login/>}/>
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
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
});