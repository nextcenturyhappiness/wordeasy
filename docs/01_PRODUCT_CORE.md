# 01 — Product Core

## 1. 产品定义

产品名：

```text
wordeasy
```

短名称：

```text
wordeasy
```

这是一个个人长期使用的跨平台英语学习 App，主要运行于：

- Android Chrome 安装型 PWA；
- macOS 个人版 `.app` / `.dmg`（Tauri 2 包装同一套 PWA 前端）；
- macOS Chrome 安装型 PWA；
- 普通 HTTPS 网页。

使用同一套 React + TypeScript 前端和学习内核维护。macOS 外壳不得形成第二套产品代码，Android 不开发独立原生项目；本次不要求上架 Mac App Store 或 Google Play。

---

## 2. 核心学习模型

### CORE-001 · P0 · Context-first

核心学习单元必须是：

```text
Context Card
= word + domain-specific sense + article/medical context
```

App 的目标是帮助用户在科研论文、医学文章、英文教材、指南、病历和临床资料中理解专业词汇，而不是只背：

```text
word = 中文翻译
```

### CORE-002 · P0 · Word、sense、context、card 分离

数据和产品行为必须区分：

- `word`：词形或 lemma；
- `word sense`：某个专业语境中的具体含义；
- `context`：具体句子或上下文；
- `card`：实际参与学习和复习的卡片。

同一 lemma 可以对应多个专业 sense，同一 sense 可以对应多个 context。

Review state 绑定到具体 card，而不是只绑定到单词拼写。

### CORE-003 · P0 · 正面不泄露答案

卡片正面展示：

- 一至两个科研或医学语境句子，目标词先隐藏为空白；
- “这个词在当前语境中是什么意思？”；
- 可选 IPA、词性、模块和分类。

Reveal 后再高亮目标词。

正面不得展示：

- 中文释义；
- 英文答案；
- Plain-English paraphrase；
- 完整中文翻译。

### CORE-004 · P0 · 背面结构

卡片背面至少包含：

```text
Meaning in this context
Plain-English paraphrase
中文释义
完整句子翻译
Common collocations
IPA
Part of speech
适用范围
句子来源
```

中文用于辅助理解，但不能成为唯一学习内容。

---

## 3. 两个学习模块

### CORE-005 · P0 · 模块隔离

首页必须有两个独立入口：

```text
Research English
Medical English
```

两个模块分别维护：

- 每日新词分配；
- 今日新词进度；
- 今日 Review 进度；
- Review state；
- 总学习数；
- 模块级统计；
- 本地缓存。

Research 的操作不能修改 Medical 的进度，反之亦然。

---

## 4. Research English

### RES-001 · P0 · 每日 10 个新词

Research English 每天严格分配：

```text
5 General Research
2 Statistics / Methodology
3 Bioinformatics
```

分类固定标识建议：

```text
general_research
statistics_methodology
bioinformatics
```

不得用其他分类偷偷补足缺口，也不得重复已学卡片冒充新词。

### RES-002 · P0 · 目标

内容用于提高以下材料的阅读速度：

- 医学科研论文；
- 生物信息学论文；
- Statistics / Methods；
- Results；
- Discussion；
- Figure legends；
- Supplementary methods。

### RES-003 · P0 · 词库不足

某个分类不足时必须明确显示：

```text
Not enough new Bioinformatics cards are available.
```

不能生成另一套随机卡，也不能改变 5 + 2 + 3 的含义。

---

## 5. Medical English

### MED-001 · P0 · 每日 10 个新词

Medical English 每天分配 10 个新词。

### MED-002 · P0 · 长期分类覆盖

内容在滚动周期内均衡覆盖：

- Anatomy
- Physiology
- Pathology
- Symptoms
- Signs
- Diseases
- Diagnosis
- Laboratory
- Imaging
- Treatment
- Pharmacology
- Surgery / Procedures
- Clinical expressions

不要求每天全部出现，但不得长期只集中于疾病名词、药物名或解剖名词。

### MED-003 · P1 · 医学语境

卡片语境应覆盖英文教材、临床指南、检查报告、病例和病历表达，而不只是字典定义句。

---

## 6. 首页

### UI-001 · P0 · 简单首页

首页保持简单。主操作是一个 Next Session，而不是两个并列的 Continue。模块入口仍在，但降为次级摘要。参考：

```text
[ search ]

Good morning

Start the next card
Research English · Review
The association was substantially attenuated after adjustment for age and BMI.
[ Start next session ]

Research English    Medical English
6 / 10 new today    3 / 10 new today
128 words learned   74 words learned
[ Continue ]        [ Continue ]

Streak: 12 days
```

允许显示小型同步状态：

```text
Synced
Syncing…
Offline
3 changes pending
```

不得加入：

- 大型 Dashboard；
- 排行榜；
- 成就墙；
- 积分系统；
- 社交动态；
- 复杂图表。

问候语根据计算机当前 IANA timezone 本地计算，不等待网络。Next Session 选择规则见 DEC-032。

### UI-015 · P1 · 首页个人词库搜索

首页顶部提供一个紧凑的胶囊搜索框，检索当前设备 IndexedDB 中的 Context Cards。

匹配字段：中文释义、英文 lemma / display form、语境句、搭配。已学/已复习卡片优先，但仍搜索本地词库，避免第一天搜索为空。

空查询只显示搜索框，不打开独立搜索页。输入框不放中文或英文 placeholder 提示，可访问名称由 `aria-label` / label 提供。无匹配时显示诚实空文案「还没有学过相关的词」，不得回退到公共词典、翻译器或编造释义。不新增 Search 主导航。

---

---

## 7. Today 页面

### UI-002 · P0 · New 与 Review 分离

每个模块均有 Today 页面：

```text
Research English

Today

New
6 / 10

Review
12 / 18

Total today
18 / 28
```

每天的 “10” 只表示 10 个新词，Review 数量另外计算。

### CORE-006 · P0 · 今日进度定义

- `New completed`：今日新卡 assignment 中，至少被评分一次的不同卡片数。
- `New total`：今日固定分配的新卡数。
- `Review completed`：今日 Review 队列中，至少被评分一次的不同卡片数。
- `Review total`：今日稳定 Review 队列中的不同卡片数。
- Again 或 relearning 的重复步骤不能重复增加“完成卡片数”。
- `Total today = New + Review`。

---

## 8. 学习反馈

### CORE-007 · P0 · 统一评分

答案揭示后只使用：

```text
Again
Hard
Good
Easy
```

不得同时出现另一套中文四按钮造成语义重复。

### UI-003 · P0 · 评分交互

- Android 按钮足够大，适合单手操作。
- macOS 支持键盘。
- 防止双击生成两个 Review events。
- 评分后立即进入下一张。
- 离线时仍可评分。
- 同步失败不能阻止继续学习。

可选快捷键：

```text
Space = Reveal
1 = Again
2 = Hard
3 = Good
4 = Easy
```

输入框和 OTP 页面不得响应学习快捷键。

---

## 9. 进度定义

### CORE-008 · P0 · 总学习数

`words learned` 定义为：

```text
至少完成一次新卡学习的不同 word_sense 数量
```

同一 word sense 的多个 context 不重复计为多个 learned words。

### CORE-009 · P0 · Streak

一个计算机当前 IANA timezone 下的 `study_date` 内，只要完成至少一张新卡或 Review 卡，就计为一个学习日。

时区来自操作系统解析的 IANA 标识（通常是 `Intl.DateTimeFormat().resolvedOptions().timeZone`）；无法解析时回退 UTC。Settings 不再提供时区编辑器，也不得用用户手填覆盖。`profiles.timezone` 若仍存在，只作为该 OS 时区的写穿副本，供服务端 daily assignment RPC 校验。

---

## 10. 视觉定位

### UI-004 · P1 · 设计语言

整体风格：

> 简洁、安静、专业、适合长期阅读。视觉系统是当代产品界面：近白/中性表面、单一锐利点缀色、清晰层级、较少 chrome。Context Card（word + domain sense + article/medical context）是视觉中心。

参考：

- 阅读器；
- Notion 的克制；
- Linear 的清晰；
- Anki 的功能性。

禁止：

- 教材/学术期刊式的奶油底与墨绿强调；
- 大量渐变；
- 玻璃拟态；
- 满屏动画；
- 卡通儿童化视觉；
- 奖励金币；
- 复杂游戏化；
- 无关统计图表。

支持 Light mode 和 Dark mode。两者都应是现代中性界面，而不是发闷的墨绿教材风。

---

## 11. MVP 范围

### SCOPE-001 · P0 · 本次必须完成

1. React + TypeScript + Vite。
2. Installable PWA。
3. macOS Chrome 安装条件。
4. Android Chrome 安装条件。
5. Supabase Email OTP。
6. Session 恢复和登出。
7. 两个学习模块。
8. Research 每日 5 + 2 + 3。
9. Medical 每日 10。
10. Context-first 卡片。
11. Again / Hard / Good / Easy。
12. New 与 Review 分离。
13. Today 页面。
14. 首页进度。
15. 成熟的 spaced repetition adapter。
16. IndexedDB 本地持久化。
17. 离线学习。
18. Outbox。
19. 跨设备同步。
20. 幂等 Review event。
21. 幂等 daily assignment。
22. 用户时区。
23. Light / Dark mode。
24. 快速本地启动。
25. Service Worker 静态缓存。
26. 刷新后数据不丢失。
27. 30 张 Research seed cards。
28. 30 张 Medical seed cards。
29. JSON / CSV 内容导入格式。
30. RLS、migrations、测试和 README。
31. macOS Apple Silicon 个人版 `.app` / `.dmg`，复用同一套 PWA 前端和完整 60-card 本地内容。

### SCOPE-002 · Deferred · 本次不得实现

- Add Word；
- Vocabulary 全局搜索页 / 独立 Search 导航（首页本地 Context Card 检索由 DEC-032 授权，不属于本条）；
- 收藏；
- 统计图表；
- AI 自动生成；
- 全文 Article / PDF 导入；
- OCR；
- CSV 导出；
- Anki / `.apkg` 导出；
- 排行榜；
- 好友；
- 社交；
- 管理员后台；
- 多角色权限；
- 成就和积分；
- 推送通知；
- Android APK / AAB 原生包装；
- Mac App Store / Google Play 发布；
- 面向第三方分发的 Developer ID 签名和 Apple 公证。

不得创建空页面、假按钮或 “Coming soon” 导航。

---

## 12. 产品完成定义

### CORE-010 · P0 · 可运行而非静态原型

交付必须是可安装、可学习、可离线、可同步、可构建、可测试的 MVP。

不得只交付：

- 产品方案；
- 静态页面；
- 伪代码；
- 不保存进度的演示；
- 依赖 Anki 才能学习的套壳。
