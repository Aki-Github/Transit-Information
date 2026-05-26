import { FC, memo, useEffect } from 'react'; // ★ useEffect をインポート

const fetchTest = async () => {
  const API_KEY = process.env.REACT_APP_ODPT_KEY; // .envからAPIキーを読み込み
  
  // 💡 【検証1】 条件を一切つけずに、今「東京メトロ全線」で走っている全列車をひっぱるURL
  const urlAllTrains = `https://api.odpt.org/api/v4/odpt:Train?acl:consumerKey=${API_KEY}`;
  
  console.log("APIキーの確認:", API_KEY ? "設定されています" : "空っぽです（.envの設定を確認してください）");
  console.log("検証APIを実行中...");

  try {
    const res = await fetch(urlAllTrains);
    const data = await res.json();
    console.log("【検証1】メトロ全線の列車データ（条件なし）:", data);
    
    // if (data.length > 0) {
    //   // 全線データの中から、銀座線のデータがAPI内部でどういう文字列で定義されているか生データを確認する
    //   const ginzaSample = data.filter((t: any) => t["odpt:railway"].includes("Ginza") || t["odpt:railway"].includes("ginza"));
    //   console.log("【検証2】全線データから見つけた銀座線のサンプル:", ginzaSample);
    // } else {
    //   console.log("【警告】全線で叩いてもデータが0件です。APIキーの権限で東京メトロのリアルタイムデータが許可されていない可能性があります。");
    // }
    if (data.length > 0) {
        // 💡 今走っているすべての列車の「路線IDプロパティ」を重複なく集める
        const allRailways = Array.from(new Set(data.map((t: any) => t["odpt:railway"])));
        console.log("【最終確認】現在APIに存在する正しい路線ID一覧:\n", allRailways.join("\n"));
    }
  } catch (e) {
    console.error("通信自体に失敗しました:", e);
  }

  // 💡 【検証2】 運行情報全体をひっぱるURL
  const urlJrEast = `https://api.odpt.org/api/v4/odpt:TrainInformation?acl:consumerKey=${API_KEY}`;

   try {
    const res = await fetch(urlJrEast);
    const data = await res.json();
    console.log("【検証2】運行情報:", data);
  } catch (e) {
    console.error("通信自体に失敗しました:", e);
  }
};

export const Test: FC = memo(() => {
  
  // ★ 1. ページが読み込まれた時に1回だけ自動で fetchTest を実行する
  useEffect(() => {
    fetchTest();
  }, []); // 空の配列 [] を渡すことで、最初の一度だけ実行されます

  return (
    <div style={{ padding: '20px' }}>
      <h2>鉄道位置データ 検証ページ</h2>
      <p>ページを開いた瞬間に、開発者ツール（コンソール）へログを出力しています。</p>
      
      {/* ★ 2. 手動で何度でも再テストできるようにボタンも配置 */}
      <button 
        onClick={fetchTest} 
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        もう一度APIを叩く
      </button>
    </div>
  );
});