# Claude /loop Prompt for Gooda Editor MVP

Use this prompt in Claude Code with `/loop`. It is written to make Claude iterate conservatively on the Gooda editor POC without drifting into plaza/social/community features.

```text
/loop
你正在维护谷搭 Gooda 的 Taro/Vue 小程序编辑器 MVP。

当前项目：
- 项目路径：/Users/rectoln/Workspace/Gooda/gooda-editor-poc
- 核心页面：/Users/rectoln/Workspace/Gooda/gooda-editor-poc/src/pages/index/index.vue
- MRD：/Users/rectoln/Workspace/Workspace/开放平台知识库/MRD/谷搭———痛包MRD.md
- 初步 PRD：https://echotech.feishu.cn/wiki/CHcLwmSmjiFztgkC4MTcJOtqn7f
- 当前产品边界：这是一个痛包排版/模板编辑工具 MVP，本质是移动端图层编辑器。可以做模板分享入口、编辑体验、导入导出、素材与图层能力、模板编辑体验等；不要扩张到广场、社交、社区、关注流、用户关系链、复杂账号体系。

每轮循环请按以下顺序工作：

1. 先建立上下文
   - 阅读 MRD、PRD 能访问到的内容，以及当前核心页面实现。
   - 如果 PRD 链接无法直接读取，就基于项目现状和 MRD 做保守判断，并在报告中说明。
   - 先查看现有功能，不要重写整个页面，不要做大范围重构。

2. Bug 巡检
   - 主动检查当前项目可能有 bug 的地方，重点看：
     - 图层选择、拖动、缩放、旋转、镜像、复制、删除。
     - 双指缩放与旋转、边界限制、图层按钮拖拽吸附、抽屉拖拽反馈。
     - 素材选择、底板无底板、导入图片、保存/读取、撤销/重做。
     - 导出合成是否与画布视觉一致。
     - H5 与小程序构建兼容性，Taro/Vue 写法是否有平台风险。
     - 移动端布局是否溢出、遮挡、文字挤压、触控区域过小。
   - 输出一个简短 Bug 报告：问题、影响、复现/证据、修复方案。
   - 选择 1-3 个最值得修的问题实际修复。优先修真实 bug，其次修明显体验缺陷。

3. MVP 功能拓展
   - 根据 MRD/PRD 和当前实现，只做小步、工具型、可验证的增强。
   - 合适方向包括：
     - 编辑页基础能力补齐：锁定、图层顺序、对齐、吸附、撤销/重做可靠性。
     - 模板编辑/分享入口：通过 URL 或分享图进入指定模板编辑页，但先做轻量本地 mock 或路由参数解析，不做完整社区。
     - 素材管理的轻量优化：分类、无底板、导入、默认素材、最近使用。
     - 导出质量、透明底/白底选项、预览确认。
     - 移动端触控反馈和可访问性。
   - 禁止方向：
     - 广场、社区、信息流、点赞评论关注。
     - 复杂登录、复杂后端、支付、商城。
     - 大型素材池后台、推荐算法。
     - 超出 MVP 的多页面业务系统。

4. 设计与交互约束
   - 保持当前 Apple-like 轻玻璃风格，不要回到厚重卡片、灰色脏阴影、过度装饰。
   - 画布和素材抽屉要服务编辑效率，不要让 UI 控件抢痛包主体。
   - 移动端第一屏应能看到画布、微调条、素材抽屉；避免必须上下滚动才能完成核心操作。
   - 所有文字、按钮、输入数字都要对齐，不得挤压或溢出。
   - 如果改 UI，必须截图验证。

5. 实施规则
   - 改动要小步提交到文件，不要一次性重构全项目。
   - 优先修改 src/pages/index/index.vue 和 src/assets 中必要资源。
   - 不要删除用户已有素材与截图，除非明确确认。
   - 不要引入重量级依赖，除非能说明收益并通过构建。
   - 保持 Taro H5 与 weapp 两端可构建。

6. 每轮验证
   - 至少运行：
     npm run build:h5
     npm run build:weapp
   - 如果涉及 UI/交互，打开或刷新：
     http://localhost:10088/#/pages/index/index
     并截图检查关键状态。
   - 如果构建失败，优先修复构建失败，不要继续加功能。

7. 每轮输出格式
   - 本轮发现：
     - 列出 bug/风险/体验问题，按影响排序。
   - 本轮修复：
     - 列出实际改了什么文件、改了什么行为。
   - 本轮验证：
     - 写明 build:h5 / build:weapp 是否通过。
     - 如有截图，写明观察结论。
   - 下轮建议：
     - 给出 1-3 个下一轮最值得做的小任务。

持续循环目标：
- 让编辑页越来越稳定、像一个可交付的工具 MVP。
- 每轮都必须收敛在“痛包排版编辑器”本身。
- 宁愿做一个小功能做扎实，也不要铺很多半成品。
```

Rollback archives are stored under:

```text
/Users/rectoln/Workspace/Gooda/_rollback_archives/
```
