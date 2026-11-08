import {parseMusicResults} from '../youtube-search/music.mjs';
export const artistIdPattern=/^UC[A-Za-z0-9_-]{22}$/;
export const releaseIdPattern=/^MPRE[A-Za-z0-9_-]{8,180}$/;
const text=value=>typeof value==='string'?value:value?.simpleText||(value?.runs||[]).map(run=>run.text||'').join('');
export const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s*[-–]\s*(?:single|ep)\s*$/i,'').replace(/[^\p{L}\p{N}]/gu,'');
export function sameArtist(a,b){const aliases=value=>{const source=String(value||'');return [source,...(source.match(/\(([^)]+)\)/g)||[]).map(part=>part.slice(1,-1)),source.replace(/\([^)]*\)/g,'')].map(normalize).filter(Boolean)};const first=aliases(a);return aliases(b).some(name=>first.includes(name))}
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const child of Object.values(node))if(Array.isArray(child))child.forEach(value=>walk(value,visit));else if(child&&typeof child==='object')walk(child,visit)}
function thumbnails(node){const found=[];walk(node,value=>{if(typeof value.url==='string'&&/^https:\/\/(?:lh[3-6]\.googleusercontent\.com|yt3\.googleusercontent\.com|i\.ytimg\.com|yt3\.ggpht\.com)\//.test(value.url))found.push(value)});return found.sort((a,b)=>(Number(b.width)||0)*(Number(b.height)||0)-(Number(a.width)||0)*(Number(a.height)||0))[0]?.url||null}
function headerOf(payload){let header;walk(payload,node=>{header??=node.musicImmersiveHeaderRenderer||node.musicVisualHeaderRenderer||node.musicDetailHeaderRenderer||node.musicResponsiveHeaderRenderer});return header||{}}
function artistRun(header){let result;walk(header,node=>{if(!result&&artistIdPattern.test(node.navigationEndpoint?.browseEndpoint?.browseId||''))result=node});return result}
function card(item,kind){const row=item.musicTwoRowItemRenderer;if(!row)return null;const id=row.navigationEndpoint?.browseEndpoint?.browseId||row.title?.runs?.find(run=>run.navigationEndpoint)?.navigationEndpoint?.browseEndpoint?.browseId;if(!releaseIdPattern.test(id||''))return null;const title=text(row.title).trim(),subtitle=text(row.subtitle),year=subtitle.match(/\b(?:19|20)\d{2}\b/)?.[0]||null;if(!title)return null;return{id,title:title.slice(0,300),kind,cover:thumbnails(row.thumbnailRenderer||row.thumbnail),releaseDate:year,datePrecision:year?'year':null,dateSource:year?'YouTube Music':null}}
export function parseArtist(payload,id){
 const header=headerOf(payload),albums=new Map(),singles=new Map();let description='';
 walk(payload,node=>{if(node.musicDescriptionShelfRenderer&&!description)description=text(node.musicDescriptionShelfRenderer.description).trim();const shelf=node.musicCarouselShelfRenderer||node.musicShelfRenderer;if(!shelf)return;const title=text(shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title||shelf.title).toLowerCase();const kind=/singles|单曲|單曲|eps/.test(title)?'single':/albums|专辑|專輯/.test(title)?'album':null;if(!kind)return;for(const item of shelf.contents||[]){const record=card(item,kind);if(record)(kind==='album'?albums:singles).set(record.id,record)}});
 return{id,name:text(header.title).trim().slice(0,300),cover:thumbnails(header.thumbnail||header.foregroundThumbnail||header.backgroundThumbnail||header),description:description||null,albums:[...albums.values()].slice(0,80),singles:[...singles.values()].slice(0,80),url:'https://music.youtube.com/channel/'+id};
}
export function parseRelease(payload,id){
 const header=headerOf(payload),title=text(header.title).trim(),artist=artistRun(header),name=text(artist)||text(header.straplineTextOne).trim(),year=(text(header.subtitle)+' '+text(header.secondSubtitle)).match(/\b(?:19|20)\d{2}\b/)?.[0]||null,cover=thumbnails(header.thumbnail||header);
 let contents;walk(payload,node=>{const shelf=node.musicShelfRenderer||node.musicPlaylistShelfRenderer;if(!contents&&shelf?.contents?.some(item=>item.musicResponsiveListItemRenderer?.playlistItemData?.videoId))contents=shelf.contents});
 const tracks=parseMusicResults({contents:contents||[]}).items.map(song=>({...song,artist:song.artistId?song.artist:name||'未知歌手',album:title,albumId:id,cover:cover||song.cover,...(!song.artistId&&artist?{artistId:artist.navigationEndpoint.browseEndpoint.browseId}:{})}));
 return{id,title:title.slice(0,300),artist:name||null,artistId:artist?.navigationEndpoint?.browseEndpoint?.browseId||null,cover,releaseDate:year,datePrecision:year?'year':null,dateSource:year?'YouTube Music':null,tracks,url:'https://music.youtube.com/browse/'+id};
}
export async function browse(id,fetcher=fetch){
 const version='1.'+new Date().toISOString().slice(0,10).replaceAll('-','')+'.01.00';
 const response=await fetcher('https://music.youtube.com/youtubei/v1/browse?alt=json',{method:'POST',headers:{'Content-Type':'application/json','X-Youtube-Client-Name':'67','X-Youtube-Client-Version':version},body:JSON.stringify({context:{client:{clientName:'WEB_REMIX',clientVersion:version,hl:'en',gl:'US'},user:{}},browseId:id}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('UPSTREAM_'+response.status);const payload=await response.json();if(payload.error||!payload.contents)throw Error('UPSTREAM_FORMAT');return payload;
}
async function apple(path,params,fetcher){const url=new URL('https://itunes.apple.com/'+path);for(const [key,value]of Object.entries(params))url.searchParams.set(key,String(value));const response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000)});if(!response.ok)return [];const data=await response.json();return Array.isArray(data.results)?data.results:[]}
export async function enrichDates(profile,{artist,title}={},fetcher=fetch){
 try{
  let artistId;
  if(title){const songs=await apple('search',{term:artist+' '+title,entity:'song',media:'music',limit:20,country:'us'},fetcher);const ids=[...new Set(songs.filter(song=>sameArtist(song.artistName,artist)&&normalize(song.trackName)===normalize(title)).map(song=>song.artistId).filter(Number.isSafeInteger))];if(ids.length===1)artistId=ids[0]}
  if(!artistId){const names=await apple('search',{term:artist,entity:'musicArtist',limit:20,country:'us'},fetcher);const ids=[...new Set(names.filter(row=>sameArtist(row.artistName,artist)).map(row=>row.artistId).filter(Number.isSafeInteger))];if(ids.length===1)artistId=ids[0]}
  if(!artistId)return profile;
  const records=await apple('lookup',{id:artistId,entity:'album',limit:200,country:'us'},fetcher);
  const enrich=release=>{const matches=records.filter(row=>row.wrapperType==='collection'&&row.artistId===artistId&&sameArtist(row.artistName,artist)&&normalize(row.collectionName)===normalize(release.title)&&/^\d{4}-\d{2}-\d{2}T/.test(row.releaseDate||''));if(!matches.length)return release;const dates=[...new Set(matches.map(row=>row.releaseDate.slice(0,10)))];if(dates.length!==1||release.releaseDate&&dates[0].slice(0,4)!==release.releaseDate.slice(0,4))return release;return{...release,releaseDate:dates[0],datePrecision:'day',dateSource:'iTunes',dateSourceUrl:matches[0].collectionViewUrl}};
  return profile.albums?{...profile,albums:profile.albums.map(enrich),singles:profile.singles.map(enrich)}:enrich(profile);
 }catch{return profile}
}
