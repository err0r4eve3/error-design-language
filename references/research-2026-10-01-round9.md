# Telegram Web A 实现研究与迁移边界

研究日期：2026-10-01。用户要求参考 Telegram 实现；本轮选择与当前前端最接近的 Web A，而非推断 iOS、Android、Desktop 或 Web K 使用同一实现。通过 [Telegram 应用目录](https://telegram.org/apps#web-apps) 和 [Web A 仓库](https://github.com/Ajaxy/telegram-tt) 定位来源，读取 master 后固定到 `28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80`。这是本次读取的版本，不是版本号或对未来最新状态的承诺。

## 实际读取的源码

| 固定来源 | 源码里观察到的机制 | 本轮迁移与不迁移 |
|---|---|---|
| [Main.scss](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/main/Main.scss) | 宽屏列布局；小屏改变面板位置、层次与转场；安全区和取消动画分支 | 采用按可用空间切换视图；不用其 600/925px 等应用常量，不锁住全页缩放或照搬固定定位 |
| [Main.tsx](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/main/Main.tsx) 的状态声明与布局 effect 段 | 左／中／右栏是独立状态；小屏不能同时让互斥的两栏处于活动状态，也不能没有可见主栏 | 布局与对象状态分离；仅阅读相关段落，未审计完整应用初始化、网络和账户逻辑 |
| [useHistoryBack.ts](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/hooks/useHistoryBack.ts) | 自有历史栈、关闭与替换条目、会话标识、延迟处理；源码明确没有支持前进导航 | 学习区分界面关闭和历史返回；不移植全局 history 覆盖、前进回退或 Safari 手势阈值。当前样例仅页内返回 |
| [captureKeyboardListeners.ts](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/util/captureKeyboardListeners.ts) | 跳过 isComposing；每个按键从最近注册的处理器向前分配；移除监听器 | 本地详情使用局部监听、组词保护与已消费事件退让；不复制全局注册器 |
| [ChatList.tsx](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/left/main/ChatList.tsx) | 稳定 ID、可选虚拟化、活动列表 Alt+上下导航；数字快捷键受 IS_APP 限制 | 采用稳定对象及局部连续查看；不占用浏览器 Ctrl/Cmd+数字，不为四条记录装虚拟化 |
| [InfiniteScroll.tsx](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/ui/InfiniteScroll.tsx) | 保存元素锚点及 top，根据布局差补偿 scrollTop；提供关闭恢复等选项 | 文档补锚点策略；样例恢复坐标并在目标越界时显露目标，不冒充完整无限列表锚点算法 |
| [ListItem.scss](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/ui/ListItem.scss) | 名称／副文本分层；静态、禁用、hover、focus 等分支 | 沿用现有排版，补当前查看的非颜色标记。源码中的 outline:none、禁用整体 opacity 等不采用，保留独立可见焦点 |

这些是直接源码观察，不是运行效果测量。未登录 Telegram，未打开私人聊天，未做其线上截图、浏览器实测、速度比较或安全审计。上表以独立表述提炼设计关系，不复制 Telegram 的实现代码、资源、品牌、Teact 或 MTProto。没有因“成熟产品这样写”就把所有实现细节当规范。

## 对当前版本的实际改进

基线 `0beffa90699c6a5f5c460c2313f299c1172911ff` 的详情键盘事件无条件处理 Escape；共同合成事件证实，isComposing=true 时也会关闭面板。候选在组词时不关闭，结束组词后仍能正常返回。

在 `patterns.html` 的已认可集合任务上增加窄屏详情与页内返回、比较入口、滚动及可见焦点恢复、局部 Alt+上下、隐藏面板不可聚焦和媒体监听清理；筛选、排序、批量选择、CSV 与数据定义不改。外观不换 Telegram 蓝色，不加聊天气泡或仿通讯录头像。

新增 [连续导航](continuous-navigation.md) 按需指导，并微调 [集合工作流](collection-workflows.md) 以明确窄屏独立详情和非模态分栏不冲突。当前样例未实现浏览器历史、任意列表更新的精确锚点恢复或实体手机系统手势，详见 [本轮验证](../evals/validation-2026-10-01-round9.md)。
