# 2026-10-02 第十六轮：长内容详情与退出路径

远端基线 `52b5320b742ccd27ad47efb56928d345483148df`。第十五轮八文件改动仍是本地成果；本轮从其字节快照继续，不把它当成已推送提交。保留原配色、记录列表和表单业务，不新增运行依赖。

## 问题从真实控件结构复现

`preview.html` 使用原生 `dialog.showModal()`，默认可聚焦子项只有正文末尾的关闭按钮。对同一弹窗注入长详情后，浏览器为聚焦该按钮自动滚到末尾，阅读起点离开视口。滚回开头时，关闭按钮又在可见区域以外。原短文没有这个现象，不能把压力数据复现描述成现有每次打开都坏了。

相同单段压力探针在390×420 CSS px下：旧版正文scrollTop为760、标题顶部y=-713；候选从scrollTop=0、标题顶部y=45开始。候选采用正文滚动和独立操作区，关闭入口在正文滚动时保持位置。两版使用相同源文本；这是几何观测，不是CLS、性能或用户效率实验。

## 读取范围与取舍

| 来源 | 实际读取 | 采用与边界 |
|---|---|---|
| [Radix Themes dialog.css](https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/components/dialog.css) 与 [base-dialog.css](https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/components/_internal/base-dialog.css) | 固定提交，两份文件全文；前者是导入入口，后者明确Overlay、Scroll、ScrollPadding、Content及减少动效分支 | 借鉴滚动区域、边界间距和内容表面分别负责；不复制其类名、动画或outline规则，不声称Radix采用本轮的固定操作区 |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | Scrollable overlay示例与键盘／可访问名称说明 | 外层滚动也是有效方案；不要求业务为了本例改用Radix或自行写事件栈 |
| [W3C APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 初始焦点注释、长内容、关闭／返回与aria-describedby说明 | 阅读起点优先；长结构不机械拼成一条描述；短确认和危险操作另选焦点 |
| [W3C Modal Dialog Example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/) | 长文初始焦点说明与示例非生产警示 | 静态标题可作为焦点位置；示例、DOM断言和实体辅助技术测试不同，不声称复制例子即合规 |

没有运行上游项目、上游测试或第三方账户；没有复制源码。网页当前正文不是这些产品全部客户端的规范。

## 合并到现有Skill的规则

把“弹窗可打开／可关闭”细化为“从哪里开始读、哪一区域滚动、如何退出、关闭后回哪里”。规则合并到已有交互契约，不增加默认必读文件；SKILL.md保持7709 UTF-8字节。阅读型详情使用标题初始焦点，表单／确认仍按任务判断。短内容不占整屏；长内容不靠隐藏必要文字或缩小字号规避。原生关闭态不能被布局声明覆盖。

本例在原生dialog内部添加可收缩正文容器，保留底部按钮在正文外；用打开态flex布局与动态视口最大高度。标题autofocus由浏览器在打开时处理，不新增每次渲染强制聚焦的脚本。上一轮提交快照与草稿实现原样保留，应用脚本字节未变。

## 证据范围

测试直接加载交付的preview HTML/CSS/JavaScript，并明确注入长段落、长标识及较大文字。测试包括初始位置、局部键盘滚动、滚动末尾、反复打开、矮屏调整、原生背景不可聚焦、退出与焦点返回；四类故意破坏只由指定断言失败判定。没有把随机延迟或业务网络作为通过条件。

该测试不证明实体软键盘、所有浏览器、缩放、实际读屏播报、复杂交互内容、嵌套浮层、Portal或整站无障碍。完整结果与交付状态见 [验证记录](../evals/validation-2026-10-02-round16.md)。
