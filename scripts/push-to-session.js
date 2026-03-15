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
 * 将 HTML 内容转换为 base64 数据链接（用于嵌入）
 */
function createDataUrl(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const base64 = Buffer.from(content).toString('base64');
  return `data:text/html;base64,${base64}`;
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
