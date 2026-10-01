# 2026-10-02 第十四轮：选择卡方向与技术短语

基线 `6d55d68fce266bed9975fca80bb65b1f4ecaa1be`，完整远程树 `3fe1e8542f629e560e6beb54e01e53a8ff54d1a1`。沿 PR #1 原分支，不合并、不改 main 或其他项目。18份相关文件已按远端 Git blob 核对，本地不是完整 checkout。

## 改动与复现

九文件：README、SKILL、界面细节、来源与本记录；regions CSS／HTML；新增方向布局浏览器检查与 Node 检查。原应用 JavaScript、共享 tokens／控件、清单及其他页面、原有测试、异步参考模型、46个模型场景和准备器不变。

260px 选择卡的 RTL 标题原与单选点水平重叠16px。点使用逻辑位置，文本却只在物理左边留48px；改为配对逻辑 padding 后，RTL 间距14px，与原 LTR 一致。三个 vCPU 标题和两个 GB 短语加 `bdi dir="ltr"`，文字和参数不变。实际字符矩形确认数字仍在 Latin 单位前方，不能只用 DOM 字符串判断视觉顺序。

规则合并到 `references/craft-details.md`，没有增加默认必读文件。入口维护链接改为稳定 README 索引，7,738→7,709 UTF-8字节；不是token测量。

## 实际运行

Node.js22.16.0、Chromium144.0.7559.96，使用已有Playwright，无新依赖。Browser插件未列为可用，搜索返回未安装候选；未访问用户浏览器。沿用明确的内存样例，不绕过已知导航限制。shell GitHub访问实际DNS失败，远端读取／提交使用连接器。

```sh
node --test tests/color.test.cjs tests/regions.test.cjs tests/style-composition.test.cjs tests/choice-layout.test.cjs
node tests/choice-layout.cjs
DESIGN_QA_MODE=inline node tests/regions.cjs
node tests/style-composition.cjs
```

浏览器另设 `PLAYWRIGHT_MODULE`、`CHROME_EXECUTABLE_PATH` 指向现有安装，`DESIGN_QA_DIR` 为源外新目录。方向套件另设 `DESIGN_BASELINE_DIR` 指向已核对的旧 assets；未设置时不运行、也不报告该对照通过。

| 检查 | 结果与范围 |
|---|---|
| 定向Node | 23/23：颜色6、regions9、样式组合4、新方向／输出保护4 |
| 新方向浏览器 | 10组通过，含1组可选的基线LTR对照 |
| 方向与尺寸 | 32条件：2主题×4方向配置（继承LTR／RTL、局部RTL／LTR）×4尺寸（1440px视口内220/320/520px容器、390px视口内320px容器） |
| 几何与字形 | 真实控件和文本Range不重叠、不越界；规格数字和单位以字符位置判定，不仅比较CSS属性 |
| 动态与键盘 | 父方向变化、局部覆盖保留选择；原生ArrowDown连续选择、跳过禁用、焦点可见 |
| 内容压力 | 220px嵌入容器、长中文、34px标题和加大字距；强制颜色／减少动效模拟 |
| LTR不回退 | 两主题同条件的全部采样对象与原版本深比较一致，含几何、字形位置、内容、原生状态；不是全页像素对照 |
| 负向控制 | 原基线在同一新套件中触发RTL重叠断言；分别恢复物理padding、去掉bidi隔离，也由预期几何／字形断言检出，不接受任意运行异常 |
| 原regions | 32项通过，含16布局条件、84对原受控对比；选择、查询失败与重试保留 |
| 原样式组合 | 8组通过，含6加载条件、24局部主题配置、48对原状态对比；混合CSS完整页面路径保留 |
| 运行与输出 | 未见相关脚本错误或外部HTTP请求；源内或已有输出目录在浏览器加载前拒绝，不覆盖 |

实际查看修复前后桌面和修订手机截图。前后参考页是结构压力展示，不是另一种语言的翻译验收；每个预览组有独立radio名称和描述ID，主题／方向容器本身不隔离同名选择组。

## 未验证范围

没有全应用RTL、阿拉伯语／希伯来语翻译、竖排、框架Direction Provider／Portal、真实URL／资源请求、SSR、真实路由、服务端或账户验证。字符采样只覆盖所列技术短语，不是完整Unicode或双向文本安全审计。

没有Safari／Firefox、实体手机、软键盘、原生输入法、完整读屏和实际浏览器缩放测试；大字和窄容器不冒称400%缩放。未重跑独立patterns／preview／Relay全套、异步模型及其他未改Node套件。46个模型场景、宿主触发、独立A/B和plugin-eval未执行，不能推断平均生成质量、性能、用户效率或整站合规。
