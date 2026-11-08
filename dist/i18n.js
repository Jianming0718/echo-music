'use strict';
(() => {
 const rows=`邮箱已确认，请登录。\tEmail verified. Please sign in.
登录已过期，请重新登录。\tYour session expired. Please sign in again.
请输入有效邮箱。\tEnter a valid email address.
新密码需为 12–256 个字符。\tUse 12–256 characters for the new password.
邮箱或密码不正确。旧账号迁移后请先重设密码。\tIncorrect email or password. Existing accounts must reset their password after migration.
邮件链接已失效或已使用，请重新申请。\tThis email link expired or was used. Request a new one.
操作次数较多，请稍后重试。\tToo many attempts. Please try again later.
邮件发送暂不可用，请稍后重试。\tEmail delivery is temporarily unavailable. Please try again later.
账号当前不可用。\tThis account is currently unavailable.
新账号服务尚未启用，请稍后重试。\tThe new account service is not active yet. Please try again later.
没有权限执行此操作。\tYou do not have permission for this action.
当前密码不正确。\tThe current password is incorrect.
头像服务暂不可用，请重试。\tThe photo service is unavailable. Please retry.
内容太长，请减少后重试。\tThe content is too long. Shorten it and retry.
歌单资料无效或超过容量限制。\tThe playlist is invalid or exceeds its size limit.
消息编号已被使用，请重新发送。\tThis message ID is already used. Please send again.
连接超时，请重试。\tConnection timed out. Please retry.
当前登录仍由 Supabase Auth 管理。私有 Google Sheet 已保存迁移副本；待 Apps Script 正式切换后，账号使用新的密码哈希和登录会话，旧账号需通过邮件重设密码。密码明文不会写入表格，会话和重设令牌只保存哈希。\tSupabase Auth still handles current sign-ins. A private Google Sheet holds migration copies. After the Apps Script cutover, accounts use new password hashes and sessions; existing users reset their password by email. Plaintext passwords are never written to the workbook. Only hashes of session and recovery tokens are stored.
收藏、歌单、好友关系、聊天文字和歌曲资料目前保存在 Supabase，并有运营者私有 Google Sheet 迁移副本。正式切换后将由 Sheets 保存并通过已认证的 Apps Script 接口访问。好友只能读取明确共享的歌单和双方聊天；移除好友撤销访问。聊天没有端到端加密，运营者可访问私有管理表。草稿只在页面内存中保存，歌曲卡片不复制音频，本机文件不能直接发送给好友。\tSupabase currently stores favorites, playlists, friendships, messages and song metadata, with migration copies in the operator’s private Google Sheet. After cutover, Sheets stores these records behind authenticated Apps Script endpoints. Friends can read only explicitly shared playlists and their mutual chats. Removing a friend revokes access. Chats are not end-to-end encrypted; the operator can access the private workbook. Drafts stay in page memory, song cards do not copy audio, and local files cannot be sent directly.
账号通知邮件可由运营者通过 Apps Script 手动发送。迁移前认证邮件由 Supabase 处理，切换后由 Apps Script 发送邮箱验证与密码重设邮件。\tThe operator can manually send account notices through Apps Script. Supabase sends authentication emails before migration; Apps Script sends verification and password-reset emails after cutover.
管理员\tAdministrator
用户管理\tManage users
编辑用户\tEdit user
编辑\tEdit
返回用户列表\tBack to users
保留当前头像\tKeep current photo
移除头像\tRemove photo
保存用户资料\tSave user profile
用户资料已保存。\tUser profile saved.
用户管理暂不可用\tUser management unavailable
仅管理员可操作。\tAdministrator access required.
管理员可修改昵称、用户名和头像；账号状态与会员仍由私有管理表维护。\tAdministrators can edit names, handles, and photos. Account status and membership remain controlled by the private management sheet.
选择现有头像时，服务器会复制到目标账号目录，不会修改来源用户的照片。\tThe server copies the selected photo into the target account’s directory without changing the source photo.
请在 Userscripts 中更新已安装脚本至 0.2.0；只刷新网页不会更新旧脚本。\tUpdate the installed script to 0.2.0 in Userscripts. Refreshing this website alone will not update an older script.
脚本版本过旧，请更新至 0.2.0\tScript outdated. Update to 0.2.0.
已检测到广告，正在静音并尝试加速\tAd detected; muting and trying to accelerate
脚本尝试点击跳过按钮，并对明确标记的广告静音和加速。新版增加多视频检测与播放前静音保护；连接状态不代表广告已跳过，部分广告仍需要等待。\tThe script tries skip buttons and mutes and accelerates marked ads. This update adds multi-video detection and startup muting. Connected does not mean an ad was skipped; some ads still require waiting.
请重新登录。\tPlease sign in again.
这个用户名已被使用。\tThis handle is already taken.
请检查昵称和用户名。\tCheck the display name and handle.
头像路径格式无效。\tInvalid photo path.
头像复制失败，请确认来源照片存在。\tPhoto copy failed. Check that the source photo exists.
未找到该用户。\tUser not found.
用户管理暂时不可用，请重试。\tUser management unavailable. Please retry.
音乐\tMusic
搜索\tSearch
资料库\tLibrary
收藏\tFavorites
好友\tFriends
歌单\tPlaylists
导入音乐\tImport music
关于 Echo\tAbout Echo
听友\tListener
设置\tSettings
语言\tLanguage
搜索音乐库\tSearch the music library
音乐库\tMusic library
歌曲或歌手\tSong or artist
听点什么\tPick something to play
最近播放\tRecently played
歌曲\tSongs
分类\tCategory
时长\tDuration
全部\tAll
本机\tOn this device
华语\tMandopop
欧美\tWestern
电子\tElectronic
纯音乐\tInstrumental
其他\tOther
未分类\tUncategorized
搜索结果\tSearch results
搜索范围\tSearch scope
音乐分类\tMusic categories
结果类型\tResult type
视频\tVideos
加载更多\tLoad more
正在搜索音乐库…\tSearching the music library…
暂时无法搜索\tSearch unavailable
重试\tTry again
搜索其他版本\tFind another version
重试播放\tRetry playback
在 YouTube 打开\tOpen in YouTube
在 YouTube 查看\tView on YouTube
在 Audius 查看\tView on Audius
没有找到歌曲\tNo songs found
没有找到结果\tNo results found
换个关键词试试。\tTry a different search.
试试其他歌曲名或歌手。\tTry another song or artist.
搜索次数较多，请稍后重试。\tToo many searches. Please try again shortly.
搜索超时，请重试。\tSearch timed out. Please try again.
搜索响应异常，请重试。\tThe search response was invalid. Please try again.
暂时无法连接音乐搜索，请重试。\tMusic search is unavailable. Please try again.
搜索服务未连接\tSearch service not connected
连接音乐搜索后端后即可在这里搜歌。\tConnect the music search service to search here.
本机音乐\tLocal music
音频文件保存在此设备。\tAudio files stay on this device.
添加音乐\tAdd music
导入音频\tImport audio
Echo 精选\tEcho selections
新建歌单\tNew playlist
还没有收藏\tNo favorites yet
点击歌曲旁的心形按钮即可收藏。\tTap the heart beside a song to save it.
播放\tPlay
暂停\tPause
取消加载\tCancel loading
收藏当前歌曲\tLike current song
播放队列\tPlay queue
清空队列\tClear queue
队列为空。\tThe queue is empty.
队列已结束\tThe queue has ended
暂时无法播放\tPlayback unavailable
下一首播放\tPlay next
加入队列\tAdd to queue
添加到歌单\tAdd to playlist
分享给好友\tShare with a friend
分类 ·\tCategory ·
复制链接\tCopy link
取消收藏\tUnlike
移除本机副本\tRemove local copy
来源与授权\tSource and license
好友可见\tVisible to friends
仅自己\tOnly me
删除\tDelete
从歌曲菜单添加到此歌单。\tAdd songs using a song's menu.
歌单名称\tPlaylist name
创建\tCreate
取消\tCancel
歌单已创建\tPlaylist created
睡眠定时\tSleep timer
关闭\tOff
音量\tVolume
刷新到最新版\tRefresh to the latest version
隐私说明\tPrivacy
正在播放\tNow playing
歌词\tLyrics
LYRICS\tLyrics
同步歌词\tSynced lyrics
歌词 · 未同步\tLyrics · not synced
跟随歌词\tFollow lyrics
歌词设置\tLyrics settings
导入歌词\tImport lyrics
重新查询\tLook up again
编辑歌曲资料\tEdit song details
移除导入的歌词\tRemove imported lyrics
歌词偏移（秒）\tLyrics offset (seconds)
正值延后，负值提前。点击同步歌词可跳转播放进度。\tPositive values delay lyrics; negative values advance them. Tap a synced line to seek.
加载歌词…\tLoading lyrics…
暂无歌词\tNo lyrics available
可以导入 LRC 或文本歌词。\tImport an LRC or text file.
可以导入自己的歌词文件。\tYou can import your own lyrics.
可以重试，或导入 LRC 歌词。\tTry again or import an LRC file.
此曲目没有歌词。\tThis track has no lyrics.
暂无匹配歌词\tNo matching lyrics
试试导入 LRC 歌词。\tTry importing an LRC file.
歌词暂不可用\tLyrics unavailable
加载超时，请重试。\tLoading timed out. Please try again.
暂时无法加载歌词。\tLyrics could not be loaded.
歌词服务繁忙，请稍后重试。\tThe lyrics service is busy. Please try again shortly.
已导入歌词\tImported lyrics
歌词来源\tLyrics from
账号\tAccount
登录\tSign in
注册\tSign up
创建账号\tCreate account
邮箱\tEmail
密码\tPassword
确认密码\tConfirm password
当前密码\tCurrent password
新密码\tNew password
昵称\tDisplay name
用户名\tUsername
保存\tSave
上传头像\tUpload photo
移除头像\tRemove photo
修改密码\tChange password
忘记密码\tForgot password
设置新密码\tSet a new password
重设密码\tReset password
通过邮件重设密码\tReset password by email
返回账号\tBack to account
返回登录\tBack to sign in
免费账号\tFree account
账号已暂停\tAccount suspended
账号已停用\tAccount disabled
已同步\tSynced
正在同步\tSyncing
同步待重试\tSync needs a retry
刷新账号资料\tRefresh account
合并本机收藏与歌单\tMerge local favorites and playlists
退出登录\tSign out
删除账号\tDelete account
删除账号？\tDelete your account?
确认删除账号\tConfirm account deletion
账号、云端收藏、歌单和好友关系将被永久删除。本机音频文件不会删除。\tYour account, cloud favorites, playlists, and friendships will be permanently deleted. Local audio files will remain.
继续使用\tContinue
继续使用本机\tContinue on this device
账号服务尚未连接。\tThe account service is not connected.
请先登录账号。\tPlease sign in first.
账号服务连接失败，本机功能仍可使用。\tThe account service is unavailable. Local playback still works.
账号已登录，云端资料暂未加载。请稍后重试。\tSigned in, but cloud data could not be loaded. Please try again shortly.
账号资料已删除。\tAccount deleted.
已保存。\tSaved.
密码已更新。\tPassword updated.
头像已更新。\tPhoto updated.
正在处理照片…\tProcessing photo…
正在上传…\tUploading…
照片上传失败，请重试。\tPhoto upload failed. Please try again.
移除失败，请重试。\tCould not remove the photo. Please try again.
照片正在上传，请稍候。\tA photo is uploading. Please wait.
请选择已处理的 JPEG 照片。\tChoose a processed JPEG photo.
登录状态已改变。\tYour sign-in session changed.
请选择 10 MB 以内的照片。\tChoose a photo smaller than 10 MB.
无法读取这张照片，请使用 JPEG、PNG 或 WebP。\tThis photo could not be read. Use JPEG, PNG, or WebP.
照片尺寸过大。\tThis photo's dimensions are too large.
此浏览器暂时无法处理照片。\tThis browser cannot process the photo.
照片处理失败，请换一张照片。\tPhoto processing failed. Try another photo.
新密码至少需要 12 个字符。\tYour new password needs at least 12 characters.
两次输入的密码不一致。\tThe passwords do not match.
请重新登录后修改密码。\tSign in again to change your password.
用户名需为 3–24 位小写字母、数字或下划线。\tUse 3–24 lowercase letters, numbers, or underscores for your username.
昵称需为 1–40 个字符。\tUse 1–40 characters for your display name.
这个用户名已被使用。\tThis username is already taken.
已有好友关系或好友申请。\tA friendship or request already exists.
请先确认邮箱后登录。\tConfirm your email before signing in.
邮箱或密码不正确。\tIncorrect email or password.
请检查邮箱，点击确认链接后登录。\tCheck your email and confirm your address before signing in.
注册成功。\tAccount created.
如果邮箱已注册，会收到重设密码的邮件。请在发起重设的浏览器中打开链接。\tIf this email is registered, a reset message will arrive. Open its link in the browser where you requested it.
邮件服务尚未完成配置，暂时无法发送邮件。\tEmail delivery has not been configured yet.
邮件发送次数已达服务限制，请稍后重试。\tThe email sending limit was reached. Please try again later.
操作失败，请重试。\tThe action failed. Please try again.
同步仍待重试。\tSync still needs a retry.
同步暂不可用，本机收藏已保留。\tSync is unavailable. Your favorites are saved on this device.
同步暂不可用，本机歌单已保留。\tSync is unavailable. Your playlists are saved on this device.
删除暂未同步，请稍后重试。\tThe deletion has not synced yet. Please try again.
没有待合并的本机资料。\tThere is no local data to merge.
本机收藏和歌单已加入同步队列。\tLocal favorites and playlists were added to the sync queue.
该曲目暂无可播放音源，请导入本机副本或搜索音乐库。\tNo playable source is available. Import a local copy or search the music library.
好友关系\tFriendship
登录后添加好友\tSign in to add friends
使用用户名查找好友。\tFind friends by username.
刷新\tRefresh
查找\tFind
正在加载…\tLoading…
好友申请\tFriend requests
接受\tAccept
拒绝\tDecline
取消申请\tCancel request
聊天\tChat
移除\tRemove
还没有好友。\tNo friends yet.
已发送\tSent
暂时无法加载好友，请重试。\tFriends could not be loaded. Please try again.
添加好友\tAdd friend
已申请\tRequested
没有找到这个用户名。\tThis username was not found.
好友歌单\tFriend's playlists
这位好友还没有分享歌单。\tThis friend has not shared any playlists.
还没有好友。先在好友页添加对方。\tNo friends yet. Add someone on the Friends page first.
好友暂时无法加载。\tFriends are temporarily unavailable.
还没有消息\tNo messages yet
双方确认好友后才能发送消息。\tBoth people must accept the friendship before chatting.
更早的消息\tEarlier messages
消息\tMessage
发送\tSend
发送失败\tSend failed
消息暂时无法加载，请重试。\tMessages could not be loaded. Please try again.
好友关系已结束，无法读取聊天。\tThis friendship has ended. The chat is unavailable.
请输入消息或选择歌曲。\tEnter a message or choose a song.
，内容已保留，可重试。\t Your draft is saved. Please try again.
分享音乐\tShare music
歌曲已分享\tSong shared
该曲目暂不支持直接分享。\tThis track cannot be shared directly.
这首歌曲暂不支持直接分享。\tThis song cannot be shared directly.
本机文件不能直接分享。\tLocal files cannot be shared directly.
浏览器阻止了播放，请再点一次播放；若仍无声，可在 YouTube 打开。\tThe browser blocked playback. Tap play again; if it still fails, open the song in YouTube.
视频参数无效，请重新选择歌曲。\tInvalid video. Choose the song again.
YouTube 视频解码失败，请重试或换一个版本。\tYouTube could not decode this video. Retry or choose another version.
视频已移除或设为私密。\tThis video was removed or made private.
发布者不允许嵌入播放此视频。\tThe publisher does not allow this video to be embedded.
YouTube 无法验证网页来源，请直接在浏览器打开本站后重试。\tYouTube could not verify the page origin. Open Echo directly in your browser and retry.
YouTube 暂时无法播放此视频。\tYouTube cannot play this video right now.
YouTube 播放器加载超时，请检查网络后重试。\tThe YouTube player timed out. Check your connection and retry.
YouTube API 加载超时。\tThe YouTube API timed out.
无法连接 YouTube，请检查网络。\tCould not connect to YouTube. Check your connection.
YouTube 视频播放器\tYouTube video player
YouTube 官方嵌入播放 · Audius · 本机音频\tYouTube embedded playback · Audius · Local audio
精选曲目 Sanctuary、Hiraeth、Childhood、Moonlight 由\tSanctuary, Hiraeth, Childhood, and Moonlight are provided by
提供，采用\tand licensed under
，以 128 kbps 编码。摄影来自 Unsplash，Inter 字体使用 SIL Open Font License。\t, encoded at 128 kbps. Photos are from Unsplash; Inter uses the SIL Open Font License.
。YouTube 视频的广告、地区限制和嵌入权限由 YouTube 及发布者决定。Echo 不属于 Spotify、YouTube、Apple 或 NetEase。\t. YouTube and publishers control video ads, regional restrictions, and embedding permissions. Echo is independent of Spotify, YouTube, Apple, and NetEase.
下载完整源码\tDownload full source
主导航\tMain navigation
清除搜索\tClear search
歌曲选项\tSong options
开启随机播放\tEnable shuffle
关闭随机播放\tDisable shuffle
上一首\tPrevious song
下一首\tNext song
单曲循环\tRepeat one
列表循环\tRepeat all
关闭循环\tRepeat off
静音\tMute
打开歌词\tOpen lyrics
打开播放队列\tOpen play queue
关闭对话框\tClose dialog
关闭播放页\tClose now playing
切换歌词\tToggle lyrics
播放进度\tPlayback position
播放和歌词\tNow playing and lyrics
播放控制\tPlayback
当前歌曲选项\tCurrent song options
当前专辑封面\tCurrent album artwork
专辑封面\tAlbum artwork
歌词文本\tLyrics text
添加到收藏\tAdded to your liked songs
已从收藏移除\tRemoved from liked songs
先添加一些歌曲。\tAdd some songs first.
已加入队列末尾\tAdded to the end of your queue
这首歌已在队列中\tThis song is already in your queue
这首歌将于下一首播放\tThis song will play next
这首歌正在播放\tThis song is already playing
队列已清空，当前歌曲继续播放。\tQueue cleared. The current song keeps playing.
歌曲链接已复制\tSong link copied
随机播放已开启\tShuffle is on
随机播放已关闭\tShuffle is off
睡眠定时已结束。\tSleep timer finished. Rest well.
睡眠定时已关闭\tSleep timer off
正在添加音乐…\tAdding your music…
此文件无法移除。\tThis file could not be removed.
歌曲已从此浏览器移除。\tSong removed from this browser.
请选择小于 250 KB 的歌词文件。\tChoose a lyrics file smaller than 250 KB.
此文件没有歌词行。\tThis file contains no lyric lines.
此歌曲的歌词已保存\tLyrics saved for this song
此浏览器无法保存该偏好设置。\tYour browser could not save this preference.
设备存储不可用，内置音乐仍可播放。\tDevice storage is unavailable. Included music still works.
歌曲资料\tSong details
歌曲名称\tSong title
歌手\tArtist
专辑\tAlbum
保存歌曲资料\tSave song details
准确的歌名和歌手有助于匹配歌词。\tAccurate song titles and artist names help match lyrics.
分享歌曲\tSHARE THIS SONG
分享一首好歌。\tA good song to share.
选择并复制链接\tSelect and copy this link
删除歌单\tDelete playlist
删除这个歌单？\tLet this playlist go?
移除本机歌曲\tREMOVE IMPORTED SONG
从 Echo 移除\tRemove from Echo
此操作移除 Echo 中的副本及歌单条目，原始文件仍保留在设备上。\tThis removes the copy in Echo and its playlist entries. Your original file stays on your device.
匹配我的音乐\tYOUR MUSIC, MATCHED
选择你的录音。\tChoose your recording.
先导入音频文件，将其加入资料库。\tImport an audio file first to add it to your library.
导入我的音频文件\tImport my audio file
官方发行\tOfficial releases
正在搜索官方发行…\tSearching official releases…
音乐库地区\tCatalog region
美国\tUnited States
英国\tUnited Kingdom
韩国\tSouth Korea
日本\tJapan
台湾\tTaiwan
重试\tTry again
在线音乐暂时不可用。\tThe music will be back.
继续探索。\tKeep exploring.
搜索音乐库…\tSearching the music catalog…
加载中…\tLoading more…
加载更多歌曲\tLoad more songs
暂无可用音源，请搜索其他歌曲。\tNo freely streamable tracks were found. Try another song or artist. The Audius catalog differs from other streaming services.
Audius 音乐库\tFrom the Audius catalog
Audius 热门\tTrending on Audius
在线音乐库暂不可用。\tThe online catalog is temporarily unavailable.
音乐库响应异常，请重试。\tThe catalog returned an unexpected response. Please try again.
音乐库响应超时，请重试。\tThe music catalog took too long to respond. Please try again.
请求过多，请稍后重试。\tAudius is receiving too many requests. Please try again shortly.
此分享歌曲暂不可用。\tThis shared song is unavailable.
歌手资料加载超时，请重试。\tArtist information timed out. Please try again.
界面图标来自\tInterface icons by
（ISC 许可）。\t(ISC license).
外观偏好\tAppearance preferences
主题与动态背景偏好只保存在本机。动态背景启用时会尝试读取封面配色，读取失败时使用本地配色，不上传照片或音频。\tTheme and animated background preferences stay on this device. When enabled, the background attempts to sample album artwork colors and falls back to a local palette. No photos or audio are uploaded.
歌手与发行作品资料使用 YouTube Music；精确发行日期仅在 iTunes 记录明确匹配时显示。查询会发送歌手或作品名称，不上传音频文件。仅有年份的记录不会补出月份和日期。\tArtist and release information comes from YouTube Music. Exact release dates appear only when iTunes records match unambiguously. Queries send artist or release names, not audio files. Year-only records do not acquire invented months or days.
外观\tAppearance
深色\tDark
浅色\tLight
动态背景（实验性）\tAnimated background (experimental)
查看歌手\tView artist
歌手资料服务尚未连接。\tThe artist information service is not connected.
暂未找到这位歌手的资料。\tNo profile was found for this artist.
请求较多，请稍后重试。\tToo many requests. Please try again shortly.
歌手资料暂时不可用，请重试。\tArtist information is unavailable. Please try again.
歌手资料格式异常。\tThe artist information response was invalid.
发行作品资料不匹配。\tThe release information did not match.
无效的发行作品。\tInvalid release.
发行作品\tReleases
正在加载歌手资料…\tLoading artist information…
暂无歌手简介\tNo artist biography available
单曲与 EP\tSingles and EPs
暂未查到此类发行作品。\tNo releases of this type were found.
当前歌曲\tCurrent song
在音乐库搜索歌手\tSearch this artist in the music library
查看歌手页面\tView artist page
返回歌手\tBack to artist
正在加载发行作品…\tLoading release…
发行年份\tRelease year
发行日期\tRelease date
暂无发行日期\tRelease date unavailable
播放全部\tPlay all
该发行作品暂无可播放曲目。\tNo playable tracks are available for this release.
查看发行作品页面\tView release page
日期资料\tDate source
发行作品暂时不可用\tRelease unavailable
请稍后重试。\tPlease try again shortly.
取消静音\tUnmute
Safari 广告跳过\tSafari ad skipping
安装与状态\tSetup and status
需要免费的 Userscripts Safari 扩展，普通网页无法自行取得这项权限。\tRequires the free Userscripts Safari extension. A webpage cannot grant itself these permissions.
允许广告跳过脚本\tAllow the ad helper script
安装 Userscripts\tInstall Userscripts
在 iPhone 设置中启用 Safari 的 Userscripts 扩展，并允许它访问 Echo、youtube.com 和 youtube-nocookie.com。\tEnable Userscripts for Safari in iPhone Settings, and allow access to Echo, youtube.com, and youtube-nocookie.com.
用 Safari 打开跳广告脚本\tOpen the ad helper script in Safari
打开 Safari 的扩展菜单，选择 Userscripts 并安装脚本。也可以将下载的文件保存到 Userscripts 指定的文件夹。\tOpen Safari's extensions menu, select Userscripts, and install the script. You can also save the downloaded file in the directory selected in Userscripts.
回到 Echo 刷新页面，再播放音乐；上方会显示脚本是否已连接。\tReturn to Echo, refresh, and play a song. The status above shows whether the script is connected.
脚本尝试点击跳过按钮，并对播放器明确标记为广告的片段静音和加速；不会自动点击播放或跳过歌曲。部分广告仍可能需要等待，实际效果需在手机验证。\tThe script tries ad skip buttons and mutes and accelerates segments explicitly marked as ads by the player. It never starts playback or seeks past songs. Some ads may still require waiting. Verify the actual behavior on your phone.
此方案用于 Safari；iPhone Chrome 无法加载 Safari 扩展。\tThis method is for Safari. Chrome on iPhone cannot load Safari extensions.
下载脚本文件\tDownload script file
广告跳过脚本已关闭\tAd helper script disabled
未检测到 Safari 跳广告脚本\tSafari ad helper script not detected
正在尝试跳过广告\tTrying to skip an ad
Safari 跳广告脚本已连接\tSafari ad helper script connected
可选 Safari 脚本\tOptional Safari script
可选脚本只在收到 Echo 的握手后处理 YouTube 播放器标记的广告。它不会读取或上传账号、歌单或聊天内容，也不会请求其他网络服务。安装和网站访问权限由你在 Safari 扩展中管理。\tThe optional script handles player-marked YouTube ads only after a handshake from Echo. It does not read or upload accounts, playlists, or chat content and does not request other network services. You manage installation and website permissions in your Safari extension.
返回 Echo\tBack to Echo
热门音乐\tPopular music
请尝试其他歌曲或歌手。\tTry another song or artist.
目前没有收藏。\tNo favorites yet.
开启循环\tEnable repeat
移除歌曲\tRemove song
新建歌单\tCreate playlist
Echo 首页\tEcho home
音乐播放器\tMusic player
切换音量\tToggle volume
收藏当前歌曲\tLike current song
取消收藏当前歌曲\tUnlike current song
单曲循环\tRepeat this song
列表循环\tRepeat all songs
本机音乐\tYour music
你的歌单\tYOUR PLAYLIST
歌曲资料\tSONG DETAILS
填写正确的歌曲资料。\tFind the right words.
当前歌曲\tcurrent song
隐私说明 · Echo\tPrivacy · Echo
账号与密码\tAccounts and passwords
头像\tProfile photos
管理表与会员\tAdministration and membership
好友与聊天\tFriends and chat
第三方服务\tThird-party services
删除与访问\tDeletion and access
托管\tHosting
本机音频使用浏览器 IndexedDB 保存，不上传。访客收藏、歌单、播放状态和导入歌词保存在此浏览器。清除浏览器资料会删除本机副本，请保留原始文件。\tLocal audio stays in this browser's IndexedDB and is not uploaded. Guest favorites, playlists, playback state, and imported lyrics stay in this browser. Clearing browser data removes local copies; keep your original files.
邮箱、密码和登录会话由 Supabase Auth 管理。Echo 不自行保存明文密码，也不把密码或会话令牌写入 Google Sheet。密码修改与重设通过 Supabase 的认证接口完成。\tSupabase Auth manages email addresses, passwords, and sign-in sessions. Echo does not store plaintext passwords or write passwords or session tokens to Google Sheets. Password changes and resets use Supabase authentication APIs.
选择的照片会在浏览器中裁切并重新编码为 JPEG，上传到私有头像存储。账号持有人和能查看其资料的已登录听友可取得临时访问链接。更换或删除头像会移除旧照片；账号删除会先清理该账号的头像文件。\tPhotos are cropped and re-encoded as JPEG in your browser, then uploaded to private storage. The account owner and signed-in listeners who can view the profile can obtain temporary image links. Replacing or removing a photo removes the old image. Account deletion first cleans up owned photos.
运营者的私有 Google Sheet 保存用户 ID、邮箱、昵称、用户名、头像路径、账号状态、会员等级与时间。表格不对普通用户开放。连接后，Apps Script 会验证用户身份，再同步该用户的资料；管理员密钥只保存在服务器与脚本属性中。会员和账号状态由后端验证。\tThe operator's private Google Sheet stores user IDs, emails, display names, usernames, photo paths, account status, membership tiers, and timestamps. It is not accessible to ordinary users. Apps Script verifies the signed-in user before synchronizing that user's details. Administrator keys stay on the server and in script properties. The backend validates membership and account status.
收藏、歌单、好友关系、聊天文字和歌曲资料保存在 Supabase。好友只能读取明确共享的歌单。聊天只允许已确认好友收发；移除好友撤销访问，历史记录保留至任一参与者删除账号。聊天没有端到端加密，未发送的草稿只在页面内存中保存。歌曲卡片不复制音频，本机文件不能直接发送给好友。\tSupabase stores favorites, playlists, friendships, messages, and song metadata. Friends can read only explicitly shared playlists. Chat is available to confirmed friends. Removing a friend revokes access; history remains until either participant deletes their account. Chat is not end-to-end encrypted. Unsent drafts stay in page memory. Song cards do not copy audio, and local files cannot be sent directly.
音乐库搜索和播放使用 YouTube Music／YouTube，可播放音频也可来自 Audius，歌词查询使用 LRCLIB。相应服务会接收加载请求、关键词、IP 与浏览器资料。YouTube 播放器保留在页面内用于播放，视频画面不在界面中显示；加载时 YouTube 会接收相关请求。歌曲资料可能使用外部封面。账号通知邮件可由运营者通过 Apps Script 手动发送。迁移前认证邮件由 Supabase 处理，切换后由 Apps Script 发送邮箱验证与密码重设邮件。\tMusic search and playback use YouTube Music and YouTube. Audio can also come from Audius; lyrics use LRCLIB. These services receive loading requests, search terms, IP addresses, and browser details. The YouTube player remains in the page for playback, with its video surface outside the visible interface. YouTube receives player requests. Song metadata may use external artwork. The operator can manually send account notices through Apps Script. Supabase sends authentication emails before migration; Apps Script sends verification and password-reset emails after cutover.
可以取消收藏、删除歌单、移除好友、移除头像及删除账号。账号删除会移除云端账号资料，本机音频需在资料库中移除或清除浏览器资料。退出登录恢复访客资料，不显示上一账号的私人收藏和歌单。\tYou can remove favorites, playlists, friends, photos, and your account. Account deletion removes cloud account data. Remove local audio in Library or clear browser data. Signing out restores guest data and does not show the previous account's private favorites or playlists.
网站由 GitHub Pages 或当前 Sites 部署托管。托管及数据服务可能保留标准运行日志。公开源码不包含用户表格内容、密码、私密管理员密钥或用户照片。\tThe website is hosted on GitHub Pages or the current Sites deployment. Hosting and data services may retain standard operational logs. Public source code excludes user spreadsheet contents, passwords, private administrator keys, and user photos.`;
 const pairs=rows.split('\n').map(row=>row.split('\t')),zh=new Map(),en=new Map();
 for(const [chinese,english]of pairs){if(!chinese||!english)continue;zh.set(chinese,chinese);zh.set(english,chinese);en.set(chinese,english);en.set(english,english)}
 zh.set('LYRICS','歌词');zh.set('Lyrics','歌词');en.set('LYRICS','Lyrics');en.set('歌词','Lyrics');en.set('新建歌单','New playlist');en.set('本机音乐','Local music');en.set('单曲循环','Repeat one');en.set('列表循环','Repeat all');
 let language='zh-CN';try{if(localStorage.getItem('echo-language')==='en')language='en'}catch{}
 const textRecords=new WeakMap(),attributeRecords=new WeakMap();
 const protectedContent='script,style,textarea,input,svg,code,pre,[translate="no"],.media-engine,.lyric-line,.lyrics-lines,.track-name>strong,.track-name>span,.sheet-track-info,.sidebar-playlist span,.collection h3,.collection-art img,.video-card strong,.video-card small,.music-message strong,.music-message span,.person-row strong,.person-row small,.person-avatar,.profile-avatar,.profile-heading h2,.profile-heading p,.chat-message>p,.chat-heading h1,.release-card h3,.release-card p,#mini-title,#mini-artist,#np-title,#np-artist';
 function translate(value){
  const text=String(value??''),match=text.match(/^(\s*)([\s\S]*?)(\s*)$/),key=match[2],map=language==='en'?en:zh;
  if(map.has(key))return match[1]+map.get(key)+match[3];
  const rules=[
   [/^(\d+) 首$/,m=>language==='en'?m[1]+' '+(m[1]==='1'?'song':'songs'):m[0]],
   [/^(\d+) songs?$/,m=>language==='en'?m[0]:m[1]+' 首'],
   [/^(\d+) 分钟$/,m=>language==='en'?m[1]+' minutes':m[0]],
   [/^(\d+) minutes$/,m=>language==='en'?m[0]:m[1]+' 分钟'],
   [/^(?:版本|Version) ([\d.]+)$/,m=>(language==='en'?'Version ':'版本 ')+m[1]],
   [/^(?:好友|Friends) · (\d+)$/,m=>(language==='en'?'Friends':'好友')+' · '+m[1]],
   [/^分类 · (.+)$/,m=>language==='en'?'Category · '+translate(m[1]):m[0]],
   [/^Category · (.+)$/,m=>language==='en'?m[0]:'分类 · '+translate(m[1])],
   [/^Play (.+)$/,m=>language==='en'?m[0]:'播放 '+m[1]],
   [/^Like (.+)$/,m=>language==='en'?m[0]:'收藏 '+m[1]],
   [/^Unlike (.+)$/,m=>language==='en'?m[0]:'取消收藏 '+m[1]],
   [/^Options for (.+)$/,m=>language==='en'?m[0]:m[1]+'的选项'],
   [/^播放 (.+)$/,m=>language==='en'?'Play '+m[1]:m[0]],
   [/^打开与 (.+) 的聊天$/,m=>language==='en'?'Open chat with '+m[1]:m[0]],
   [/^已导入歌词 · (.+)$/,m=>language==='en'?'Imported lyrics · '+m[1]:m[0]],
   [/^Imported lyrics · (.+)$/,m=>language==='en'?m[0]:'已导入歌词 · '+m[1]],
   [/^Saved to (.+)$/,m=>language==='en'?m[0]:'已保存至 '+m[1]],
   [/^YouTube 视频 (.+)$/,m=>language==='en'?'YouTube video '+m[1]:m[0]],
   [/^Move (.+) earlier$/,m=>language==='en'?m[0]:'将 '+m[1]+'上移'],
   [/^Move (.+) later$/,m=>language==='en'?m[0]:'将 '+m[1]+'下移'],
   [/^Remove (.+) from queue$/,m=>language==='en'?m[0]:'从队列移除 '+m[1]],
   [/^(.+) 专辑封面$/,m=>language==='en'?m[1]+' album artwork':m[0]],
   [/^(.+) artwork$/,m=>language==='en'?m[0]:m[1]+'封面'],
   [/^Sleep timer set for (\d+) minutes$/,m=>language==='en'?m[0]:'将在 '+m[1]+' 分钟后暂停'],
   [/^Music will pause in (\d+) minutes$/,m=>language==='en'?m[0]:'将在 '+m[1]+' 分钟后暂停'],
   [/^(\d+) available full-length tracks( · More to discover)?$/,m=>language==='en'?m[0]:m[1]+' 首可播放歌曲'+(m[2]?' · 还有更多':'')],
   [/^(\d+) songs? added(.*)$/,m=>language==='en'?m[0]:'已添加 '+m[1]+' 首歌曲'+(/could not/.test(m[2])?'，部分文件无法保存或播放。':'。')],
   [/^(.+)（YouTube (\d+)）$/,m=>translate(m[1])+(language==='en'?' (YouTube '+m[2]+')':'（YouTube '+m[2]+'）')]
  ];
  for(const [pattern,format]of rules){const found=key.match(pattern);if(found)return match[1]+format(found)+match[3]}
  return text;
 }
 function protectedNode(element){if(element.closest('.track-category'))return false;return Boolean(element.closest(protectedContent))}
 function applyText(node){if(!node.parentElement||protectedNode(node.parentElement)||!node.nodeValue.trim())return;let record=textRecords.get(node);if(!record||node.nodeValue!==record.last)record={source:node.nodeValue,last:node.nodeValue};const result=translate(record.source);record.last=result;textRecords.set(node,record);if(node.nodeValue!==result)node.nodeValue=result}
 function applyAttributes(element){if(protectedNode(element)&&!element.matches('input,textarea'))return;let records=attributeRecords.get(element);if(!records){records={};attributeRecords.set(element,records)}for(const name of ['aria-label','title','alt'])if(element.hasAttribute(name)){const value=element.getAttribute(name);let record=records[name];if(!record||value!==record.last)record={source:value,last:value};const result=translate(record.source);record.last=result;records[name]=record;if(result!==value)element.setAttribute(name,result)}}
 let observer;
 function localize(root=document.body){if(!root)return;observer?.disconnect();if(root.nodeType===3)applyText(root);else if(root.nodeType===1||root.nodeType===9){if(root.nodeType===1)applyAttributes(root);root.querySelectorAll('[aria-label],[title],[alt]').forEach(applyAttributes);const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())applyText(walker.currentNode)}observe()}
 function observe(){if(observer&&document.body)observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt']})}
 const privacyPage=document.title==='隐私说明 · Echo';
 function setLanguage(value){language=value==='en'?'en':'zh-CN';try{localStorage.setItem('echo-language',language)}catch{}document.documentElement.lang=language==='en'?'en':'zh-Hans';if(privacyPage)document.title=translate('隐私说明 · Echo');localize();const picker=document.querySelector('#language-setting');if(picker)picker.value=language;document.dispatchEvent(new CustomEvent('echo:languagechange',{detail:{language}}))}
 globalThis.EchoI18n=Object.freeze({t:translate,localize,setLanguage,get language(){return language},get locale(){return language==='en'?'en-US':'zh-CN'}});
 observer=new MutationObserver(records=>{const roots=new Set(records.map(record=>record.target));for(const root of roots)if(root.isConnected)localize(root)});
 document.documentElement.lang=language==='en'?'en':'zh-Hans';if(privacyPage)document.title=translate('隐私说明 · Echo');localize();
})();
