# OpenRedline

一个 Word Office Add-in 原型：读取 Word 中的选中文本，用自定义 Prompt 调用多个 AI 生成修订版本，比较后把选中的结果插回 Word。

> 当前版本适合个人试用和小范围测试。真正面向多人分发时，建议把后端部署到可信 HTTPS 域名，避免把任何共享 API Key 放进前端代码或公开仓库。

## 功能

- 读取当前 Word 选中文本
- 内置纠错、学术改写、精简 Prompt
- 可新增、删除、自定义 Prompt，并同步到本地共享配置
- 可新增、删除、保存多组 AI 配置，包括 Provider、API 端点、模型名称和可选 API Key
- 可同时调用 OpenAI 兼容接口、Anthropic、Gemini
- 每个 AI 的结果可手动微调后替换 Word 当前选区

## 项目结构

```text
.
├── docs/                         # GitHub Pages 项目首页
├── src/                          # Word 任务窗格前端
├── server.js                     # 本地 HTTPS 服务与 AI 代理
├── manifest.xml                  # 本地开发 manifest
├── manifest.production.example.xml
└── .env.example
```

## 本地运行

```bash
cd word-ai-reviser
npm install
cp .env.example .env
npm run certs
npm run dev
```

然后在 `.env` 里填入需要启用的 API Key，或者直接在插件任务窗格的“模型配置”里填 API Key、端点和模型名称。模型配置会同时保存在浏览器缓存和本地共享配置文件 `data/settings.json`，所以普通网页和 Word 任务窗格可以读取同一份配置。

## 在 Word 里加载

开发阶段先 sideload `manifest.xml`。Mac 版 Word 通常可以通过“获取加载项 / 我的加载项 / 上传我的加载项”加载 manifest；如果你的 Word 版本不显示上传入口，可以把 manifest 放到 Office 的本地 sideload 目录，或后续改用 `office-addin-debugging` 自动启动。

当前 manifest 使用 `https://localhost:3000`。第一次运行前执行 `npm run certs`，让 Office 信任本地开发证书。

## 发布到 GitHub

1. 在 GitHub 新建仓库，例如 `word-ai-reviser`。
2. 在本地初始化并提交：

```bash
git init
git add .
git commit -m "Initial Word AI Reviser prototype"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/word-ai-reviser.git
git push -u origin main
```

3. 在仓库 Settings -> Pages 中选择 `Deploy from a branch`，分支选择 `main`，目录选择 `/docs`。
4. Pages 发布后，把 `docs/index.html` 里的 `YOUR_GITHUB_USERNAME` 替换为你的 GitHub 用户名，再提交一次。

发布页里的 `docs/manifest.local.xml` 仍然指向 `https://localhost:3000`，适合让测试者下载后在本机运行插件。若要让别人不用本地启动服务，需要部署后端，并按 `manifest.production.example.xml` 生成线上 manifest。

## 分发路线

- **个人测试**：GitHub Pages 放说明页，测试者下载本地 manifest，自行运行 `npm run dev`。
- **团队内部**：部署 `server.js` 或等价后端到 HTTPS 域名，生产 manifest 指向该域名，再通过组织管理员集中部署。
- **公开上架**：准备隐私政策、支持地址、权限说明和生产服务后，再提交 Microsoft AppSource。

## 扩展建议

- 增加“并排 diff”视图，标出每个版本相对原文的变化。
- 增加“批注插入”模式，不直接替换正文，而是把 AI 建议写入 Word 评论。
- 增加团队 Prompt 库，从 JSON 或后端数据库加载。
- 增加评分 Prompt，让一个模型对多个候选版本打分并解释差异。
