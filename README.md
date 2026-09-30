# 项目设计语言

面向产品前端的 Codex Skill：统一黑白灰、液态／毛玻璃、层级、控件状态与用户流程。保留各项目的布局和任务差异。

## 使用

把整个目录放到 Codex 的 `skills/error-design-language` 下，然后调用：

```text
使用 $error-design-language，统一当前项目的黑白灰与玻璃设计，
优先修复层级、文字、按钮状态和关键操作流程，验证桌面与手机页面。
```

仅做评审时明确加上“只读评审”。Skill 不自动部署，也不修改其他项目。

## 内容

- [SKILL.md](SKILL.md)：入口与执行规则。
- [数值与材料](references/visual-system.md)：语义灰阶、排版、圆角和玻璃。
- [项目适配](references/product-profiles.md)：信息、交易、阅读、科研、教学与游戏界面。
- [验收规则](references/verification.md)：关键状态与用户路径。
- [依据与边界](references/evidence.md)：历史反馈与当前规则的适用范围。
- [交互样张](assets/preview.html)：下载仓库后直接用浏览器打开，可离线运行。

样张必须保留同目录的 `tokens.css`、`components.css` 和 `preview.css`。无远程资源、网络请求或数据持久化。液态玻璃是轻量 CSS 材质近似。

## 文字和按钮

浅色主操作用深石墨底与白字，深色主操作用浅底与深字。主／次／轻操作、选中、禁用与处理中分别定义；hover 和按下不会混用其他角色的文字色。装饰分隔线、输入边界与关键文字也分别处理。

使用样例控件时按顺序加载 `assets/tokens.css` 和 `assets/components.css`，在容器设置 `data-design="error"` 与 `data-theme="neutral"` 或 `dark`。按钮用 `dl-button`，主操作增加 `primary`，轻操作增加 `quiet`；输入与选择器使用 `dl-input`／`dl-select`。已有设计系统优先做语义映射，不叠加另一套全局样式。

## 可选回归验证

普通使用不需要安装依赖。已有 Node.js、Playwright 和 Chromium 时运行：

```sh
node tests/preview.cjs
```

也可用 `PLAYWRIGHT_MODULE` 指向现有 Playwright 模块，`CHROME_CHANNEL=chrome` 使用已安装 Chrome。`DESIGN_QA_DIR` 可指定仓库外的截图／结果目录。

测试覆盖浅深主题与三种材质下的四档宽度，以及按钮默认、悬停、焦点、按下、禁用、处理中状态的实际文字对比；同时验证单选、空结果、失败恢复与焦点返回。浏览器模拟不替代真实设备或业务接口验收。
