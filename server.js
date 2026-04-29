import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHttpsServerOptions } from 'office-addin-dev-certs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const settingsPath = path.join(__dirname, 'data', 'settings.json');

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/assets/icon-:size.png', (req, res) => {
  const size = Number(req.params.size) || 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 80 80">
    <rect width="80" height="80" fill="#b8b5ae"/>
    <path d="M24 13h26l12 12v42H24z" fill="#f7f5ef"/>
    <path d="M50 13v13h12z" fill="#ddd9d0"/>
    <path d="M18 22v49h42" fill="none" stroke="#202020" stroke-width="5"/>
    <path d="M21 66L63 24" stroke="#df3a3a" stroke-width="7" stroke-linecap="square"/>
    <path d="M52 52h11v7H52z" fill="#202020"/>
    <path d="M54 47l5 5-5 5z" fill="#ffffff"/>
    <path d="M62 47l-5 5 5 5z" fill="#ffffff"/>
  </svg>`;
  res.type('image/svg+xml').send(svg);
});

app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.redirect('/src/taskpane.html');
});

app.get('/api/settings', async (_req, res) => {
  res.json(await readSettings());
});

app.put('/api/settings', async (req, res) => {
  const current = await readSettings();
  const next = {
    prompts: Array.isArray(req.body?.prompts) ? req.body.prompts : current.prompts,
    modelConfigs: Array.isArray(req.body?.modelConfigs) ? req.body.modelConfigs : current.modelConfigs,
    updatedAt: new Date().toISOString()
  };

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(next, null, 2));
  res.json({ ok: true, settings: next });
});

app.post('/api/revise', async (req, res) => {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const { text, prompt, provider, model, baseUrl, apiKey } = req.body ?? {};
    if (!text?.trim()) return res.status(400).json({ error: '缺少待修订文本。' });
    if (!prompt?.trim()) return res.status(400).json({ error: '缺少 Prompt。' });
    if (!provider || !model) return res.status(400).json({ error: '缺少 AI provider 或 model。' });

    const output = await callProvider({ provider, model, baseUrl, apiKey, prompt, text, signal: controller.signal });
    if (!res.destroyed) res.json({ output });
  } catch (error) {
    if (error.name === 'AbortError') {
      if (!res.headersSent && !res.destroyed) res.status(499).json({ error: '请求已取消。' });
      return;
    }
    console.error(error);
    if (!res.headersSent && !res.destroyed) res.status(500).json({ error: error.message || 'AI 调用失败。' });
  }
});

async function readSettings() {
  try {
    return JSON.parse(await fs.readFile(settingsPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function callProvider({ provider, model, baseUrl, apiKey, prompt, text, signal }) {
  if (provider === 'openai') {
    return callOpenAICompatible({
      baseUrl: baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      model,
      prompt,
      text,
      signal
    });
  }

  if (provider === 'anthropic') {
    return callAnthropic({
      baseUrl: baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      model,
      prompt,
      text,
      signal
    });
  }

  if (provider === 'gemini') {
    return callGemini({
      baseUrl: baseUrl || process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      model,
      prompt,
      text,
      signal
    });
  }

  throw new Error(`暂不支持的 provider: ${provider}`);
}

async function callOpenAICompatible({ baseUrl, apiKey, model, prompt, text, signal }) {
  if (!apiKey) throw new Error('未配置 OPENAI_API_KEY。');

  const endpoint = buildEndpoint(baseUrl, '/chat/completions');
  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: '你是严谨的 Word 文本修订助手。只输出修订后的文本，不解释。' },
        { role: 'user', content: `${prompt}\n\n待修订文本：\n${text}` }
      ]
    })
  });

  const data = await parseJsonResponse(response, endpoint);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic({ baseUrl, apiKey, model, prompt, text, signal }) {
  if (!apiKey) throw new Error('未配置 ANTHROPIC_API_KEY。');

  const endpoint = buildEndpoint(baseUrl, '/messages');
  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.2,
      system: '你是严谨的 Word 文本修订助手。只输出修订后的文本，不解释。',
      messages: [{ role: 'user', content: `${prompt}\n\n待修订文本：\n${text}` }]
    })
  });

  const data = await parseJsonResponse(response, endpoint);
  return data.content?.map((part) => part.text || '').join('').trim() || '';
}

async function callGemini({ baseUrl, apiKey, model, prompt, text, signal }) {
  if (!apiKey) throw new Error('未配置 GEMINI_API_KEY。');

  const endpoint = `${buildEndpoint(baseUrl, `/models/${encodeURIComponent(model)}:generateContent`)}?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.2 },
      contents: [
        {
          role: 'user',
          parts: [{ text: `你是严谨的 Word 文本修订助手。只输出修订后的文本，不解释。\n\n${prompt}\n\n待修订文本：\n${text}` }]
        }
      ]
    })
  });

  const data = await parseJsonResponse(response, endpoint.replace(apiKey, '***'));
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function buildEndpoint(baseUrl, suffix) {
  const trimmed = String(baseUrl || '').trim().replace(/\/$/, '');
  if (!trimmed) return suffix;
  if (trimmed.endsWith(suffix)) return trimmed;
  return `${trimmed}${suffix}`;
}

async function parseJsonResponse(response, endpoint) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const contentType = response.headers.get('content-type') || '未知类型';
    const looksLikeHtml = /^\s*<!doctype html|^\s*<html/i.test(text);
    const hint = looksLikeHtml
      ? '当前端点返回的是网页 HTML，不是模型 API。请把 API 端点改成真实接口地址，例如 OpenAI 兼容接口通常是 https://你的域名/v1，或直接填 https://你的域名/v1/chat/completions。'
      : '请检查 API 端点是否为模型接口，而不是控制台、官网或登录页。';
    throw new Error(`接口返回非 JSON。请求地址：${endpoint}；HTTP ${response.status}；Content-Type：${contentType}。${hint} 返回片段：${text.slice(0, 180)}`);
  }

  if (!response.ok) {
    const message = data.error?.message || data.error || response.statusText;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data;
}

const useHttps = process.env.HTTPS !== 'false';
const server = useHttps
  ? https.createServer(await getHttpsServerOptions(), app)
  : http.createServer(app);
const protocol = useHttps ? 'https' : 'http';

server.listen(port, () => {
  console.log(`Word AI Reviser running at ${protocol}://localhost:${port}`);
});
