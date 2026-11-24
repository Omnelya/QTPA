const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
for(const [n,vp] of [['ipad',{width:1180,height:820}],['iph',{width:430,height:932}]]){
 const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:n==='iph'?2:1,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
 await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(800);
 await p.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await p.waitForTimeout(300);await p.locator('#_paramsOk').click();await p.waitForTimeout(500);
 // action liée avec note, comme sur la capture
 await p.click('[aria-label="Jet Franc non conforme"]');await p.click('#detailLinkBtns [data-link="Exécution du Jet"]');
 for(const t of ['Engagement','Hors des 9m','Ballon non maîtrisé'])await p.click(`.qn-linked .qn-tag[data-tag="${t}"]`);
 await p.fill('#detailNote','Remise en jeu trop rapide');await p.click('#detailSave_A1');await p.waitForTimeout(200);
 // mi-temps : bouton Fermer
 await p.evaluate(()=>{document.getElementById('AO')?.classList.remove('on');window.mtOpen();});await p.waitForTimeout(250);
 const st=await p.$eval('.mt-close',x=>{const c=getComputedStyle(x);return {cls:x.className,r:c.borderRadius,fw:c.fontWeight,h:Math.round(x.getBoundingClientRect().height)}});
 const ref=await p.$eval('#ES .btn-act:not(.prim)',x=>{const c=getComputedStyle(x);return {r:c.borderRadius,fw:c.fontWeight}});
 ok(st.cls.includes('btn-act')&&st.r===ref.r&&st.fw===ref.fw&&st.h>=(n==='iph'?44:30),n+' Fermer = style des boutons de l\'app '+JSON.stringify(st));
 const sh=await p.locator('#mtOverlay .qn-detail-header').boundingBox();
 await p.screenshot({path:`${OUT}f115_${n}_mt.png`,clip:{x:sh.x,y:sh.y,width:sh.width,height:sh.height+10}});
 const mtNote=await p.$$eval('#mtBody .db-row .db-note',x=>x.map(y=>Math.round(y.getBoundingClientRect().width)));
 await p.evaluate(()=>window.mtClose());
 // fin de match : « À revoir et notes »
 await p.evaluate(()=>window.endMatch());await p.waitForTimeout(500);
 const row=p.locator('#ES .db-row').filter({hasText:'Exécution du Jet'}).first();await row.scrollIntoViewIfNeeded();
 const w=await row.evaluate(r=>({row:Math.round(r.getBoundingClientRect().width),note:Math.round(r.querySelector('.db-note').getBoundingClientRect().width),h:Math.round(r.getBoundingClientRect().height),txt:r.querySelector('.db-note').textContent}));
 ok(w.note>w.row*0.4&&w.h<(n==='iph'?160:90),n+' note sur toute la largeur '+JSON.stringify(w));
 /* v1.18.5 : frise — un repère par action liée (Jet Franc + Exécution du Jet = 1), compteurs par catégorie */
 const fr=await p.evaluate(()=>({mk:[...document.querySelectorAll('#db-frise .db-mk')].map(m=>m.className+'|'+m.getAttribute('aria-label')),lab:document.querySelector('#db-frise .db-tl-lab span').textContent}));
 ok(fr.mk.length===1&&fr.mk[0].includes('db-mk-n')&&fr.mk[0].includes('Jet Franc + Exécution du Jet')&&fr.lab==='2 ✘ / 0 ✔',n+' frise : 1 repère pour l\'action liée '+JSON.stringify(fr));
 await p.evaluate(async()=>{const {S}=await import('/js/state.js');const mk=(cat,col)=>({time:'12:00',el:720,period:'MT1',arb:['A2'],an:'Lopez',cat,cats:[cat],col,flag:false,todo:false,tags:[],cmt:'',lien:'Lmix'});S.obs.push(mk('J7M','red'),mk('SPA','green'));window.dbFilter('frise','arb','all');});
 const mix=await p.$$eval('#db-frise .db-mk',m=>m.map(x=>x.className+'|'+x.textContent));
 ok(mix.length===2&&mix.some(x=>x.includes('db-mk-m')&&x.endsWith('✘✔')),n+' frise : action ✘ + ✔ = 1 repère mi-rouge mi-vert '+JSON.stringify(mix));
 /* v1.18.6 : une icône par catégorie (2 ✘ → « ✘✘ », 3 catégories → 3 icônes), un ⚑ par catégorie à revoir */
 ok(mix.some(x=>x.includes('db-mk-n')&&x.endsWith('|✘✘')),n+' frise : Jet Franc ✘ + Exécution du Jet ✘ → « ✘✘ »');
 await p.evaluate(async()=>{const {S}=await import('/js/state.js');const mk=(cat,col,el,lien,flag)=>({time:'x',el,period:'MT1',arb:['A1'],an:'Durand',cat,cats:[cat],col,flag,todo:false,tags:[],cmt:'',lien});
   S.obs.push(mk('Exécution du Jet','red',1200,'L3',false),mk('SPA','red',1200,'L3',false),mk('Gestion du sifflet','green',1200,'L3',false),mk('J7M','red',1500,'Lf',true),mk('SPA','red',1500,'Lf',true));window.dbFilter('frise','arb','all');});
 const m3=await p.$$eval('#db-frise .db-mk',m=>m.map(x=>({c:x.className,t:x.textContent,w:Math.round(x.getBoundingClientRect().width),bg:x.style.background})));
 const t3=m3.find(x=>x.t==='✘✘✔'),f2=m3.find(x=>x.t==='⚑⚑');
 ok(m3.length===4&&t3&&t3.c.includes('db-mk-m')&&t3.w>=48&&/33%.+67%/.test(t3.bg),n+' frise : 3 catégories → « ✘✘✔ » sur 3 bandes '+JSON.stringify(t3));
 /* v1.19.1 : dans le repère mixte, ✘ et ✔ ont les couleurs des repères simples */
 const col=await p.evaluate(()=>{const c=s=>getComputedStyle(document.querySelector(s)).color;return {n:c('#db-frise .db-mk-m .mk-n'),o:c('#db-frise .db-mk-m .mk-o'),refN:c('#db-frise .db-mk-n'),bx:c('#db-frise .db-mk-m')};});
 const refO=await p.evaluate(()=>{const b=document.createElement('button');b.className='db-mk db-mk-o';document.getElementById('db-frise').appendChild(b);const v=getComputedStyle(b).color;b.remove();return v;});
 ok(col.n===col.refN&&col.o===refO&&col.n!==col.bx&&col.o!==col.bx,n+' frise : ✘ rouge et ✔ vert dans le repère mixte '+JSON.stringify(Object.assign(col,{refO})));
 ok(f2&&f2.c.includes('db-mk-fl')&&!f2.bg,n+' frise : 2 catégories à revoir → « ⚑⚑ » '+JSON.stringify(f2));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),n+' frise : pas de débordement');
 await p.locator('#db-frise .db-mk-m',{hasText:/^✘✔$/}).click();
 ok(/J7M\s*✘\s*\+\s*SPA\s*✔/.test(await p.textContent('#db-frise .db-bubble')),n+' frise : la bulle montre l\'action entière');
 await p.locator('#db-frise').screenshot({path:`${OUT}frise_liee_${n}.png`});
 await row.screenshot({path:`${OUT}f115_${n}_rev.png`});
 ok(!errs.length,n+' erreurs JS '+errs.join(' | '));console.log(n,'largeur note mi-temps',mtNote);await ctx.close();}
await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);})();
