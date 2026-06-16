const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api-keio', // 💡 フロント側でこのパスを叩くと中継します
    createProxyMiddleware({
      target: 'https://api.odpt.org', // 💡 実際のアクセス先
      changeOrigin: true,
      pathRewrite: {
        '^/api-keio': '', // URLの先頭の「/api-keio」を消してodptへ転送
      },
    })
  );
};