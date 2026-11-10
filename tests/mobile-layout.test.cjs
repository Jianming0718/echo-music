const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,delay}=require('./ui-fixture.cjs');
function styles(f,width,reduced=false){
 const matches=query=>query.split(',').some(part=>{
  const max=/max-width:\s*([\d.]+)px/.exec(part),min=/min-width:\s*([\d.]+)px/.exec(part);
  if(max&&width>Number(max[1])||min&&width<Number(min[1]))return false;
  if(/prefers-reduced-motion:\s*reduce/.test(part)&&!reduced)return false;
  if(/hover:\s*hover/.test(part)&&width<=640)return false;
  return true;
 });
 const flatten=rules=>[...rules].map(rule=>rule.type===4?(matches(rule.conditionText)?flatten(rule.cssRules):''):rule.cssText).join('\n');
 for(const name of ['style.css','spotify-theme.css','minimal.css','refined.css','appearance.css','community.css','interaction.css','mobile-layout.css']){
  const source=f.d.createElement('style');source.textContent=fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');f.d.head.append(source);
  const css=flatten(source.sheet.cssRules);source.remove();const target=f.d.createElement('style');target.textContent=css;f.d.head.append(target);
 }
}
let passed=0;async function test(name,fn){await fn();console.log('PASS '+name);passed++}
(async()=>{
 await test('mobile breakpoints provide readable covers and titles, full-width safe-area navigation and reachable controls in both themes',async()=>{
  for(const width of [320,390,430]){
   const f=fixture({width,storage:{likes:['sanctuary']}});await f.ready();f.d.body.classList.toggle('ios',width!==320);styles(f,width);f.w.echoTest.setView('library');
   for(const theme of ['dark','light']){
    f.w.EchoAppearance.setTheme(theme);const css=node=>f.w.getComputedStyle(node),row=f.d.querySelector('[data-row=sanctuary]');
    assert.equal(css(row.querySelector('.track-art')).width,'52px');assert.equal(css(row.querySelector('img')).height,'52px');assert.equal(css(row.querySelector('.track-title strong')).fontSize,width<=360?'15px':'16px');
    assert.equal(css(row).display,'grid');assert.equal(css(f.d.querySelector('.track-header')).display,'none');assert.equal(css(row.querySelector('.track-category')).display,'none');
    assert.equal(css(f.d.querySelector('[data-row=hiraeth] [data-like]')).display,'none');assert.equal(css(row.querySelector('[data-like]')).height,'44px');assert(css(row.querySelector('.like-check')).display.includes('flex'));
    assert.equal(css(f.d.querySelector('.player .cover-button')).width,'44px');assert.equal(css(f.d.querySelector('.player .mini-info strong')).fontSize,width<=360?'13px':'14px');assert.equal(css(f.d.querySelector('.player .mobile-play')).height,'44px');
    assert.equal(css(f.d.querySelector('.bottom-nav')).borderRadius,'0px');assert.equal(css(f.d.querySelector('.bottom-nav svg')).width,'26px');assert.equal(f.d.querySelectorAll('.bottom-nav button').length,5);
   }
   assert.deepEqual(f.errors,[]);f.close();
  }
 });
 await test('row-space taps play once, pause updates the current marker, and save and menu actions preserve playback',async()=>{
  const f=fixture({width:390,storage:{likes:[]}});await f.ready();styles(f,390);f.w.echoTest.setView('library');
  let row=f.d.querySelector('[data-row=hiraeth]');row.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true}));await delay(15);
  assert.equal(f.w.echoTest.player.getSnapshot().currentId,'hiraeth');assert.equal(row.dataset.playing,'true');assert.equal(row.getAttribute('aria-current'),'true');assert(f.w.getComputedStyle(row.querySelector('.track-playing-mark')).display.includes('flex'));
  f.click('.player .mobile-play');await delay(10);assert.equal(row.dataset.playing,'false');assert(f.w.echoTest.audio.paused);
  f.click('.player .mobile-play');await delay(10);f.click('[data-options=hiraeth]');assert(f.d.querySelector('#sheet').open);assert.equal(f.w.echoTest.player.getSnapshot().currentId,'hiraeth');assert(!f.w.echoTest.audio.paused);
  f.click('[data-like-menu=hiraeth]');await delay(10);row=f.d.querySelector('[data-row=hiraeth]');assert(row.querySelector('[data-like]').classList.contains('liked'));assert.equal(row.querySelector('[data-like]').getAttribute('aria-pressed'),'true');assert(!f.w.echoTest.audio.paused);
  f.click('#mini-like');await delay(10);assert.equal(f.d.querySelector('#mini-like').getAttribute('aria-pressed'),'false');assert.equal(f.w.echoTest.player.getSnapshot().currentId,'hiraeth');assert(!f.w.echoTest.audio.paused);
  f.w.EchoI18n.setLanguage('en');await delay(5);f.w.echoTest.setView('liked');assert.equal(f.d.querySelectorAll('.bottom-nav button').length,5);assert.deepEqual(f.errors,[]);f.close();
 });
 await test('desktop keeps its original transport layout while reduced-motion and mobile keyboards retain their existing controls',async()=>{
  const desktop=fixture({width:1280});await desktop.ready();styles(desktop,1280);desktop.w.echoTest.setView('library');assert.equal(desktop.w.getComputedStyle(desktop.d.documentElement).getPropertyValue('--mobile-nav-height'),'');desktop.d.querySelector('[data-row=hiraeth]').dispatchEvent(new desktop.w.MouseEvent('click',{bubbles:true}));assert(desktop.w.echoTest.audio.paused);assert.notEqual(desktop.w.getComputedStyle(desktop.d.querySelector('.track-header')).display,'none');desktop.close();
  const f=fixture({width:390,reducedMotion:true,viewportHeight:768});await f.ready();f.d.body.classList.add('ios');styles(f,390,true);f.w.echoTest.setView('library');f.w.echoTest.playTrack('sanctuary');assert.equal(f.w.getComputedStyle(f.d.querySelector('.track-playing-mark i')).animationName,'none');
  f.w.echoTest.setView('search');f.d.querySelector('#music-search').focus();f.resizeViewport(300);await delay(35);assert.equal(f.d.documentElement.dataset.keyboard,'open');assert.equal(f.w.getComputedStyle(f.d.querySelector('.player')).visibility,'hidden');assert.equal(f.w.getComputedStyle(f.d.querySelector('.workspace')).paddingBottom,'20px');assert(!f.w.echoTest.audio.paused);assert.deepEqual(f.errors,[]);f.close();
 });
 console.log(passed+' responsive mobile layout and interaction scenarios passed.');
})().catch(error=>{console.error(error);process.exit(1)});
