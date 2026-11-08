'use strict';
(() => {
 const categories=Object.freeze(['K-pop','J-pop','华语','欧美','电子','Hip-Hop','纯音乐','其他']);
 const artists={
  'K-pop':['bts','방탄소년단','blackpink','블랙핑크','twice','트와이스','jin','jimin','jungkook','v','rm','suga','j-hope','iu','아이유','aespa','ive','newjeans','new jeans','le sserafim','stray kids','seventeen','enhypen','txt','itzy','red velvet','exo','bigbang','g-dragon','taeyeon','nct 127','nct dream','nmixx','babymonster','illit'],
  'J-pop':['yoasobi','ado','米津玄師','藤井風','宇多田ヒカル','aimer','lisa','official髭男dism','ヨルシカ'],
  '华语':['周杰伦','周杰倫','林俊杰','林俊傑','陈奕迅','陳奕迅','孙燕姿','孫燕姿','邓紫棋','鄧紫棋','五月天','王菲','蔡依林','张学友','張學友']
 };
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().trim();
 function classify(track){if(categories.includes(track?.category))return track.category;if(track?.instrumental)return '纯音乐';if(track?.provider==='Audius'||track?.id?.startsWith('audius-')){const genre=normalize(track.genre||track.album);if(/k[- ]?pop/.test(genre))return 'K-pop';if(/j[- ]?pop/.test(genre))return 'J-pop';if(/electronic|house|techno|trance|dubstep/.test(genre))return '电子';if(/hip[- ]?hop|rap|trap/.test(genre))return 'Hip-Hop';if(genre&&genre!=='audius')return String(track.genre||track.album)}const parts=normalize(track?.artist).split(/\s*(?:\/|、| feat\. | featuring )\s*/);for(const[category,names]of Object.entries(artists))if(parts.some(part=>names.includes(part)))return category;return '未分类'}
 function artwork(value){if(typeof value!=='string')return 'assets/disc-cover.svg';if(/^assets\/(forest|mountain|bloom|night|sea|disc-cover)\.(jpg|svg)$/.test(value))return value;try{const url=new URL(value);if(url.protocol!=='https:')return 'assets/disc-cover.svg';if(/^(lh[3-6]\.googleusercontent\.com|yt3\.googleusercontent\.com|i\.ytimg\.com|yt3\.ggpht\.com|[^.]+\.audius\.co|[^.]+\.audiuscdn\.com)$/.test(url.hostname))return url.href}catch{}return 'assets/disc-cover.svg'}
 function share(track){if(!track||typeof track.title!=='string'||!track.title.trim())return null;let provider,videoId;if(/^youtube-[A-Za-z0-9_-]{11}$/.test(track.id||'')){provider='youtube';videoId=track.id.slice(8);if(track.videoId&&track.videoId!==videoId)return null}else if(/^audius-[A-Za-z0-9]+$/.test(track.id||''))provider='Audius';else if(['sanctuary','hiraeth','childhood','moonlight'].includes(track.id))provider='bundle';else return null;const result={id:track.id,title:track.title.trim().slice(0,300),artist:String(track.artist||'未知歌手').slice(0,300),album:String(track.album||'').slice(0,300),cover:artwork(track.cover),duration:Math.min(86400,Math.max(0,Number(track.duration)||0)),provider,category:classify(track)};if(videoId)result.videoId=videoId;return result}
 globalThis.EchoMusicLibrary=Object.freeze({categories,classify,artwork,share});
})();
