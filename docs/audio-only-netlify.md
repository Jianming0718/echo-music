# 独立音频播放器：已部署测试服务，未切换主站

已完成 Netlify 测试部署。当前阻碍是 YouTube 对服务器访问的验证要求，尚未取得真实可播放音频。

## 当前可核对状态

- 测试页：https://echo-audio-test--music-echo.netlify.app/
- 健康接口：`/api/audio/health`，返回 HTTP 200、`version: 6`、`playbackVerified: false`。
- 最新部署：`6af1f3ef35181df5e80d9821`，目标项目 `music-echo`，包含 Node 音频服务和独立 Edge 探测函数。
- 实测 The Astronaut 与 Dynamite 均返回 HTTP 422、`SOURCE_LOGIN_REQUIRED`、`LOGIN_REQUIRED`，原因为 `Sign in to confirm you’re not a bot`。
- Netlify 主域名保留原生产部署，GitHub Pages 主站仍是 Echo 0.17.1；新内核未启用，PR 保持草稿。

源码位于 `feature/audio-only`。主站地址保持 https://jianming0718.github.io/echo-music/ 。没有迁移账号、修改 Google Sheet、发送邮件、修改会员资料或头像。服务器功能不读取账号密码、聊天、会员或用户表格。

## 已实现的独立播放架构

- 原创 Node 音频服务，固定 `youtubei.js@18.3.0`、`quickjs-emscripten@0.32.0`、`bgutils-js@4.0.3`。依赖锁文件提交到 GitHub。
- 读取 YouTube Music 观看页的实际匿名访客资料与可识别的客户端版本。探测访客支持的 visionOS 0.1 音频接口；遇到明确验证要求时尝试匿名 WebPO 验证与音乐客户端。
- WebPO 绑定歌曲编号，只用于对应媒体请求，不作为账号凭据。仅在 Google 返回完整挑战、完整性令牌和可用回调后使用；不伪造已通过验证的状态。
- Google 播放器签名运算在带内存/时间上限的 QuickJS 中执行。匿名验证适配使用独立 DOM 上下文，浏览器上下文中的回调和字节数组经适配后交给库；不读取 Echo 用户会话。没有把这段 DOM 上下文声明为通用安全沙箱。
- 验证适配单独使用 `jsdom-proof`（固定别名 `jsdom@24.1.3`），兼容当前托管环境；原界面测试继续用开发依赖 `jsdom@31.0.0`。
- 选择原始纯音频 MP4/AAC 或 WebM；不选择视频、DRM、直播或流式片段格式。不使用已知会在读到后续音频时失败的 Android VR 自动备用路径。
- 转发音频而非把服务器 IP 绑定的媒体地址直接交给浏览器。只允许 HTTPS Google 媒体域名与固定路径，逐跳核验重定向，拒绝任意代理 URL，不转发账号 Cookie 或 Authorization。
- Range、HEAD、跨域、短期 URL 缓存和同请求合并；上游 403/410 时最多更新一次。失败原因只返回受限公开字段，不返回令牌、签名地址、内部堆栈或凭据。
- 纯音频传输层同步设置 HTML audio 地址并在真实点击中调用 play，保留歌曲 ID、收藏、歌单、歌词、房间和本机文件协议。启用此模式后不创建 iframe、不加载 iframe API、不启动 Safari 跳广告脚本；失败也不回退到 iframe。

这些代码没有复制其他应用的 GPL 实现；协议参数参考公开资料，MIT 依赖保留自身许可证。原有 `youtube-embed` 模式仍保留用于尚未切换的现有生产站点。

## 验证证据

44 项音频自动化场景通过，覆盖字节转发、分段响应、来源/格式校验、取消、超时、缓存、大小上限、原生播放手势、旧歌曲 ID、快速切歌、验证回调跨 DOM 上下文的兼容性，以及公开错误信息脱敏。新增 Edge 检查覆盖固定测试歌曲、拒绝任意代理输入、脱敏、请求合并与音频范围响应核验。它们不证明真实音源可用。

真实 Netlify 探测始终未取得音频：两首测试歌曲在最新部署中仍要求登录确认非机器人。匿名挑战/令牌流程未解除上游拒绝，不能据此称为「已实现可用的无广告播放」。没有完整歌曲、听感、物理 iPhone 或后台锁屏的成功测试。

服务健康检查只表明程序能响应。测试页可用于复现，尚不是可替代生产音乐播放器的版本。用户需要的主站切换仍待真实音频通过验证；不能以本机模拟测试替代此门槛。

## Edge 实测与外部项目核对

2026-11-09，独立的 `/api/audio/edge-probe?v=c6ASQOwKkhk` 与 `?v=gdZLi9oWNZg` 均成功运行 Edge 函数，但上游播放器返回 `UNPLAYABLE`、`Sign in to confirm you’re not a bot`。HTTP 200 是诊断结果的传输状态，不代表歌曲能播。`playbackVerified` 保持 `false`，未取得真实音频。此实验只证明该客户端请求在本次边缘出口失败，不能推断所有边缘服务或所有客户端都不可行。

探测函数只允许这两首固定测试歌曲；不接受代理地址，不返回访客资料或签名链接。每次上游请求有 10 秒期限，读取大小受限；同实例结果缓存 30 秒并合并并发请求。即使取得音频文件的头部，也只标记范围校验结果，不宣称完整播放成功。路由在 `netlify.toml` 明确声明，避免已打包但没有路由的函数静默不运行。

用户提供的两个项目已核对：

- [NouTube](https://github.com/nonbili/NouTube) 的移动端包装 YouTube 网页，在原生 WebView 中注入脚本。其 [iOS 实现](https://github.com/nonbili/NouTube/blob/main/modules/nou-tube-view/ios/NouTubeView.swift) 在文档开始时注入代码；[内容拦截](https://github.com/nonbili/NouTube/blob/main/content/intercept.ts) 与 [响应处理](https://github.com/nonbili/NouTube/blob/main/lib/intercept.ts) 修改网页请求和广告字段。桌面版使用 Electron 会话协议拦截；扩展版申请 YouTube 域名权限。它没有提供供 Echo 网站直接调用的公共音源 API。普通 Safari 页面无法获得这些原生或扩展权限，也不能注入另一个来源的 iframe。原生路线值得另行评估，但不能把 App 机制宣称为已实现的纯网页音频后端。
- [Reddit 作者原帖及说明](https://www.reddit.com/r/webdev/comments/184tk3m/i_made_a_very_simple_website_that_gets_you_an/) 的核心是生成 YouTube iframe；作者也提到依靠浏览器广告拦截扩展。它不是独立音频解析服务，不能替代当前候选的原生 audio 传输层，也没有证明当前 iPhone 无扩展时能够无广告播放。

以上仅作架构研究，没有复制 NouTube 的 AGPL-3.0 代码，也没有接入它的私人后端或更改 Echo 的许可证。用户没有常开电脑或 NAS，因此未采用依赖用户自托管设备的方案。

用户进一步明确希望隐藏 iframe，而非删除播放内核。核对 `main` 的 `dist/index.html` 与 `dist/refined.css`，现有生产版已经保留 `youtube-engine` 容器，并用 `.media-engine` 的 `left:-10000px` 移出屏幕。该行为只隐藏画面，不会移除广告，也不会赋予 Echo 操作跨域 iframe 内部请求的权限。此实验没有更改生产版的隐藏方式。

## 部署与运行约束

当前上传工具已通过 Netlify 官方票据登录并关联现有项目。`.netlify/` 已忽略，不提交本地关联状态。认证缓存位于仓库之外，不包含在源码或发布目录中；不要在聊天中索取 Token、Cookie 或密码。

只创建独立测试部署，未更改其他项目、访问控制、付费套餐或全局运行时配置。验证适配使用兼容现有运行环境的依赖。

上传时需要 `--skip-functions-cache`，否则 `--no-build` 可能复用先前生成的函数包。已通过健康接口版本核对线上实际版本。构建命令 `node scripts/check-audio-build.mjs`，函数目录 `netlify/functions`，发布目录 `audio-gateway-public`；只发布服务和测试页，不迁移整个 Echo。

Netlify 原生流式函数有 60 秒执行与 20 MB 响应上限；旧套餐静态带宽不代表函数/音频转发无限。代码有每热实例每 IP 每分钟 120 请求的基本保护，不是分布式限流。不保证长期零成本，也未开启付费升级。

Google 可以限制服务器来源、变更私有协议或要求有效登录/运行环境。当前部署对此要求失败。不要加入未验证的公共代理、借用他人的私密后端、索取 Google 登录 Cookie，或自动切回带广告的播放器来掩盖失败。

## 本地命令

```sh
npm ci --ignore-scripts
npm run test:audio
npm run audio:probe -- https://echo-audio-test--music-echo.netlify.app
```

只有真实服务通过音频字节、完整歌曲与拖动验证后，才设置公开 `ECHO_PLAYBACK_MODE=audio-only` 和 `ECHO_AUDIO_GATEWAY_URL`。缺少有效 HTTPS 服务地址时构建会拒绝启用纯音频，防止发布不能播歌的配置。GitHub Pages 本身不运行音频解析代码。
