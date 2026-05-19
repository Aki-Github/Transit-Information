# 首都圏運行情報アプリ

Chakra UI v3 と React (TypeScript) を使用して構築した、シンプルでモダンなユーザー管理フロントエンドアプリケーションです。

## 🚀 デモ (オプション)
- 公開URL: [ここにURL]

## ✨ 主な機能
- **首都圏鉄道 運行情報**: 外部API（公共交通オープンデータセンターODPT）から取得した運行情報をカード形式で綺麗に整列・レスポンシブ表示
- **バス停マップ**: 首都圏の駅名や地名を検索して、周辺のバス停を国土地理院の地図上にピンで配置
- **トースト通知**: ログインなどのアクション成否を右上にトーストメッセージでユーザーへ通知

## 🛠 使用技術
- **Frontend**: React (TypeScript), Create React App
- **UI Library**: Chakra UI v3 (最新のコンポーネントシステムに対応)
- **State Management / Hooks**: React Hooks (`useEffect`, `useCallback` による最適化)

## 💡 こだわった点・学んだこと
- **Chakra UI v3 への対応**: 
  旧バージョン（v2）の `useToast` や `WrapItem`、`FormControl` から、v3 の新しい `toaster`、`Dialog`、`Field` システムへとコードを現代的にリファクタリングし、最新のコンポーネント設計を学びました。
- **UI/UX の調整**: 
  モーダルの表示位置を画面上部に固定するカスタムスタイルを適用したり、×ボタンにスニペットを活用するなど、ユーザーが操作しやすいレイアウトを意識しました。
- **パフォーマンス最適化**:
  `useCallback` や依存配列（dependency array）を適切に整理し、無駄な再レンダリングを防ぐ実装を行いました。

## 📦 ディレクトリ構造
```text
src/
├── components/
│   ├── ui/          # Chakra UI v3 のスニペット（toaster, close-buttonなど）
│   ├── organisms/   # ユーザーカードなどの主要パーツ
│   └── pages/       # 各画面（UserManagementなど）
├── hooks/           # カスタムフック（useMessage, useAllUsersなど）
└── App.tsx          # エントリーポイント


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
