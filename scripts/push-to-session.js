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

function formatFileSize(filePath) {
  return (fs.statSync(filePath).size / 1024).toFixed(2);
}

function createDataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'html' ? 'text/html' : `text/${ext || 'plain'}`;
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

function buildResult(channel, filePath) {
  return {
    channel,
    success: false,
    method: 'local-only',
    file_path: filePath,
    file_name: path.basename(filePath),
    file_size_kb: formatFileSize(filePath),
    detail: '',
    extra: {},
  };
}

function looksSuccessful(output, fallbackToken) {
  if (!output) return false;
  if (fallbackToken && output.includes(fallbackToken)) return false;
  return !/SEND_FALLBACK|UPLOAD_FALLBACK|error|failed|not found|unknown/i.test(output);
}

function runShell(command, timeout = 30000) {
  try {
    const { execSync } = require('child_process');
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: String(output || '').trim() };
  } catch (err) {
    return {
      ok: false,
      output: `${err.stdout || ''}\n${err.stderr || ''}`.trim(),
      error: err.message,
    };
  }
}

/**
 * 通过 WebChat/OpenClaw Web UI 推送
 * 提供直接的下载链接和 base64 预览
 */
async function pushViaWebChat(filePath) {
  const result = buildResult('webchat', filePath);
  console.log(`[Tianphoto] WebChat 渠道，生成下载链接: ${path.basename(filePath)}`);

  // 生成 base64 data URL（用于浏览器直接打开）
  const dataUrl = createDataUrl(filePath);

  console.log('');
  console.log('='.repeat(60));
  console.log('📄 Tianphoto 图文页面已生成');
  console.log('='.repeat(60));
  console.log(`文件: ${path.basename(filePath)}`);
  console.log(`大小: ${result.file_size_kb} KB`);
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

  result.success = true;
  result.method = 'webchat-download-page';
  result.detail = 'Generated a browser-openable download page and data URL.';
  result.extra.download_page = downloadPagePath;
  return result;
}

async function pushGenericMessage(filePath, channel) {
  const result = buildResult(channel, filePath);
  console.log(`[Tianphoto] 文件已生成: ${filePath}`);
  console.log(`[Tianphoto] 文件大小: ${result.file_size_kb} KB`);

  const message = `📄 Tianphoto 生成的图文页面 · ${path.basename(filePath)}`;
  const send = runShell(
    `openclaw message send --filePath "${filePath}" --message "${message}" 2>&1 || echo "SEND_FALLBACK"`
  );

  if (looksSuccessful(send.output, 'SEND_FALLBACK')) {
    result.success = true;
    result.method = 'openclaw-message-send';
    result.detail = 'HTML file was sent back to the current session.';
    return result;
  }

  result.detail = send.output || send.error || 'message send unavailable';
  return result;
}

/**
 * 通过飞书推送文件
 */
async function pushViaFeishu(filePath) {
  const result = buildResult('feishu', filePath);
  console.log(`[Tianphoto] 通过飞书推送: ${path.basename(filePath)}`);

  const upload = runShell(
    `openclaw tool feishu_drive_file --action upload --file_path "${filePath}" --folder_token "" 2>&1 || echo "UPLOAD_FALLBACK"`
  );

  if (looksSuccessful(upload.output, 'UPLOAD_FALLBACK')) {
    result.success = true;
    result.method = 'feishu_drive_file.upload';
    result.detail = 'Uploaded via OpenClaw Feishu drive tool.';
    return result;
  }

  const fallback = await pushGenericMessage(filePath, 'feishu');
  if (fallback.success) {
    fallback.method = 'feishu-fallback:openclaw-message-send';
    return fallback;
  }

  result.detail = upload.output || upload.error || fallback.detail || 'feishu push unavailable';
  return result;
}

/**
 * 通过 Discord 推送文件
 */
async function pushViaDiscord(filePath) {
  console.log(`[Tianphoto] 通过 Discord 推送: ${path.basename(filePath)}`);
  const result = await pushGenericMessage(filePath, 'discord');
  if (result.success) result.method = 'discord-fallback:openclaw-message-send';
  return result;
}

/**
 * 通过 Slack 推送文件
 */
async function pushViaSlack(filePath) {
  console.log(`[Tianphoto] 通过 Slack 推送: ${path.basename(filePath)}`);
  const result = await pushGenericMessage(filePath, 'slack');
  if (result.success) result.method = 'slack-fallback:openclaw-message-send';
  return result;
}

/**
 * 通用推送（返回文件路径供用户下载）
 */
async function pushGeneric(filePath) {
  return pushGenericMessage(filePath, 'generic');
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

  let result = buildResult(channel, filePath);

  switch (channel) {
    case 'webchat':
      result = await pushViaWebChat(filePath);
      break;
    case 'feishu':
      result = await pushViaFeishu(filePath);
      break;
    case 'discord':
      result = await pushViaDiscord(filePath);
      break;
    case 'slack':
      result = await pushViaSlack(filePath);
      break;
    default:
      result = await pushGeneric(filePath);
  }

  if (!result.success) {
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

  console.log(
    `[Tianphoto] 回传状态: ${result.success ? 'success' : 'local-only'} ` +
    `(${result.method})`
  );

  // 始终返回文件路径，供调用方使用
  console.log(`TIANPHOTO_OUTPUT_FILE:${filePath}`);
  console.log(`TIANPHOTO_PUSH_RESULT:${JSON.stringify(result)}`);
}

main().catch(err => {
  console.error('[Tianphoto] 推送失败:', err);
  process.exit(1);
});
