const defaultPrompts = [
  {
    name: '纠错',
    text: '请对输入文本进行校对和纠错，修正错别字、病句、语序不顺、重复表达和明显标点问题。请尽量保留原意、术语、人名、地名、数字和原有行文风格，不新增未经原文支持的信息。只输出修订后的文本，不要输出解释、分析或修改清单。'
  },
  {
    name: '学术改写',
    text: '请将输入文本改写为更自然、严谨、适合学术写作的中文。请优化句式、逻辑衔接和段内表达，使其更符合中文论文或研究报告的表达规范。必须保留原意、关键信息、术语和论证边界，不添加原文没有的事实、案例或判断。只输出改写后的文本，不要输出解释、分析或修改清单。'
  },
  {
    name: '中译英',
    text: 'Please translate the input Chinese text into clear, natural, and polished English. Preserve the original meaning, argument structure, terminology, names, dates, numbers, and citations. Use an academic or professional register when appropriate, but do not add information that is not present in the source text. Output only the final English translation, with no explanations, notes, or revision list.'
  },
  {
    name: '英译中',
    text: '请将输入英文翻译为自然、准确、正式的中文。请保留原文含义、论证结构、术语、人名、地名、日期、数字和引文信息，不新增原文没有的信息。中文表达应流畅、符合中文学术或专业写作习惯，并使用中文全角标点。只输出最终中文译文，不要输出解释、注释或修改清单。'
  }
];

const defaultModelConfigs = [
  {
    id: 'openai-gpt-4-1',
    enabled: true,
    label: 'OpenAI GPT-4.1',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1',
    apiKey: ''
  },
  {
    id: 'claude-sonnet',
    enabled: false,
    label: 'Claude Sonnet',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest',
    apiKey: ''
  },
  {
    id: 'gemini-pro',
    enabled: false,
    label: 'Gemini Pro',
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-pro',
    apiKey: ''
  }
];

const state = {
  prompts: loadJson('word-ai-reviser.prompts', defaultPrompts),
  modelConfigs: normalizeModelConfigs(loadJson('word-ai-reviser.modelConfigs', defaultModelConfigs)),
  selectedPromptIndex: 0,
  normalizeChinese: loadJson('word-ai-reviser.normalizeChinese', true)
};

const els = {
  status: document.querySelector('#status'),
  loadSelection: document.querySelector('#loadSelection'),
  selectedText: document.querySelector('#selectedText'),
  promptSelect: document.querySelector('#promptSelect'),
  promptName: document.querySelector('#promptName'),
  promptText: document.querySelector('#promptText'),
  addPrompt: document.querySelector('#addPrompt'),
  savePrompt: document.querySelector('#savePrompt'),
  deletePrompt: document.querySelector('#deletePrompt'),
  addModel: document.querySelector('#addModel'),
  modelList: document.querySelector('#modelList'),
  normalizeChinese: document.querySelector('#normalizeChinese'),
  runCompare: document.querySelector('#runCompare'),
  results: document.querySelector('#results'),
  resultTemplate: document.querySelector('#resultTemplate')
};

let initialized = false;

function initializeApp() {
  if (initialized) return;
  initialized = true;
  document.body.classList.toggle('wordHost', isWordHost());
  document.body.classList.toggle('configHost', !isWordHost());
  loadSharedSettings().finally(() => {
    renderPrompts();
    renderModels();
    renderTextOptions();
    bindEvents();
    readSelection();
  });
}

async function loadSharedSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error(response.statusText);
    const settings = await response.json();
    const hasSharedPrompts = Array.isArray(settings.prompts) && settings.prompts.length;
    const hasSharedModels = Array.isArray(settings.modelConfigs) && settings.modelConfigs.length;

    if (hasSharedPrompts) {
      state.prompts = settings.prompts;
      localStorage.setItem('word-ai-reviser.prompts', JSON.stringify(state.prompts));
    }

    if (hasSharedModels) {
      state.modelConfigs = normalizeModelConfigs(settings.modelConfigs);
      localStorage.setItem('word-ai-reviser.modelConfigs', JSON.stringify(state.modelConfigs));
    }

    if (!isWordHost() && (!hasSharedPrompts || !hasSharedModels)) {
      await saveSharedSettings();
    }
  } catch (error) {
    console.warn('Shared settings unavailable, using localStorage only.', error);
  }
}

async function saveSharedSettings() {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompts: state.prompts,
      modelConfigs: state.modelConfigs
    })
  });
  if (!response.ok) throw new Error(response.statusText);
}

/*
 * The task pane and a normal browser use different WebView storage on macOS.
 * Keep localStorage for snappy UI, and mirror to /api/settings for cross-host sync.
 */
function saveLocalSettings() {
  localStorage.setItem('word-ai-reviser.prompts', JSON.stringify(state.prompts));
  localStorage.setItem('word-ai-reviser.modelConfigs', JSON.stringify(state.modelConfigs));
}

async function persistSettings(message) {
  saveLocalSettings();
  try {
    await saveSharedSettings();
    setStatus(message);
  } catch (error) {
    setStatus(`${message} 但共享同步失败：${error.message}`, true);
  }
}

if (globalThis.Office?.onReady) {
  initializeWithOffice();
} else if (isWordHost()) {
  loadOfficeScript().then(initializeWithOffice).catch(initializeApp);
} else {
  initializeApp();
}

function isWordHost() {
  return location.search.includes('_host_Info');
}

function initializeWithOffice() {
  Office.onReady(initializeApp);
  setTimeout(initializeApp, 1200);
}

function loadOfficeScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

function bindEvents() {
  els.loadSelection.addEventListener('click', readSelection);
  els.promptSelect.addEventListener('change', () => {
    state.selectedPromptIndex = Number(els.promptSelect.value);
    fillPromptEditor();
  });
  els.addPrompt.addEventListener('click', addPrompt);
  els.savePrompt.addEventListener('click', savePrompt);
  els.deletePrompt.addEventListener('click', deletePrompt);
  els.addModel.addEventListener('click', addModelConfig);
  els.modelList.addEventListener('input', updateModelFromEvent);
  els.modelList.addEventListener('change', updateModelFromEvent);
  els.modelList.addEventListener('click', handleModelClick);
  els.normalizeChinese.addEventListener('change', saveTextOptions);
  els.runCompare.addEventListener('click', runComparison);
}

function renderTextOptions() {
  els.normalizeChinese.checked = Boolean(state.normalizeChinese);
}

function saveTextOptions() {
  state.normalizeChinese = els.normalizeChinese.checked;
  localStorage.setItem('word-ai-reviser.normalizeChinese', JSON.stringify(state.normalizeChinese));
  setStatus(state.normalizeChinese ? '插入前会规范为中文全角标点。' : '已关闭中文标点规范化。');
}

function renderPrompts() {
  els.promptSelect.innerHTML = '';
  state.prompts.forEach((prompt, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = prompt.name;
    els.promptSelect.append(option);
  });
  els.promptSelect.value = String(state.selectedPromptIndex);
  fillPromptEditor();
}

function fillPromptEditor() {
  const prompt = state.prompts[state.selectedPromptIndex] || state.prompts[0];
  els.promptName.value = prompt?.name || '';
  els.promptText.value = prompt?.text || '';
}

async function addPrompt() {
  const nextIndex = state.prompts.length + 1;
  state.prompts.push({
    name: `自定义 Prompt ${nextIndex}`,
    text: ''
  });
  state.selectedPromptIndex = state.prompts.length - 1;
  renderPrompts();
  await persistSettings('Prompt 已新增并同步。');
}

function renderModels() {
  els.modelList.innerHTML = '';
  for (const item of state.modelConfigs) {
    els.modelList.append(createModelCard(item));
  }
}

function createModelCard(item) {
  const card = document.createElement('article');
  card.className = 'modelOption';
  if (isWordHost()) card.classList.add('compactModelOption');
  card.dataset.id = item.id;

  const header = document.createElement('div');
  header.className = 'modelOptionHeader';

  const enableLabel = document.createElement('label');
  enableLabel.className = 'modelEnable';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.enabled;
  checkbox.dataset.field = 'enabled';
  const title = document.createElement('span');
  title.textContent = item.label || '未命名模型';
  enableLabel.append(checkbox, title);

  const actions = document.createElement('div');
  actions.className = 'modelActions';
  actions.classList.add('configOnly');
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'secondaryButton';
  saveButton.dataset.action = 'save-models';
  saveButton.textContent = '保存';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'dangerButton';
  deleteButton.dataset.action = 'delete-model';
  deleteButton.textContent = '删除';
  actions.append(saveButton, deleteButton);
  header.append(enableLabel, actions);

  if (isWordHost()) {
    card.append(header);
    return card;
  }

  const grid = document.createElement('div');
  grid.className = 'modelGrid';
  grid.classList.add('configOnly');
  grid.append(
    createField('显示名称', 'label', item.label, '如 OpenAI GPT-4.1'),
    createProviderField(item.provider),
    createField('API 端点', 'baseUrl', item.baseUrl, 'https://api.openai.com/v1'),
    createField('模型名称', 'model', item.model, 'gpt-4.1'),
    createField('API Key（可选）', 'apiKey', item.apiKey, '留空则使用 .env', 'password')
  );

  card.append(header, grid);
  return card;
}

function createField(labelText, field, value, placeholder, type = 'text') {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.value = value || '';
  input.placeholder = placeholder;
  input.dataset.field = field;
  label.append(text, input);
  return label;
}

function createProviderField(value) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = 'Provider';
  const select = document.createElement('select');
  select.dataset.field = 'provider';
  for (const [providerValue, providerLabel] of [
    ['openai', 'OpenAI 兼容'],
    ['anthropic', 'Anthropic'],
    ['gemini', 'Gemini']
  ]) {
    const option = document.createElement('option');
    option.value = providerValue;
    option.textContent = providerLabel;
    select.append(option);
  }
  select.value = value || 'openai';
  label.append(text, select);
  return label;
}

async function readSelection() {
  if (!globalThis.Word?.run) {
    setStatus('浏览器预览模式：可编辑并保存配置，读取 Word 选区需在 Word 中使用。');
    return;
  }

  setStatus('正在读取 Word 选中文本...');
  try {
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.load('text');
      await context.sync();
      els.selectedText.value = range.text || '';
    });
    setStatus(els.selectedText.value.trim() ? '已读取选中文本。' : '没有读到选中文本。');
  } catch (error) {
    setStatus(`读取失败：${error.message}`, true);
  }
}

async function savePrompt() {
  const name = els.promptName.value.trim();
  const text = els.promptText.value.trim();
  if (!name || !text) {
    setStatus('Prompt 名称和内容都不能为空。', true);
    return;
  }

  const existingIndex = state.prompts.findIndex((prompt) => prompt.name === name);
  if (existingIndex >= 0) {
    state.prompts[existingIndex] = { name, text };
    state.selectedPromptIndex = existingIndex;
  } else {
    state.prompts.push({ name, text });
    state.selectedPromptIndex = state.prompts.length - 1;
  }

  renderPrompts();
  await persistSettings('Prompt 已保存并同步。');
}

async function deletePrompt() {
  if (!state.prompts.length) return;

  state.prompts.splice(state.selectedPromptIndex, 1);
  if (!state.prompts.length) {
    state.prompts.push({
      name: '自定义 Prompt 1',
      text: ''
    });
  }
  state.selectedPromptIndex = Math.min(state.selectedPromptIndex, state.prompts.length - 1);
  renderPrompts();
  await persistSettings('Prompt 已删除并同步。');
}

async function addModelConfig() {
  state.modelConfigs.push({
    id: `model-${Date.now()}`,
    enabled: true,
    label: '自定义模型',
    provider: 'openai',
    baseUrl: '',
    model: '',
    apiKey: ''
  });
  await saveModelConfigs('模型配置已新增并同步。');
  renderModels();
}

function updateModelFromEvent(event) {
  const field = event.target.dataset.field;
  const card = event.target.closest('.modelOption');
  if (!field || !card) return;

  const item = state.modelConfigs.find((config) => config.id === card.dataset.id);
  if (!item) return;

  item[field] = field === 'enabled' ? event.target.checked : event.target.value;
  if (field === 'label') {
    const title = card.querySelector('.modelEnable span');
    if (title) title.textContent = item.label || '未命名模型';
  }
}

async function handleModelClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;

  if (action === 'save-models') {
    await saveModelConfigs('模型配置已保存并同步。');
    return;
  }

  if (action === 'delete-model') {
    const card = event.target.closest('.modelOption');
    state.modelConfigs = state.modelConfigs.filter((config) => config.id !== card.dataset.id);
    await saveModelConfigs('模型配置已删除并同步。');
    renderModels();
  }
}

async function saveModelConfigs(message) {
  state.modelConfigs = normalizeModelConfigs(state.modelConfigs);
  await persistSettings(message);
}

async function runComparison() {
  const text = els.selectedText.value.trim();
  const prompt = els.promptText.value.trim();
  await saveModelConfigs('模型配置已保存并同步，准备生成。');
  const selectedModels = getSelectedModels();

  if (!text) return setStatus('请先选择或输入待修订文本。', true);
  if (!prompt) return setStatus('请先填写 Prompt。', true);
  if (!selectedModels.length) return setStatus('请至少启用一个 AI。', true);

  const invalid = selectedModels.find((item) => !item.provider || !item.model.trim());
  if (invalid) return setStatus(`模型配置不完整：${invalid.label || invalid.id}`, true);

  els.results.innerHTML = '';
  els.runCompare.disabled = true;
  setStatus(`正在生成 ${selectedModels.length} 个版本...`);

  await Promise.all(selectedModels.map((item) => createRevision(item, text, prompt)));

  els.runCompare.disabled = false;
  setStatus('比较完成，可以编辑结果后插入。');
}

async function createRevision(item, text, prompt) {
  const card = createResultCard(item.label, '生成中...');
  try {
    const response = await fetch('/api/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        prompt,
        provider: item.provider,
        model: item.model,
        baseUrl: item.baseUrl,
        apiKey: item.apiKey
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || response.statusText);
    card.textarea.value = data.output || '';
    card.syncPreview();
    card.showPreview();
  } catch (error) {
    card.root.dataset.state = 'error';
    card.textarea.value = error.message;
    card.syncPreview();
    card.showEditor();
  }
}

function createResultCard(title, initialText) {
  const fragment = els.resultTemplate.content.cloneNode(true);
  const root = fragment.querySelector('.resultCard');
  const strong = fragment.querySelector('strong');
  const textarea = fragment.querySelector('textarea');
  const preview = fragment.querySelector('.markdownPreview');
  const editButton = fragment.querySelector('.editButton');
  const previewButton = fragment.querySelector('.previewButton');
  const insertButton = fragment.querySelector('.insertButton');

  strong.textContent = title;
  textarea.value = initialText;
  const syncPreview = () => {
    preview.innerHTML = renderMarkdown(textarea.value);
  };
  const showEditor = () => {
    textarea.hidden = false;
    preview.hidden = true;
  };
  const showPreview = () => {
    syncPreview();
    textarea.hidden = true;
    preview.hidden = false;
  };
  textarea.addEventListener('input', syncPreview);
  editButton.addEventListener('click', showEditor);
  previewButton.addEventListener('click', showPreview);
  insertButton.addEventListener('click', () => insertIntoWord(prepareTextForWord(textarea.value)));
  syncPreview();
  els.results.append(fragment);

  return { root, textarea, preview, syncPreview, showEditor, showPreview };
}

async function insertIntoWord(text) {
  if (!text.trim()) return setStatus('插入内容不能为空。', true);
  setStatus('正在插入到 Word...');
  try {
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertText(text, Word.InsertLocation.replace);
      await context.sync();
    });
    setStatus(state.normalizeChinese ? '已替换当前选中文本，并应用中文标点规范化。' : '已替换当前选中文本。');
  } catch (error) {
    setStatus(`插入失败：${error.message}`, true);
  }
}

function prepareTextForWord(markdownText) {
  const protectedText = protectPlainTextSegments(markdownText);
  const plainText = stripMarkdown(protectedText.text);
  const normalizedText = state.normalizeChinese ? normalizeChineseText(plainText) : plainText;
  return restorePlaceholders(normalizedText, protectedText.placeholders);
}

function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let listType = '';
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = '';
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const nextListType = unordered ? 'ul' : 'ol';
      if (listType !== nextListType) {
        closeList();
        html.push(`<${nextListType}>`);
        listType = nextListType;
      }
      html.push(`<li>${renderInlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  closeList();
  return html.join('');
}

function renderInlineMarkdown(source) {
  let html = escapeHtml(source);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  return html;
}

function stripMarkdown(source) {
  return String(source || '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .trim();
}

function normalizeChineseText(source) {
  let doubleQuoteOpen = true;
  let singleQuoteOpen = true;
  let text = String(source || '');

  text = text
    .replace(/\.{3}/g, '……')
    .replace(/--/g, '——')
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/!/g, '！')
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/\[/g, '【')
    .replace(/\]/g, '】')
    .replace(/"/g, () => {
      const mark = doubleQuoteOpen ? '“' : '”';
      doubleQuoteOpen = !doubleQuoteOpen;
      return mark;
    })
    .replace(/'/g, () => {
      const mark = singleQuoteOpen ? '‘' : '’';
      singleQuoteOpen = !singleQuoteOpen;
      return mark;
    })
    .replace(/\./g, (match, offset, whole) => (/\d/.test(whole[offset - 1]) && /\d/.test(whole[offset + 1]) ? match : '。'));
  return text;
}

function protectPlainTextSegments(source) {
  const placeholders = [];
  const protect = (value) => {
    const token = `\uE000${placeholders.length}\uE001`;
    placeholders.push(value);
    return token;
  };
  const text = String(source || '')
    .replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_match, code) => protect(code.trim()))
    .replace(/`([^`]*)`/g, (_match, code) => protect(code))
    .replace(/https?:\/\/[^\s，。；：“”‘’（）？！]+/g, (url) => protect(url))
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (email) => protect(email));
  return { text, placeholders };
}

function restorePlaceholders(source, placeholders) {
  let text = source;
  placeholders.forEach((value, index) => {
    text = text.replace(`\uE000${index}\uE001`, value);
  });
  return text;
}

function escapeHtml(source) {
  return String(source || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSelectedModels() {
  return state.modelConfigs.filter((item) => item.enabled);
}

function normalizeModelConfigs(configs) {
  const legacyEnabled = loadJson('word-ai-reviser.models', null);
  const normalized = (Array.isArray(configs) && configs.length ? configs : defaultModelConfigs).map((item, index) => {
    const id = item.id || `${item.provider || 'openai'}-${item.model || index}`;
    return {
      id,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : legacyEnabled?.includes(id) || index === 0,
      label: item.label || item.model || '未命名模型',
      provider: item.provider || 'openai',
      baseUrl: item.baseUrl || '',
      model: item.model || '',
      apiKey: item.apiKey || ''
    };
  });
  return normalized;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
