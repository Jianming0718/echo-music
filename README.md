# Echo

现代简约 Web 音乐播放器。音乐来源为 YouTube 官方嵌入播放器、Audius 和本机音频。邮箱账号、收藏、歌单和好友数据使用 Supabase。

## 当前功能和接入状态

- 简约中文界面、桌面与手机布局、队列、随机/循环、播放进度恢复、歌词与 LRC 导入。
- YouTube 链接播放不需要 YouTube Data API key。播放器始终可见，保留原生控制、品牌与广告；页面进入后台时暂停 YouTube 播放。
- 站内 YouTube 搜索已实现，需要配置官方 YouTube Data API key。未配置时可以添加链接或前往 YouTube Music 搜索。
- 已连接实际 Supabase Free 项目 `echo-music`，并应用账号数据库迁移。邮箱确认保持开启，私人收藏和好友歌单受 RLS 保护。面向公众开放邮箱注册前，还需要配置 Auth 站点/回跳地址和正式 SMTP 服务；尚未验证真实注册邮件。
- GitHub Pages 部署工作流已提供。源码仓库为 https://github.com/Jianming0718/echo-music ，Pages 上线状态以部署结果为准。
- YouTube 视频受发布者嵌入权限、地区和网络限制，不能保证每首音乐都能嵌入，也不提供广告移除、音频提取或离线下载。

## 本地运行

直接运行 `python -m http.server 8000 --directory dist`，然后打开 `http://localhost:8000`。网站构建产物已包含，无需安装依赖即可预览。账号回调和 YouTube 播放正式部署请使用 HTTPS。

如需重建第三方 SDK：`npm ci`，然后 `npm run vendor`。运行 `npm test` 可验证播放器核心和真实 PostgreSQL RLS 隔离规则；数据库测试使用本地 PGlite，不连接生产数据库。

## 免费托管方案

前端：GitHub Pages。账号和数据库：Supabase Free。音乐流量：由原音乐服务直接提供，不经过 GitHub 或 Supabase 转发。GitHub Pages 只托管静态文件，不能替代账号后端。

公开个人项目可在免费额度内起步。免费方案有使用限制；Supabase 空闲免费项目可能暂停，公开邮箱注册需要配置可用于正式用户的 SMTP 邮件服务。不能承诺无限用户、无限流量或永久零成本。官方说明：

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/auth-smtp

### 部署到 GitHub Pages

1. 在你控制的 GitHub 账号创建仓库，把本项目全部文件推送到 `main` 分支。GitHub Free 的免费 Pages 通常使用公开仓库。不要上传 IPA、用户音频、密码、访问令牌或 Supabase service-role/secret key。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. Settings → Secrets and variables → Actions → Variables 添加下面的公开浏览器配置：
   - `ECHO_SUPABASE_URL`：Supabase 项目 URL。
   - `ECHO_SUPABASE_ANON_KEY`：Supabase publishable key，或 legacy anon key。
   - `ECHO_YOUTUBE_API_KEY`：可选，启用 YouTube Data API v3 的受限浏览器 key。
4. 运行 `.github/workflows/pages.yml`。工作流生成 `dist/config.js`，然后发布 `dist`。仓库变量会覆盖已提交的公开客户端配置；变量留空时保留已有公开配置。
5. Supabase Auth 的 Site URL 和 Redirect URLs 设置为实际 Pages 地址，包含仓库子路径及末尾斜线。项目支持 `/仓库名/` 路径，服务缓存按路径隔离。
6. 没有连接 Supabase 时可以不设置账号变量；这会明确停用注册和云端功能。未提供 YouTube key 时只停用站内视频搜索，链接播放仍可用。

公开客户端配置也可以用环境变量运行 `node scripts/write-config.mjs` 生成。请不要把 service-role key 或 `sb_secret_` key 置入前端；配置脚本会拒绝常见的服务端 key。YouTube key 应限制为 YouTube Data API v3，并设置允许的 HTTP referrer 域名和本地开发来源。

### 配置 Supabase

1. 创建 Supabase Free 项目，启用 Email/password 登录。
2. 在 SQL Editor 执行 `supabase/migrations/20261107222638_echo_accounts.sql`。迁移建表、索引、函数和 RLS。已有生产数据库的迁移应按顺序管理，不重复修改已应用文件。
3. 保持邮箱确认开启，配置自定义 SMTP。Supabase 默认邮件服务只适合受限测试，不能视为任意公众注册的正式邮件服务。
4. 配置站点 URL 和允许的注册/找回密码回调 URL。使用当前 Sites 预览时加入其站点 URL；迁移到 Pages 时加入 Pages URL。
5. 把项目 URL 与 publishable/anon key 配置到构建变量。数据库角色限制和 RLS 必须保持启用。
6. 用两个真实测试账号验证：确认邮件、登录、密码重设、好友请求、接受、好友歌单可见性、移除好友、账号删除。当前代码测试不会发送真实邮件或创建生产账号。

数据表为 `profiles`、`likes`、`playlists`、`playlist_items` 和 `friendships`。密码和邮箱由 Supabase Auth 管理。用户名搜索只返回公开昵称、用户名与账号 ID。收藏为私有；歌单默认为私有，可明确改为好友可见；好友只读共享歌单，不能改写。只有接收方能接受申请。删除好友撤销共享读取权限。

前端通过官方 Supabase JS SDK 管理会话，不自行保存明文密码。未完成的收藏/歌单同步进入按账号隔离的本机队列，恢复网络后重试。退出登录恢复访客资料。合并访客收藏和歌单需要用户在账号页主动选择。本机音频不上传，其他设备只会获得歌曲资料，必须导入对应文件后播放。

## 播放与歌词

`dist/player-core.js` 为原生 Web 播放核心，管理 HTMLAudio 兼容接口、队列、历史、非重复随机、循环、Play next、错误恢复、恢复进度和 Media Session。

`dist/media-transport.js` 在本机/HTTP 音频和官方 YouTube IFrame Player 之间切换。视频播放保持可见且至少 200×200，不遮挡原生控制，不提取纯音频，不绕过广告与权限。YouTube 播放进入后台或被模态界面完全遮挡时暂停。YouTube 影片版本与原曲版本时长可能不同，无法保证自动歌词匹配；可以导入自己的 LRC 并调整时间偏移。

歌词由 LRCLIB 查询，纯文本歌词明确显示不同步。导入歌词、文件和播放状态属于本机数据。隐私说明在 `dist/privacy.html`。

## 文件

- `dist/index.html`、样式、`dist/app.js`：界面与功能。
- `dist/player-core.js`：通用播放核心。
- `dist/media-transport.js`：YouTube/音频适配。
- `dist/account-service.js`：认证、云端读写、好友与同步队列。
- `dist/config.js`：公开浏览器配置。
- `supabase/migrations/`：后端表、事务与权限。
- `.github/workflows/pages.yml`：GitHub Pages 发布。
- `scripts/`：公开配置与第三方依赖构建。
- `tests/`：播放器与数据库权限测试。

## 许可和来源

Echo 自有代码为 MIT，见 `LICENSE`。第三方媒体与软件保持各自许可。

精选音频 Sanctuary、Hiraeth、Childhood、Moonlight：Scott Buckley，https://www.scottbuckley.com.au ，CC BY 4.0，https://creativecommons.org/licenses/by/4.0/ 。曲目完整保留，以 128 kbps 编码。精选照片来自 Unsplash。Inter 字体采用 SIL Open Font License。第三方 SDK 授权文本在 `dist/vendor/`。

YouTube 影片、元数据及品牌归相应权利方。推荐影片链接指向相应官方 MV，不在仓库托管影片。适配遵循官方播放器接口，参考 https://developers.google.com/youtube/iframe_api_reference 和 https://developers.google.com/youtube/terms/developer-policies 。

Echo 是独立项目，不属于 Spotify、YouTube、Apple 或 NetEase。项目不含上传 IPA 中的 Spotify/Eevee 二进制、源码或订阅绕过逻辑。


## 当前账号后端

项目：`echo-music`，区域：`us-east-1`，创建报价：$0/月（Free 额度内）。项目 ID：`blzeipqcocynqvsgvgtb`。浏览器仅使用公开 publishable key。实际数据库已应用 `20261107222638_echo_accounts.sql`；该文件内容与已应用迁移保持一致。

Auth 配置入口：

- 站点与回跳：https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/url-configuration
- 邮件服务：https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/smtp

正式主站可设为 `https://jianming0718.github.io/echo-music/`。允许回跳地址也应包含当前 Sites 地址 `https://echo-music-free-player.stablepeace1.chatgpt.site/`。保留邮箱确认，不通过关闭确认来绕过邮件配置。

源码仓库：https://github.com/Jianming0718/echo-music 。仓库由所有者创建。GitHub Pages 使用本项目提供的工作流部署，最终上线状态以 Actions 运行结果为准。
