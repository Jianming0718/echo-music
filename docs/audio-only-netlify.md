# Echo 独立音频播放原型：未启用

用户已取消 Netlify 部署，继续保留现有 GitHub Pages 网站。以下 Netlify 适配器和安装说明只作为可选实现参考；不再要求用户连接 Netlify，也没有对该项目做任何部署或更改。GitHub Pages 不能执行服务端解析代码，因此本分支不能仅靠上传到 Pages 就实现无广告的 YouTube 音频播放。

代码在 `feature/audio-only` 分支。当前 GitHub Pages 和原生 Sites 线上版本未切换，仍是 0.17.1。请勿将本分支的代码准备状态理解为无广告播放已经上线。

## 已实现

- 原创 Node 服务通过固定版本 `youtubei.js@18.3.0` 解析音乐音频，选择纯音频格式；优先 AAC/MP4 以兼容 iPhone。
- 自建服务转发音频；不把可能绑定服务器 IP 的 Google 音频地址直接交给浏览器。只允许 Google 媒体域名和固定路径，逐跳验证重定向，禁止传入任意代理 URL。
- 支持音频 Range、HEAD 和 CORS；缓存短期解析结果、合并相同请求，并在上游 403/410 时最多刷新一次地址。
- 播放器直接调用 HTML audio 的 play，保留真实点击手势；不等待前端异步解析后再尝试自动播放。
- 新传输层保留歌曲 ID、收藏、歌单、歌词、房间和本机文件协议。启用纯音频模式后不创建 iframe、不加载 YouTube iframe API，也不启动 Safari 广告脚本。
- 音频失败会显示重试/搜索其他版本，不切回带广告的嵌入播放器。
- 播放器签名脚本在有内存和时间上限的 QuickJS 中解释，不开放 Node 环境、网络或服务器密钥。

没有复制 ytify/Piped 的 GPL 应用代码；这部分是 Echo 的原创 MIT 代码，使用具有独立许可证的依赖。源码和依赖锁文件在仓库内。会员/账号系统保持现有 Google Sheets/Apps Script；此服务不读取密码、聊天、会员或用户表格。

## 在你的 Netlify 中部署

当前连接没有 Netlify 部署接口，需由账号持有人完成这一步，不需要在聊天中发送任何 token 或密码。

1. 登录你原来的 Netlify 账号，选择 **Add new project → Import an existing project → GitHub**。
2. 选择 `Jianming0718/echo-music`，部署分支选择 **feature/audio-only**。
3. 保留仓库 `netlify.toml` 的自动设置：Node 24、构建命令 `node scripts/check-audio-build.mjs`、发布目录 `audio-gateway-public`、函数目录 `netlify/functions`。无需额外密钥或付费服务。
4. 部署后打开 Netlify 地址，点击测试歌曲。服务健康检查成功不等于音频可播放；要确认真实声音、进度拖动及 iPhone Safari/Chrome 表现。
5. 将 Netlify 站点地址发回。后续会先请求真实音频字节验证，再修改现有 GitHub Pages 的公开配置并切换播放内核；保留当前网址。

本次只部署独立音频服务和测试页，不迁移整个 Echo 网站，也不修改账号后端。不要开启自动付费升级；在 Netlify Billing/Usage 中确认旧套餐的 Functions 和带宽额度。旧套餐的静态站带宽不代表函数调用和音频转发无限，不能保证长期零成本。

## 验证结果与限制

- 新服务和前端通过 35 项本地自动化场景；现有完整回归套件另有 233 项通过。测试覆盖分段音频、来源校验、超时/取消、缓存、格式和播放器状态。这些模拟网络测试不证明商业曲目实际可播放。
- 本次执行环境对两首真实歌曲均未获取到音频，探测返回 `503 SOURCE_UNAVAILABLE`。此前 Supabase 的独立试验也遇到 Google 403；那个已停用的试验没有重新启用。
- Netlify 出口是否能解析和读取完整音乐尚未验证。Google 可能限制数据中心 IP、改变签名或要求额外令牌。如果部署后仍失败，应继续诊断服务或改用其他后端，不能用测试通过掩盖音源失败。
- 不依赖未经验证的公共 Invidious/Piped 实例，不连接别人的私人后端，不使用第三方付费 RapidAPI 密钥。
- 不绕过浏览器真实点击要求；iOS 可暂停、限制或回收后台网页。Media Session/原生音频不构成锁屏持续播放保证。
- 这条路径不运行官方播放器的广告调度。歌曲自身音轨中的口播、赞助片段或视频作者的内容并不会自动删除。
- 当前 Netlify 原生函数文档规定流式响应有 60 秒执行上限、20 MB 响应上限；慢网络或长音频可能触及限制。超过大小上限的已知响应会明确失败。完整歌曲和低速手机网络仍需在部署后验证，不能仅凭开头字节成功承诺完整播放。参考：https://docs.netlify.com/build/functions/api/#streaming-responses
- 每个热函数实例有 120 请求/分钟/IP 的基本保护；不是分布式限流。上线人数增加前需补充平台限流与预算监控。

## 开发与切换

```sh
npm ci --ignore-scripts
npm run test:audio
NODE_USE_ENV_PROXY=1 npm run audio:probe -- --local
npm run audio:probe -- https://实际部署的站点地址
```

探测会读取两首歌前 4096 个音频字节，检查 HTTP 206、AAC/MP4 类型、容器标识和 Content-Range。它不验证完整播放、听感或物理 iPhone，仍需真人播放。

真实服务通过验证后，在公开构建配置中设置 `ECHO_PLAYBACK_MODE=audio-only` 和 `ECHO_AUDIO_GATEWAY_URL` 为该站点的 `/api/audio` HTTPS 地址。禁止将密钥放进此地址；它是公开媒体接口。已有账号、Google 配置、头像存储和搜索设置继续保留。GitHub Pages 仍不能运行解析函数。

只运行 `npm run config` 不会自动启用纯音频；当前模式保持不变。开启纯音频却没有配置有效服务地址时构建会失败，避免发布一个不能播歌的版本。
