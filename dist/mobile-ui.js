'use strict';
(() => {
 const root=document.documentElement,viewport=window.visualViewport;
 let pending=false;
 function update(){pending=false;const height=viewport?.height||innerHeight;root.style.setProperty('--visual-height',Math.round(height)+'px');const editing=document.activeElement?.matches('input:not([type=range]):not([type=checkbox]),textarea,select');root.dataset.keyboard=innerWidth<=640&&editing&&innerHeight-height>120?'open':'closed'}
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
 document.addEventListener('click',event=>{if(innerWidth>640||event.defaultPrevented||event.target.closest('button,a,input,textarea,select,[role=button]')||window.getSelection()?.toString())return;const row=event.target.closest('.track-row[data-row]');row?.querySelector('[data-play]:not(:disabled)')?.click()});
 viewport?.addEventListener('resize',schedule,{passive:true});viewport?.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);update();
})();
