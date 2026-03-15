#!/usr/bin/env node

/**
 * push-to-session.js — Tianphoto: 自动推送 HTML 文件到当前会话
 * 
 * 检测当前会话渠道（飞书/Discord/Slack等），并使用对应工具推送生成的 HTML 文件
 * 用法: node push-to-session.js <html-file-path>
 */

const fs = require('fs');
const path = require('path');

// 支持的渠道和对应的环境变量/检测方式
const CHANNEL_DETECTORS = {
  webchat: () => process.env.OPENCLAW_CHANNEL === 'webchat' || process.env.WEBCHAT_SESSION,
  feishu: () => process.env.OPENCLAW_CHANNEL === 'feishu' || process.env.FEISHU_CHAT_ID,
  discord: () => process.env.OPENCLAW_CHANNEL === 'discord',
  slack: () => process.env.OPENCLAW_CHANNEL === 'slack',
  telegram: () => process.env.OPENCLAW_CHANNEL === 'telegram',
  // 通用：通过 OpenClaw 上下文检测
  generic: () => true
};

/**
 * 检测当前会话渠道
 */
function detectChannel() {
  for (const [channel, detector] of Object.entries(CHANNEL_DETECTORS)) {
    if (detector()) {
      return channel;
    }
  }
  return 'generic';
}

/**
 * 通过飞书推送文件
 */
async function pushViaFeishu(filePath) {
  console.log(`[Tianphoto] 通过飞书推送: ${path.basename(filePath)}`);
  
  // 检查 feishu_drive_file 工具是否可用
  try {
    // 使用 feishu_drive_file upload 功能
    const { execSync } = require('child_process');
    
    // 上传到飞书云空间并发送
    const result = execSync(
      `openclaw tool feishu_drive_file --action upload --file_path "${filePath}" --folder_token "" 2>&1 || echo "UPLOAD_FALLBACK"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    
    console.log('[Tianphoto] 飞书推送结果:', result);
    return true;
  } catch (err) {
    console.error('[Tianphoto] 飞书推送失败:', err.message);
    return false;
  }
}

/**
 * 通过 Discord 推送文件
 */
async function pushViaDiscord(filePath) {
  console.log(`[Tianphoto] 通过 Discord 推送: ${path.basename(filePath)}`);
  // Discord 文件推送实现
  return false;
}

/**
 * 通过 Slack 推送文件
 */
async function pushViaSlack(filePath) {
  console.log(`[Tianphoto] 通过 Slack 推送: ${path.basename(filePath)}`);
  // Slack 文件推送实现
  return false;
}

/**
 * 通用推送（返回文件路径供用户下载）
 */
async function pushGeneric(filePath) {
  console.log(`[Tianphoto] 文件已生成: ${filePath}`);
  console.log(`[Tianphoto] 文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  
  // 尝试使用 OpenClaw 的 message 工具发送文件
  try {
    const { execSync } = require('child_process');
    
    // 生成文件下载链接或提示
    const fileName = path.basename(filePath);
    
    // 检查是否可以通过 message 工具发送
    const result = execSync(
      `openclaw message send --filePath "${filePath}" --message "📄 Tianphoto 生成的图文页面" 2>&1 || echo "SEND_FALLBACK"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    
    if (!result.includes('SEND_FALLBACK') && !result.includes('error')) {
      console.log('[Tianphoto] 文件已发送到会话');
      return true;
    }
  } catch (err) {
    // 忽略错误，使用备用方案
  }
  
  return false;
}

/**
 * 通过 WebChat/OpenClaw Web UI 推送
 * 提供直接的下载链接和 base64 预览
 */
async function pushViaWebChat(filePath) {
  console.log(`[Tianphoto] WebChat 渠道，生成下载链接: ${path.basename(filePath)}`);
  
  const stats = fs.statSync(filePath);
  const fileSize = (stats.size / 1024).toFixed(2);
  
  // 生成 base64 data URL（用于浏览器直接打开）
  const dataUrl = createDataUrl(filePath);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('📄 Tianphoto 图文页面已生成');
  console.log('='.repeat(60));
  console.log(`文件: ${path.basename(filePath)}`);
  console.log(`大小: ${fileSize} KB`);
  console.log(`路径: ${filePath}`);
  console.log('');
  console.log('💡 提示: 在浏览器中打开以下链接查看/编辑：');
  console.log(dataUrl.substring(0, 100) + '...');
  console.log('');
  console.log('📥 下载方式:');
  console.log('1. 点击浏览器链接直接打开');
  console.log('2. 在打开的页面中点击"保存"按钮下载');
  console.log('3. 或使用文件路径手动复制');
  console.log('='.repeat(60));
  
  // 尝试生成一个可直接点击的 HTML 下载页面
  const downloadHtml = generateDownloadPage(filePath, dataUrl);
  const downloadPagePath = filePath.replace('.html', '-download.html');
  fs.writeFileSync(downloadPagePath, downloadHtml, 'utf-8');
  console.log(`[Tianphoto] 下载页面已生成: ${downloadPagePath}`);
  
  return true;
}

/**
 * 生成带有点击下载按钮的 HTML 页面
 */
function generateDownloadPage(originalFilePath, dataUrl) {
  const fileName = path.basename(originalFilePath);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>下载 Tianphoto 图文</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.container {
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 40px;
}
h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 12px;
}
p {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}
.btn {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  text-decoration: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 8px;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}
.btn-secondary {
  background: #f5f5f5;
  color: #333;
}
.btn-secondary:hover {
  background: #e8e8e8;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.tips {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #eee;
  text-align: left;
}
.tips h3 {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
}
.tips ul {
  font-size: 13px;
  color: #666;
  padding-left: 20px;
}
.tips li {
  margin-bottom: 8px;
}
</style>
</head>
<body>
<div class="container">
  <div class="icon">📄</div>
  <h1>图文页面已生成</h1>
  <p>${fileName}</p>
  <a href="${dataUrl}" class="btn" download="${fileName}">⬇️ 直接下载 HTML</a>
  <a href="${dataUrl}" class="btn btn-secondary" target="_blank">👁️ 在浏览器中打开</a>
  <div class="tips">
    <h3>💡 使用提示：</h3>
    <ul>
      <li>在浏览器中打开后，可以直接点击文字进行编辑</li>
      <li>支持拖拽插入图片</li>
      <li>编辑完成后，点击页面底部的"保存"按钮下载</li>
      <li>也可以点击"导出"按钮生成 PNG 切片</li>
    </ul>
  </div>
</div>
</body>
</html>`;
}

/**
 * 主函数
 */
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('用法: node push-to-session.js <html-file-path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  const channel = detectChannel();
  console.log(`[Tianphoto] 检测到渠道: ${channel}`);
  
  let success = false;
  
  switch (channel) {
    case 'webchat':
      success = await pushViaWebChat(filePath);
      break;
    case 'feishu':
      success = await pushViaFeishu(filePath);
      break;
    case 'discord':
      success = await pushViaDiscord(filePath);
      break;
    case 'slack':
      success = await pushViaSlack(filePath);
      break;
    default:
      success = await pushGeneric(filePath);
  }
  
  if (!success) {
    // 备用方案：生成 data URL
    console.log('[Tianphoto] 生成备选访问方式...');
    console.log(`[Tianphoto] 文件位置: ${filePath}`);
    
    // 如果是小文件，可以输出 base64 预览
    const stats = fs.statSync(filePath);
    if (stats.size < 50000) { // 小于 50KB
      const dataUrl = createDataUrl(filePath);
      console.log(`[Tianphoto] Data URL (复制到浏览器打开):`);
      console.log(dataUrl.substring(0, 200) + '...');
    }
  }
  
  // 始终返回文件路径，供调用方使用
  console.log(`TIANPHOTO_OUTPUT_FILE:${filePath}`);
}

main().catch(err => {
  console.error('[Tianphoto] 推送失败:', err);
  process.exit(1);
});
