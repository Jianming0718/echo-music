function artworkCandidates(node,found=[]){if(!node||typeof node!=='object')return found;if(typeof node.url==='string')found.push(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(item=>artworkCandidates(item,found));else if(value&&typeof value==='object')artworkCandidates(value,found)}return found}
const textOf = value => value?.simpleText || (value?.runs || []).map(run => run.text || '').join('');
const videoPattern = /^[A-Za-z0-9_-]{11}$/;

export function parseMusicResults(payload) {
  const songs = new Map();
  let continuation = null;
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.nextContinuationData?.continuation) continuation ||= node.nextContinuationData.continuation;
    if (node.continuationCommand?.token) continuation ||= node.continuationCommand.token;
    const item = node.musicResponsiveListItemRenderer;
    if (item) {
      const columns = (item.flexColumns || []).map(column => column.musicResponsiveListItemFlexColumnRenderer?.text);
      const titleRuns = columns[0]?.runs || [];
      const play = item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
      const videoId = item.playlistItemData?.videoId || play?.videoId || item.navigationEndpoint?.watchEndpoint?.videoId || titleRuns.find(run => run.navigationEndpoint?.watchEndpoint)?.navigationEndpoint.watchEndpoint.videoId;
      if (videoPattern.test(videoId || '') && item.musicItemRendererDisplayPolicy !== 'MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT') {
        const title = textOf(columns[0]).trim();
        const runs = columns.slice(1).flatMap(column => column?.runs || []);
        const artistRuns = runs.filter(run => /^(UC|MPLA)/.test(run.navigationEndpoint?.browseEndpoint?.browseId || ''));
        const parts = runs.map(run => run.text?.trim()).filter(part => part && !/^[·•&、,]$/.test(part));
        const artist = artistRuns.map(run => run.text).join(' / ') || parts.find(part => !/^\d[\d:.,\s]*$/.test(part) && !/^(song|video|歌曲|影片|视频)$/i.test(part)) || 'YouTube Music';
        const durationText = [...runs, ...(item.fixedColumns || []).flatMap(column => column.musicResponsiveListItemFixedColumnRenderer?.text?.runs || [])].map(run => run.text?.trim()).find(value => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value || ''));
        const duration = durationText ? durationText.split(':').reduce((total, part) => total * 60 + Number(part), 0) : 0;
        const thumbnails = artworkCandidates(item.thumbnail||item.thumbnails).sort((a,b)=>(Number(b.width)||0)*(Number(b.height)||0)-(Number(a.width)||0)*(Number(a.height)||0));
        const cover = thumbnails.find(image=>/^https:\/\/(lh[3-6]\.googleusercontent\.com|yt3\.googleusercontent\.com|i\.ytimg\.com|yt3\.ggpht\.com)\//.test(image.url))?.url;
        const albumRun = runs.find(run=>/^MPRE/.test(run.navigationEndpoint?.browseEndpoint?.browseId||''));
        const album = albumRun?.text;
        const albumId = albumRun?.navigationEndpoint?.browseEndpoint?.browseId;
        const artists = [...new Map(artistRuns.filter(run=>/^UC[A-Za-z0-9_-]{22}$/.test(run.navigationEndpoint?.browseEndpoint?.browseId||'')).map(run=>[run.navigationEndpoint.browseEndpoint.browseId,{id:run.navigationEndpoint.browseEndpoint.browseId,name:run.text}])).values()];
        if (title) songs.set(videoId, { videoId, title: title.slice(0, 300), artist: artist.slice(0, 300), duration, ...(artists.length?{artistId:artists[0].id,artists}:{}), ...(/^MPRE[A-Za-z0-9_-]{8,180}$/.test(albumId||'')?{albumId}:{}), ...(album?{album:album.slice(0,300)}:{}), cover: /^https:\/\/(lh[3-6]\.googleusercontent\.com|yt3\.googleusercontent\.com|i\.ytimg\.com|yt3\.ggpht\.com)\//.test(cover || '') ? cover : undefined });
      }
      return;
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(payload);
  return { items: [...songs.values()].slice(0, 40), continuation };
}

export async function searchMusic({ q, filter = 'songs', continuation }, fetcher = fetch) {
  const version = '1.' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '.01.00';
  const body = { context: { client: { clientName: 'WEB_REMIX', clientVersion: version, hl: 'en', gl: 'US' }, user: {} } };
  if (continuation) body.continuation = continuation;
  else Object.assign(body, { query: q, params: filter === 'videos' ? 'EgWKAQIQAWoMEA4QChADEAQQCRAF' : 'EgWKAQIIAWoMEA4QChADEAQQCRAF' });
  const response = await fetcher('https://music.youtube.com/youtubei/v1/search?alt=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Youtube-Client-Name': '67', 'X-Youtube-Client-Version': version },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('UPSTREAM_' + response.status);
  const result = await response.json();
  if (result.error) throw new Error('UPSTREAM_RESPONSE');
  if (!result.contents && !result.continuationContents && !result.onResponseReceivedActions && !result.onResponseReceivedCommands) throw new Error('UPSTREAM_FORMAT');
  return parseMusicResults(result);
}
