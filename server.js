// 简单静态文件服务器
// 使用 express 托管 www.team85.cn 目录下所有静态文件
// 访问 http://localhost:3000 即可预览网站

/**
 * @file server.js
 * @description 静态资源服务器，基于 express
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// 静态文件目录
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`静态服务器已启动：http://localhost:${PORT}`);
}); 