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
 await p.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';nA.value='4,7';nB.value='';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await p.waitForTimeout(300);await p.locator('#_paramsOk').click();await p.waitForTimeout(500);
 const obs=()=>p.evaluate(async()=>{const m=await import('/js/state.js');return JSON.parse(JSON.stringify(m.S.obs))});
 // pas de liaison pour Marcher, pas de 🔗 sur la grille
 await p.click('[aria-label="Marcher non conforme"]');
 ok(!(await p.isVisible('#detailLinkZone')),n+' Marcher : pas de zone de liaison');
 await p.evaluate(()=>closeDetail());
 ok(!(await p.textContent('#quickNotesWrap')).includes('🔗'),n+' aucun 🔗 sur la grille');
 // J7M ✘ + SPA
 await p.click('[aria-label="J7M non conforme"]');
 ok(await p.locator('#detailLinkBtns .qn-link-btn').count()===3,n+' J7M propose 3 liaisons (SPA, SPP, Zone d\'influence)');
 await p.click('#detailLinkBtns [data-link="SPA"]');
 ok(await p.locator('.qn-linked[data-cat="SPA"].qn-linked-red').count()===1,n+' carte SPA ajoutée, ✘ par défaut (option A)');
 ok((await p.textContent('#detailTitle'))==='J7M — Non conforme + SPA',n+' titre');
 await p.locator('#detailTeams .qn-tag',{hasText:'Toulouse'}).first().click();await p.locator('#detailTeams .qn-num',{hasText:'4'}).click();
 await p.click('#detailTags .qn-tag[data-tag="Fermeture tardive"]');
 await p.click('.qn-linked[data-cat="SPA"] .qn-tag[data-tag="SPA 2"]');
 await p.click('#detailTags > .qn-tag[data-tag="Contre-attaque"]');
 await p.fill('#detailNote','Retard + 2 min');
 await p.screenshot({path:`${OUT}liens_${n}_sheet.png`});
 await p.click('#detailSave_A1');await p.waitForTimeout(200);
 let o=await obs();
 ok(o.length===2&&o[0].lien&&o[0].lien===o[1].lien,n+' 2 observations reliées');
 ok(o[0].cat==='J7M'&&JSON.stringify(o[0].tags)==='["Toulouse n°4","Fermeture tardive","Contre-attaque"]',n+' tags J7M '+JSON.stringify(o[0].tags));
 ok(o[1].cat==='SPA'&&o[1].col==='red'&&JSON.stringify(o[1].tags)==='["Toulouse n°4","Contre-attaque","SPA 2"]',n+' tags SPA '+JSON.stringify(o[1].tags));
 ok(o[1].cmt==='Retard + 2 min'&&o[1].an==='Durand'&&o[1].time===o[0].time,n+' note, arbitre et temps communs');
 const row=async()=>(await p.$$eval('#OTB tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' '))));
 let r=await row();ok(r.length===1&&/J7M ✘ \+ SPA ✘/.test(r[0])&&r[0].includes('Toulouse n°4, Contre-attaque · J7M : Fermeture tardive · SPA : SPA 2 · Retard + 2 min'),n+' 1 ligne dans le tableau '+JSON.stringify(r));
 ok(await p.textContent('#qnCnt_J7M_red')==='1'&&await p.textContent('#qnCnt_SPA_red')==='1',n+' compteurs J7M et SPA');
 // Modifier : SPA passe conforme, arbitre Lopez
 await p.evaluate(()=>editObservation(0));
 ok((await p.textContent('#detailTitle')).startsWith('✎ Modifier — J7M — Non conforme + SPA'),n+' édition : action entière rouverte');
 ok(await p.locator('.qn-linked[data-cat="SPA"] .qn-tag.selected[data-tag="SPA 2"]').count()===1,n+' édition : tag SPA restauré');
 await p.click('.qn-linked[data-cat="SPA"] .edit-ctrl-green');
 ok(await p.locator('#detailEditControls .edit-ctrl-red.edit-ctrl-active').count()===1,n+' couleur J7M non touchée par le bouton SPA');
 await p.click('#detailSave_A2');await p.waitForTimeout(200);
 o=await obs();ok(o.length===2&&o[1].col==='green'&&o[0].col==='red'&&o[1].an==='Lopez'&&o[1].tags.includes('SPA 2'),n+' édition enregistrée sur les 2');
 ok((await p.getAttribute('#OTB tr','class'))==='rm'&&/J7M ✘ \+ SPA ✔/.test((await row())[0]),n+' ligne couleurs mixtes');
 // Retirer la liaison en édition
 await p.evaluate(()=>editObservation(1));await p.click('.qn-linked-x');await p.click('#detailSave_A2');await p.waitForTimeout(200);
 o=await obs();ok(o.length===1&&o[0].cat==='J7M'&&!('lien' in o[0]),n+' ✕ en édition : SPA retirée, J7M seule');
 // Annuler / rétablir une action liée
 await p.click('[aria-label="Jet Franc conforme"]');await p.click('#detailLinkBtns [data-link="Exécution du Jet"]');
 await p.click('.qn-linked[data-cat="Exécution du Jet"] .qn-tag[data-tag="Hors des 9m"]');await p.click('#detailSave_both');await p.waitForTimeout(200);
 ok((await obs()).length===3,n+' Jet Franc + Exécution du Jet enregistrés');
 await p.evaluate(()=>askUndo());ok(/Jet Franc ✔ \+ Exécution du Jet ✔/.test(await p.textContent('#undoObsSummary')),n+' annuler : résumé de l action');
 await p.evaluate(()=>doUndo());ok((await obs()).length===1,n+' annuler retire les 2');
 await p.evaluate(()=>redoObs());ok((await obs()).length===3&&(await row()).length===2,n+' rétablir remet les 2 (1 ligne)');
 // Mi-temps : ⚑ sur action liée = 1 ligne
 await p.click('[aria-label="J7M conforme"]');await p.click('#detailLinkBtns [data-link="SPP"]');await p.click('#detailFlag');await p.click('#detailSave_A1');await p.waitForTimeout(200);
 await p.evaluate(()=>{document.getElementById('AO')?.classList.remove('on');window.mtOpen();});await p.waitForTimeout(200);
 const mt=await p.textContent('#mtBody');ok(mt.includes('À revoir (1)')&&/J7M\s*✔\s*\+\s*SPP\s*✔/.test(mt),n+' mi-temps : 1 ligne pour l action ⚑');
 await p.evaluate(()=>window.mtClose());
 // Supprimer l'action liée
 const before=(await obs()).length;await p.evaluate(()=>{deleteObservation(4);});
 ok(/J7M \+ SPP/.test(await p.textContent('#confirmObsSummary')),n+' suppression : résumé de l action');
 await p.evaluate(()=>confirmDelete());ok((await obs()).length===before-2,n+' suppression retire les 2');
 // Sauvegarde locale
 const saved=await p.evaluate(()=>localStorage.getItem('arbitres_hb_current')||'');ok(saved.includes('"lien"'),n+' lien sauvegardé');
 ok(!errs.length,n+' aucune erreur JS '+errs.join(' | '));
 await ctx.close();}
await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);})();
