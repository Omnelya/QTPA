/* Test v1.14.2 : doublons Supabase — fausse base en mémoire (aucun accès à la vraie base) */
const { chromium } = require('playwright');
const STUB = `(()=>{const DB=window.__DB=[];let n=0;
const col=(r,c)=>c.includes('->>')?((r[c.split('->>')[0]]||{})[c.split('->>')[1]]):r[c];
function qb(t){const s={t,op:null,f:[],p:null,one:false};const q={
 select(){if(!s.op)s.op='select';return q},insert(p){s.op='insert';s.p=p;return q},delete(){s.op='delete';return q},update(p){s.op='update';s.p=p;return q},upsert(){s.op='upsert';return q},
 eq(c,v){s.f.push(r=>col(r,c)==v);return q},neq(c,v){s.f.push(r=>col(r,c)!=v);return q},order(){return q},limit(){return q},in(){return q},
 single(){s.one=true;return q},
 then(res,rej){try{res(run())}catch(e){rej(e)}}};
 function run(){ if(t!=='matches')return {data:s.one?{role:'user'}:[],error:null};
  const m=r=>s.f.every(f=>f(r));
  if(s.op==='insert'){const r=Object.assign({id:'r'+(++n),created_at:new Date().toISOString()},JSON.parse(JSON.stringify(s.p)));DB.push(r);return {data:s.one?{id:r.id}:[{id:r.id}],error:null};}
  if(s.op==='delete'){for(let i=DB.length-1;i>=0;i--)if(m(DB[i]))DB.splice(i,1);return {data:null,error:null};}
  const rows=DB.filter(m).map(r=>JSON.parse(JSON.stringify(r)));return {data:s.one?rows[0]||null:rows,error:null};}
 return q;}
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'u1',email:'t@t.fr'},access_token:'x'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{user_metadata:{}}}}),signOut:async()=>({})},from:t=>qb(t),functions:{invoke:async()=>({data:{},error:null})}})};})();`;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:820},locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:STUB}):r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
 await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(1000);
 const db=()=>p.evaluate(()=>window.__DB.map(r=>({id:r.id,n:(r.observations||[]).length,uid:(r.etat||{}).uid,eq:r.equipe_a})));
 const newMatch=async(obs)=>{await p.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});await p.waitForTimeout(300);
   await p.locator('#_paramsOk').click();await p.waitForTimeout(300);
   for(let i=0;i<obs;i++){await p.click('[aria-label="Marcher non conforme"]');await p.click('#detailSave_A1');await p.waitForTimeout(80);}
   await p.evaluate(()=>{document.getElementById('AO')?.classList.remove('on');window.endMatch();});await p.waitForTimeout(300);};
 // A : 1er enregistrement
 await newMatch(1);await p.evaluate(()=>window.goHomeFromEnd());await p.waitForTimeout(400);
 let d=await db();ok(d.length===1&&d[0].uid&&d[0].n===1,'A : 1 ligne avec identifiant permanent '+JSON.stringify(d));const U=d[0].uid;
 // B : autre appareil avec identifiant de ligne périmé (cas du 15/11)
 await p.evaluate(id=>window.App.openMatchFromHome(id,false),d[0].id);await p.waitForTimeout(400);
 await p.evaluate(()=>window.goHomeFromEnd());await p.waitForTimeout(400);
 d=await db();ok(d.length===1&&d[0].uid===U,'B1 : réenregistrement normal = 1 ligne');
 await p.evaluate(id=>window.App.openMatchFromHome(id,false),d[0].id);await p.waitForTimeout(400);
 await p.evaluate(async()=>{const {S}=await import('/js/state.js');S.remoteId='r-perime';});
 await p.evaluate(()=>window.goHomeFromEnd());await p.waitForTimeout(400);
 d=await db();ok(d.length===1&&d[0].uid===U,'B2 : identifiant de ligne périmé → toujours 1 seule ligne (avant : doublon) '+JSON.stringify(d));
 // C : double appui sur le retour accueil
 await newMatch(2);await p.evaluate(()=>{window.goHomeFromEnd();window.goHomeFromEnd();});await p.waitForTimeout(800);
 d=await db();ok(d.length===2&&d.every(r=>r.n>0),'C : double appui → 1 seule nouvelle ligne, aucune ligne vide '+JSON.stringify(d));
 ok(d[1].uid&&d[1].uid!==U,'C : nouveau match = nouvel identifiant (l\'ancien match n\'est pas touché)');
 // D : match vide
 await newMatch(0);await p.evaluate(()=>window.goHomeFromEnd());await p.waitForTimeout(400);
 d=await db();ok(d.length===2,'D : match vide non enregistré');
 // E : ancienne ligne sans identifiant permanent (matchs existants)
 await p.evaluate(()=>window.__DB.push({id:'legacy1',created_at:'2026-11-01',equipe_a:'Albi',equipe_b:'Rodez',arbitre1:'X',arbitre2:'Y',observations:[{time:'01:00',el:60,period:'MT1',arb:['A1'],an:'X',cat:'SPA',cats:['SPA'],col:'red',tags:[],cmt:''}],evaluation:{},etat:{nbMT:2,period:'MT2'}}));
 await p.evaluate(()=>window.App.openMatchFromHome('legacy1',false));await p.waitForTimeout(400);
 await p.evaluate(()=>window.goHomeFromEnd());await p.waitForTimeout(400);
 d=await db();ok(d.length===3&&!d.some(r=>r.id==='legacy1')&&d.find(r=>r.eq==='Albi').uid,'E : ancien match réenregistré = remplacé, reçoit un identifiant '+JSON.stringify(d));
 ok(!errs.length,'aucune erreur JS '+errs.join(' | '));
 await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);})();
