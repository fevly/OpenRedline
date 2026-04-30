# OpenRedline

OpenRedline 是一个给 Microsoft Word 使用的 AI 文本修订插件。

它可以读取 Word 中选中的文字，用你配置的 AI 模型进行纠错、改写、翻译或自定义处理，并把满意的结果插回 Word。

## 下载

最新版安装包请到 GitHub Releases 下载：

[下载 OpenRedline 最新版本](https://github.com/fevly/OpenRedline/releases/latest)

## 主要功能

- 读取 Word 当前选中的文本
- 一键纠错、学术改写、中译英、英译中
- 支持临时 Prompt
- 支持同时调用多个 AI 模型并比较结果
- 支持自定义 API 端点、模型名称和 API Key
- 支持 Markdown 预览，插入 Word 时自动转为纯文本
- 可选中文标点规范化
- 可直接规范选中文本中的中文标点

## 适用平台

当前支持：

- macOS 版 Microsoft Word
- Windows 版 Microsoft Word

## macOS 安装与启动

下载或构建 OpenRedline 后，通常需要完成两件事：

1. 启动本地后端
2. 在 Word 中加载 OpenRedline 插件

如果你使用的是 Mac 安装包，安装后打开 `OpenRedlineHelper`。它会出现在菜单栏中，并自动启动本地后端。

Mac 安装包会把程序文件安装到 `/Library/Application Support/OpenRedline`，并在安装时执行依赖安装。

如果需要手动运行：

```bash
npm install
npm run certs
npm run dev
```

本地服务默认地址是：

```text
https://localhost:3000
```

macOS 卸载：

```bash
sudo zsh "/Library/Application Support/OpenRedline/uninstall-openredline.sh"
```

如果想保留本机模型和 Prompt 配置：

```bash
sudo zsh "/Library/Application Support/OpenRedline/uninstall-openredline.sh" --keep-settings
```

## Windows 安装与启动

Windows 版本提供 EXE 安装器。

普通用户下载并运行：

```text
OpenRedline-windows-preview.exe
```

Windows EXE 安装器内置 Node.js 运行时，不需要用户手动安装 Node.js。

安装器会：

- 安装 OpenRedline
- 安装内置 Node.js 运行时
- 信任本地 HTTPS 证书
- 注册开机启动任务
- 配置 Word 共享文件夹加载项目录
- 创建开始菜单快捷方式

安装完成后，重启 Word，进入：

```text
Home > Add-ins > Advanced > Shared Folder
```

选择 OpenRedline 并添加。

Windows 详细说明见 `windows/README.md`。

Windows 卸载：

可以从 Windows 设置中卸载：

```text
Settings > Apps > Installed apps > OpenRedline > Uninstall
```

也可以从开始菜单运行：

```text
OpenRedline > Uninstall OpenRedline
```

命令行卸载：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\windows\uninstall-openredline.ps1
```

## 在 Word 中使用

1. 打开 Word 文档。
2. 选中一段需要处理的文字。
3. 打开 OpenRedline 任务窗格。
4. 点击“选中文字”。
5. 选择 Prompt 和参与比较的模型。
6. 点击“生成比较”。
7. 查看各模型结果，必要时手动编辑。
8. 点击“插入”，替换 Word 当前选区。

## 配置模型

在插件顶部点击“配置”，可以添加或修改模型。

每个模型需要配置：

- 显示名称
- Provider
- API 端点
- 模型名称
- API Key

OpenRedline 支持 OpenAI 兼容接口，也可以配置 Anthropic 和 Gemini。

配置会保存在本机，不会提交到 GitHub。

## Prompt

默认保留四个常用 Prompt：

- 纠错
- 学术改写
- 中译英
- 英译中

你也可以新增自己的 Prompt，或者选择“临时使用”来写一次性指令。

## 中文标点规范化

OpenRedline 支持将英文半角标点转换为中文写作中常用的全角标点。

你可以：

- 在插入 AI 结果前自动规范标点
- 直接对 Word 选中文本执行“规范标点”

规范选中文本时会尽量保留 Word 中的脚注等结构。

## 注意事项

- 请不要把自己的 API Key 提交到公开仓库。
- 本项目默认使用本地后端代理 AI 请求。
- 如果 Word 无法加载插件，请先确认 `https://localhost:3000` 可以打开。
- 如果菜单栏助手没有启动后端，可以重新打开 `OpenRedlineHelper`。
- Windows 安装脚本会配置本机 Word 共享文件夹加载项目录；第一次使用后需要重启 Word。

## License

Apache License 2.0
