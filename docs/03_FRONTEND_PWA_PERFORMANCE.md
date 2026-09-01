# 03 — Frontend, PWA and Performance

## 1. 页面与路由

建议路由：

```text
/login
/
/today/:module
/study/:module
/settings
```

Settings 只包含 MVP 必需设置，例如主题和登出，不创建 Deferred 功能入口。学习日时区由操作系统 IANA 标识自动决定，Settings 不再编辑。

---

## 2. Login

### UI-005 · P0 · OTP 页面

必须包含：

- Email 输入；
- 发送验证码；
- 六位 OTP 输入；
- resend；
- loading；
- error；
- Session expired；
- 登出。

移动端键盘弹出后仍可操作。

OTP 输入使用合理的：

```text
autocomplete="one-time-code"
inputmode="numeric"
```

---

## 3. Home

### UI-006 · P0 · 本地优先首页

首页先读取本地 summary，再后台同步。

本地缓存可用时，Supabase 慢或断网不能造成白屏或长时间全屏 loading。

首页先显示一个 Next Session 主操作，再显示两个次级模块摘要。模块卡至少显示：

```text
module name
new progress
words learned
Continue
```

另显示 streak、小型 sync state，以及首页顶部的本地 Context Card 搜索框。完整词库不得因 Home 首次绘制而被拉入首屏 bundle；搜索与下一句预览只读本地缓存，搜索首次输入才允许触发已有的 deferred catalog bootstrap。

---

## 4. Today

### UI-007 · P0 · 队列清晰

Today 页面明确分为：

```text
New
Review
Total today
```

必须覆盖：

- 正常数据；
- loading；
- empty；
- offline；
- syncing；
- pending changes；
- no new words；
- no reviews due；
- content shortage；
- Session expired。

不得使用假数字掩盖未加载状态。

---

## 5. Study Card

### UI-008 · P0 · 正面

正面显示：

- context sentence，其中 target text 先隐藏为空白/下划线；
- 语境提问；
- 可选 IPA 和词性。

Reveal 后再高亮 target text，并展开背面。正面不显示中文答案或释义。Reveal 后语境原句（含高亮 target）必须立刻可见，不得被背面信息挤出视口顶部；评分按钮可以在折页下方。

### UI-009 · P0 · 背面

背面按稳定层级显示：

1. Meaning in this context；
2. Plain-English paraphrase；
3. 中文释义；
4. 完整句子翻译；
5. Common collocations；
6. IPA / part of speech；
7. 适用范围；
8. 句子来源。

### UI-010 · P0 · 评分防重复

- 第一次评分触发后立即禁用评分按钮，直到本地事务完成。
- 双击、键盘重复和触摸重复不能创建两个事件。
- 网络同步不阻塞下一张卡。
- 本地保存成功但云端未同步时显示非阻断状态。

---

## 6. Responsive

### UI-011 · P0 · Android

- 不横向滚动；
- 主要操作触控区域至少接近常见移动端可点击尺寸；
- 适合单手；
- 长句自然换行；
- 正文行距舒适；
- 不把所有背面信息挤在一屏；
- 支持安全区域；
- 底部按钮不被浏览器或键盘遮挡。

### UI-012 · P0 · macOS

- 主内容居中；
- 合理 `max-width`；
- 不无限拉宽；
- 支持键盘操作；
- 保持与手机相同的视觉语言；
- 安装后不像后台管理网页。

---

## 7. Theme 与字体

### UI-013 · P0 · Light / Dark

- 支持系统主题；
- 支持用户手动切换；
- 保存偏好；
- React 启动前应用主题，避免 dark mode 先闪白；
- Manifest `background_color` 与页面协调。

### PERF-001 · P0 · 不使用远程字体

MVP 使用系统字体栈，兼顾英文、中文和 IPA。

禁止首屏依赖：

- Google Fonts；
- Adobe Fonts；
- 大型中文 Web Font；
- icon font。

图标使用少量本地 SVG 或单独导入。

---

## 8. Accessibility

### A11Y-001 · P0

至少实现：

- 正确语义标签；
- 表单 label；
- 可见 focus；
- 键盘导航；
- 合理对比度；
- `prefers-reduced-motion`；
- loading / disabled 状态；
- 不只依赖颜色；
- 错误文本与输入关联；
- Screen reader 可识别 reveal 和 rating 状态。

---

## 9. PWA

### PWA-001 · P0 · Manifest

必须配置：

```text
name
short_name
description
start_url
scope
display: standalone
theme_color
background_color
192x192 icon
512x512 icon
maskable icon
```

### PWA-002 · P0 · 安装目标

主要验收：

```text
Android Chrome
macOS Chrome（兼容安装目标）
```

Android 安装后从主屏幕图标直接进入 App。

macOS 安装后可从 Dock / Applications 启动。

### PWA-003 · P0 · Service Worker

使用 `vite-plugin-pwa`，MVP 优先 `generateSW`。

Service Worker 缓存：

- HTML；
- CSS；
- JavaScript chunks；
- Manifest；
- PWA icons；
- 必要静态 SVG。

不得缓存：

- Supabase Auth response；
- token；
- 个人 Review API response；
- 私有数据库查询结果。

### PWA-004 · P0 · 更新

- 检测新版本；
- 不在评分过程中强制刷新；
- 不清空 IndexedDB；
- 不造成白屏；
- 允许用户在安全时机应用更新。

### DESKTOP-001 · P0 · 单前端双交付

macOS 个人版必须由 Tauri 2 包装现有 React / Vite PWA 前端，不得复制页面、学习逻辑、内容模型或 IndexedDB repository。Android 继续使用 installable PWA。

### DESKTOP-002 · P0 · 个人版安装产物

本次生成 Apple Silicon `arm64` 的 `.app` 和 `.dmg`，应用 identifier 固定为：

```text
com.nextcenturyhappiness.wordeasy
```

个人版允许 ad-hoc 签名；不得把未执行的 Developer ID 签名或 Apple 公证声称为通过。

### DESKTOP-003 · P0 · 桌面安全边界

桌面 build 必须：

- 将全部前端资源打入应用，启动不依赖 Preview 或 Cloudflare；首次界面不得等待 Supabase 网络请求；
- 不生成或注册 Service Worker、Web Manifest、Workbox 或 Cloudflare `_headers`；
- 使用严格 CSP、零应用 capability；远程导航默认拒绝，仅放行本地 WebView origin 与本项目 Supabase origin（`https` 与 `wss`，供 Auth / RPC / `review-sync` Edge Function）；
- 不启用 shell、文件系统、HTTP、dialog、updater 等 Tauri plugin；
- 客户端只读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`，读取方式与 cloud web build 相同（本地 `.env` / CI secrets）；不得把 publishable key 写入 git，不得包含或读取 `service_role`。

### DESKTOP-004 · P0 · 本地优先的云端学习边界

macOS 个人版使用与 `npm run dev:cloud` 相同的云端学习 runtime：WebView 内 Email OTP，账户与浏览器同一 Supabase 项目。评分必须先写入 IndexedDB，再异步同步；同步失败不得阻塞学习。同一天 assignment 保持稳定。

桌面使用与浏览器相同的云端账户，并保持 local-first；不得显示常驻 environment / deployment banner 来重复说明这些边界。不得把尚未接入同一账户的 Android standalone PWA 描述为已同步。

---

## 10. 启动架构

### PERF-002 · P0 · 启动顺序

正确顺序：

```text
1. 加载 index.html。
2. 立即应用主题。
3. 渲染最小 App Shell。
4. 并行打开 IndexedDB、读取本地 Session、设置和 Home summary。
5. 显示缓存 Home。
6. 后台恢复/验证 Supabase Session。
7. 后台 push outbox。
8. 后台 pull assignments 和 review states。
9. 无闪烁更新 UI。
10. 预取 Study route 和今日卡片。
```

### PERF-003 · P0 · 禁止远程阻塞

首次本地界面可用前不得串行等待：

- Supabase 网络认证；
- profile 网络查询；
- daily assignment 网络查询；
- Review history 全量查询；
- 完整词库；
- 全部 Review events；
- 全量 FSRS 重算。

### PERF-004 · P0 · 无白屏

在已有本地缓存时：

- 慢网；
- Supabase 不可用；
- 离线；

都应先显示 App Shell 和缓存内容。

---

## 11. Code Splitting

### PERF-005 · P0 · 路由拆包

初始 bundle 只包含：

- App Shell；
- theme 初始化；
- Router core；
- IndexedDB bootstrap；
- local Session restore；
- Home 必需代码。

按需加载：

- Study route；
- FSRS；
- remote sync；
- Settings；
- 非首屏工具。

Home 显示后空闲预取：

- Study route；
- 最可能进入的模块；
- 今日卡片。

### PERF-006 · P0 · 词库不进主包

不得通过：

```ts
import allVocabulary from "./all-words.json";
```

把完整词库打入初始或 Home bundle。

Seed data 通过数据库 seed、导入脚本或测试 fixture 提供。

---

## 12. 首页性能

### PERF-007 · P0 · 不扫描全历史

首页只读本地 summary。

需要在至少 10,000 条模拟 Review events 下验证启动不会进行全表扫描并阻塞主线程。

### PERF-008 · P0 · Performance marks

实现：

```text
app-shell-visible
cached-home-ready
first-study-card-ready
remote-sync-complete
```

并使用 `performance.measure` 生成可测试数据。

---

## 13. 性能预算

### PERF-009 · P0 · Web 指标

Production build 目标：

```text
FCP <= 1.8s
LCP <= 2.5s
INP <= 200ms
CLS <= 0.1
```

### PERF-010 · P0 · PWA 本地启动

```text
Warm launch → App Shell <= 800ms
Warm launch → Cached Home <= 1.2s
Home → Cached first card <= 300ms
```

### PERF-011 · P0 · Bundle

```text
Initial JavaScript gzip <= 150 KiB
Home cumulative JavaScript gzip <= 200 KiB
Initial CSS gzip <= 30 KiB
Compressed precache <= 1.5 MiB
```

### PERF-012 · P0 · 测试环境

至少：

```text
Chrome stable
Android-sized viewport
4x CPU slowdown
Slow 4G cold load
Primed-cache warm load
Offline launch
```

每项运行三次，报告中位数。

环境无法稳定达到绝对时间时，必须报告：

- 测试环境；
- bundle 大小；
- network waterfall；
- main-thread tasks；
- 是否被 Supabase 阻塞；
- 偏差原因。

不得只报告 Lighthouse 总分。

---

## 14. 视觉限制

### UI-014 · P1

禁止引入：

- 大型 UI framework；
- 图表库；
- 与学习无关的动画库；
- 首屏视频；
- 大型背景图；
- 大量渐变；
- 玻璃拟态。

优先使用：

- CSS variables；
- CSS Modules 或少量普通 CSS；
- 本地 SVG；
- 简单、稳定的组件。
