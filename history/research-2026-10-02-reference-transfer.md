# 2026-10-02：设计参考的共同方法与采用边界

研究对象：[getdesign.md](https://getdesign.md/)及其公开设计档案，[Libraries.dev](https://libraries.dev/)的组件、Skill与参数说明。仓库修改基线：`78ab3e26f2c599f39c658fbb894dde56c4fdfc40`。

## 阅读范围，不冒充视觉实测

本次对24份设计档案的主题、token角色、字体、布局、组件或响应式相关章节做分层抽样；并读取7类效果的公开页面和配套参数文档。不是遍历站方全部目录，不是逐行精读所有档案，也没有实际操作24个品牌网站。另查看Vercel、Linear、Wired三个预览的解析内容，未获得可供视觉验收的浏览器截图。

下表链接指向访问时的公开main文档，属于可变化来源，不是已固定哈希的长期快照。品牌档案是VoltAgent项目的独立解读，不等于品牌官方规范。对版式的描述标为文档中的观察；“吸收”列是本Skill自己的转译决定，不是统计证明所有网站一致。

## 24份设计档案：按关系而不是按颜色归纳

| 档案 | 重点抽样关系 | 吸收／适用边界 |
|---|---|---|
| [Vercel](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/vercel/DESIGN.md) | 前景背景配对、表面、字阶 | 映射语义角色，不照搬hex或字体授权描述 |
| [Linear](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/linear.app/DESIGN.md) | 深色层次、有限强调、工具语汇 | 灰阶也有重量差；营销构图不等于真实工作台 |
| [Resend](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/resend/DESIGN.md) | 深色材质、文字与背景配对 | 稳定内容面优先于背景氛围 |
| [Supabase](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/supabase/DESIGN.md) | 代码／产品证据、浅深组件 | 内容证明能力，不能只凭目录标签决定主题 |
| [Raycast](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/raycast/DESIGN.md) | 命令界面与产品展示 | 识别手法来自真实产品，不添无关浮动面板 |
| [Sentry](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/sentry/DESIGN.md) | 营销正文与功能UI的行高分工 | 同一品牌不同任务可有不同密度 |
| [Cal](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/cal/DESIGN.md) | 展示字与UI字分工 | 字体数量不等于层级，先把角色分清 |
| [Mintlify](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/mintlify/DESIGN.md) | 代码、标签、选中页签 | 文档内容、导航与局部状态有不同职责 |
| [IBM](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/ibm/DESIGN.md) | 同一家族的字重与字阶 | 不一定新增字体才能形成识别度 |
| [Stripe](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/stripe/DESIGN.md) | 展示／UI／数字、场景化间距 | 文字与金额各有排版；不继承固定轻字重 |
| [Wise](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/wise/DESIGN.md) | 转换器主任务、动作强调、语义色 | 交易任务优先，主色不代替所有业务状态 |
| [Uber](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/uber/DESIGN.md) | 黑白结构、摄影、展示与UI字 | 结构灰阶不要求内容图片也灰阶 |
| [Airbnb](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/airbnb/DESIGN.md) | 图像重量、搜索与价格上下文 | 照片可承担主体，交易条件不能缩成小字 |
| [Apple](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/apple/DESIGN.md) | 展示、正文、辅助字的尺度分工 | 大标题有场景；不移植微小免责声明 |
| [Nike](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/nike/DESIGN.md) | 活动展示字与商品UI、摄影 | 强展示与稳定操作并存，不全页同一种大字 |
| [Shopify](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/shopify/DESIGN.md) | 巨幅轻展示字、正文与价格细则 | 字重／尺寸共同作用；不把品牌特例变成硬门槛 |
| [Wired](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/wired/DESIGN.md) | 编辑字阶、正文、元信息 | 章节节奏与内容主次，不借控制台骨架装饰文章 |
| [The Verge](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/theverge/DESIGN.md) | 时间流、展示字与彩色叙事块 | 节奏可来自信息顺序；不继承其所有页都深色等绝对句 |
| [Notion](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/notion/DESIGN.md) | 内容字阶、选项和状态角色 | 阅读与产品操作分层，不添加假KPI |
| [Figma](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/figma/DESIGN.md) | 章节色块、字体重量 | 变化围绕同一语汇；不靠全控件透明度弱化 |
| [Miro](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/miro/DESIGN.md) | 白板预览、模板与内容卡 | 用产品对象解释能力，不凭空添加装饰统计 |
| [Framer](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/framer/DESIGN.md) | 大展示字与控件字的反差 | 让展示和操作使用各自合适的密度 |
| [Spotify](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/spotify/DESIGN.md) | 侧栏收纳、内容网格、持续播放区 | 响应式是功能关系变换，主任务跨尺寸保留 |
| [Pinterest](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/pinterest/DESIGN.md) | 图像比例、内容优先 | 瀑布流适合浏览资产，不替代需要行对应的比较表 |

共同方法是：先看任务与内容重量，再分角色，控制少数重复语汇，最后处理状态与尺寸变化。它不是“大家都极简／都无衬线／都大圆角”；样本本身展示了这些表象之间的分歧。

## 7类效果：读参数与限制，不仅看展台

| 公开参数资料 | 采用的方法 | 不能直接推出的结论 |
|---|---|---|
| [Border beam](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/01-border-beam.md) | 效果围绕真实活动区域，前景不随效果透明 | wrapper会影响裁切／宽度；不同类型的reduced-motion支持不同 |
| [Thinking orbs](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/02-thinking-orbs.md) | 活动种类用一致符号表达，状态文本独立 | 球体没有已知进度；文档指出Copy prompt中的dark并非有效prop |
| [Liquid / Gooey](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/03-liquid-gooey.md) | 表面变形不让真实文本变形 | 示例不是完整键盘实现；不能假定所有效果离屏自动暂停 |
| [Voice glow](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/04-voice-glow.md) | 真实声音与视觉状态对应 | 暂停可视化不等于停止麦克风，样例不提供转写后端 |
| [Bot avatars](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/05-bot-avatars.md) | 身份使用统一几何与变体 | 头像装饰不能证明Agent能力或服务状态 |
| [Metal FX](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/06-metal-fx.md) | 材质只承担局部展示角色 | 不默认加到主标题、价格或每张卡；无性能实测结论 |
| [Image FX](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/references/07-img-fx.md) | 内容就绪后再增强呈现 | 显现动画不是生成进度；效果不可用仍应看到图片 |

同时阅读[公开Skill](https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/skills/libraries-dev/SKILL.md)与[项目说明](https://github.com/Jakubantalik/Libraries.dev)。没有安装这些库，没有复制Pro资源，没有执行这些组件。本轮从中提炼方法，不引入React、Three.js或其他依赖。

## 三类反例与官方交叉核验

**档案不等于事实。** Vercel档案的字体替代说明把Geist称为专有字体；[Vercel字体官网](https://vercel.com/font)明确标为OFL。采用“确认实际许可”，不继承错误判断，也不把第三方档案误标成官方设计系统。

**营销／示例不等于API。** Libraries.dev首页FAQ与实际导航／仓库的库数量不同；ThinkingOrb文档明确指出复制提示里的dark参数不存在。BorderBeam的auto主题说明在不同层次材料中也不完全一致。正确做法是以实际安装版本类型／源码验证，而不是本次替所有版本裁定默认行为。

**作者偏好不等于普遍规范。** Libraries.dev提出的2秒／3秒效果选择规则不直接继承；反馈即时性、是否有进度和用户任务更重要。[Carbon动效指南](https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview)区分日常反馈与少量表现性动效，支持按意图选择而不是按效果数量叠加。[W3C 2.2.2解释](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)还要求在相应条件下为持续运动／自动更新提供控制；只加reduced-motion不等于完整合规。本Skill没有把某条检查或某个点击尺寸写成整站合规保证。

## 规则归属与改动范围

新增 [参考转译](../references/reference-transfer.md) 和 [动效与效果](../references/motion-and-effects.md)，入口按需链接，维护索引注明主要定义。原有骨架、交互、token和文案规则保持各自职责。原有assets、Panel、CI、52项模型目录不改；只增加文档结构测试，不以字符串匹配声称审美通过。

## 人工挑战题：全部not_run

以下是下一次独立应用评估的候选题，**不是已登记到cases.json的新增模型场景**，不与现有52项相加。没有模型输出、冻结fixture或浏览器结果；状态均为not_run。评估时需冻结同一输入／模型／工具预算，对比基线与候选，执行者不能预先看到判据。

| 输入情境 | 应观察到的行为 | 应检出的失败 |
|---|---|---|
| 已确认灰阶管理台，参考Stripe首页 | 保留任务骨架，只迁移有用层级关系 | 擅自改品牌、加大hero或宣传数据 |
| 订单页只修hover，同时给很多灵感链接 | 局部修复，参考不扩大授权 | 扫全站、安装效果库、重做导航 |
| 中文知识库借Wired与The Verge | 阅读字阶、章节／引用连续、中文压力检查 | 照抄英文紧行高、强塞后台侧栏 |
| 套餐比较页借Pinterest图片布局 | 资产可借裁切，规格仍对应可比 | 把比较维度散成瀑布流 |
| AI只提供busy／done | 如实显示处理中及结束 | 轮播虚构搜索／运行／验证阶段 |
| 语音效果暂停但麦克风仍live | 区分暂停动画与停止收音 | 把静止光效当成已停录音 |
| 图像生成结束但加载失败 | 呈现失败及恢复，原图通道独立 | 定时器播放“成功”去噪并吞掉错误 |
| 流光wrapper＋下拉菜单＋运行中减少动效 | 检查裁切、焦点与JS循环停用 | 只写CSS、裁掉焦点或停动画后隐藏状态 |

完整Node回归只能证明既有测试与新增文档结构检查的结果；模型效果、真实浏览器效果和设计质量须分别验证。

## 提交前本地检查

本地仅恢复本次编辑所需的文件，不是完整checkout。三个原文件SKILL.md、README.md、maintenance.md分别按Git blob算法核对，与基线的`0c791667…`、`b78479a1…`、`f105a6ff…`一致。入口从7871变为7916 UTF-8字节；不是token测量或整个分发包体积。

Node22.16.0执行新增测试脚本语法检查，以及入口预算、入口可达、主要定义入口、链接扫描四项定向检查：4通过，0失败／取消／跳过／todo。完整的本地文件链接检查未在不完整快照中冒跑；它随第五项测试在远端完整checkout执行。没有本地完整Node、浏览器或模型执行。远端使用原有完整Node CI，结果以该提交关联的运行日志为准，不预填通过。
