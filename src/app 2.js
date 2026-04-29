const defaultPrompts = [
  {
    name: '纠错',
    text: '请修正错别字、病句、标点和明显语法问题，尽量保留原文意思、术语和行文风格。'
  },
  {
    name: '学术改写',
    text: '请将文本改写为更自然、严谨、适合学术写作的中文，保留原意，不添加未经原文支持的信息。'
  },
  {
    name: '精简',
    text: '请压缩冗余表达，让文本更简洁有力，同时保留关键概念、论证关系和专有名词。'
  }
];

const models = [
  { id: 'openai:gpt-4.1', label: 'OpenAI GPT-4.1', provider: 'openai', model: 'gpt-4.1' },
  { id: 'anthropic:claude-3-5-sonnet-latest', label: 'Claude Sonnet', provider: 'anthropic', model: 'claude-3-5-sonnet-latest' },
  { id: 'gemini:gemini-1.5-pro', label: 'Gemini Pro', provider: 'gemini', model: 'gemini-1.5-pro' }
];

const state = {
  prompts: loadJson('word-ai-reviser.prompts', defaultPrompts),
  selectedPromptIndex: 0
};

const els = {
  status: document.querySelector('#status'),
  loadSelection: document.querySelector('#loadSelection'),
  selectedText: document.querySelector('#selectedText'),
  promptSelect: document.querySelector('#promptSelect'),
  promptName: document.querySelector('#promptName'),
  promptText: document.querySelector('#promptText'),
  savePrompt: document.querySelector('#savePrompt'),
  modelList: document.querySelector('#modelList'),
  runCompare: document.querySelector('#runCompare'),
  results: document.querySelector('#results'),
  resultTemplate: document.querySelector('#resultTemplate')
};

Office.onReady(() => {
  renderPrompts();
  renderModels();
  bindEvents();
  readSelection();
});

function bindEvents() {
  els.loadSelection.addEventListener('click', readSelection);
  els.promptSelect.addEventListener('change', () => {
    state.selectedPromptIndex = Number(els.promptSelect.value);
    fillPromptEditor();
  });
  els.savePrompt.addEventListener('click', savePrompt);
  els.runCompare.addEventListener('click', runComparison);
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

function renderModels() {
  els.modelList.innerHTML = '';
  const enabled = loadJson('word-ai-reviser.models', ['openai:gpt-4.1']);
  for (const item of models) {
    const label = document.createElement('label');
    label.className = 'modelOption';
    label.innerHTML = `
      <input type="checkbox" value="${item.id}" ${enabled.includes(item.id) ? 'checked' : ''} />
      <span>${item.label}<small>${item.provider} / ${item.model}</small></span>
    `;
    els.modelList.append(label);
  }
}

async function readSelection() {
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

function savePrompt() {
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

  localStorage.setItem('word-ai-reviser.prompts', JSON.stringify(state.prompts));
  renderPrompts();
  setStatus('Prompt 已保存。');
}

async function runComparison() {
  const text = els.selectedText.value.trim();
  const prompt = els.promptText.value.trim();
  const selectedModels = getSelectedModels();
  localStorage.setItem('word-ai-reviser.models', JSON.stringify(selectedModels.map((item) => item.id)));

  if (!text) return setStatus('请先选择或输入待修订文本。', true);
  if (!prompt) return setStatus('请先填写 Prompt。', true);
  if (!selectedModels.length) return setStatus('请至少选择一个 AI。', true);

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
      body: JSON.stringify({ text, prompt, provider: item.provider, model: item.model })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || response.statusText);
    card.textarea.value = data.output || '';
  } catch (error) {
    card.root.dataset.state = 'error';
    card.textarea.value = error.message;
  }
}

function createResultCard(title, initialText) {
  const fragment = els.resultTemplate.content.cloneNode(true);
  const root = fragment.querySelector('.resultCard');
  const strong = fragment.querySelector('strong');
  const textarea = fragment.querySelector('textarea');
  const button = fragment.querySelector('.insertButton');

  strong.textContent = title;
  textarea.value = initialText;
  button.addEventListener('click', () => insertIntoWord(textarea.value));
  els.results.append(fragment);

  return { root, textarea };
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
    setStatus('已替换当前选中文本。');
  } catch (error) {
    setStatus(`插入失败：${error.message}`, true);
  }
}

function getSelectedModels() {
  const checked = [...els.modelList.querySelectorAll('input:checked')].map((input) => input.value);
  return models.filter((item) => checked.includes(item.id));
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
