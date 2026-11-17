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
 await row.screenshot({path:`${OUT}f115_${n}_rev.png`});
 ok(!errs.length,n+' erreurs JS '+errs.join(' | '));console.log(n,'largeur note mi-temps',mtNote);await ctx.close();}
await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);})();
