/* Aide commune aux tests de bout en bout (Playwright).
   - SUPA_STUB : faux client Supabase « connecté » (aucun accès à la vraie base).
   - OUT : dossier des captures d'écran (ignoré par git).
   L'app est servie sur http://localhost:8123 par run.js. */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

const SUPA_STUB = `window.supabase={createClient:()=>{const ch={select:()=>ch,eq:()=>ch,neq:()=>ch,in:()=>ch,filter:()=>ch,order:()=>ch,limit:()=>ch,insert:()=>ch,upsert:()=>ch,update:()=>ch,delete:()=>ch,single:async()=>({data:{role:'user'},error:null}),then:(r)=>r({data:[],error:null})};
return {auth:{getSession:async()=>({data:{session:{user:{id:'u1',email:'t@t.fr'},access_token:'x'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{user_metadata:{}}}}),signOut:async()=>({})},from:()=>ch,functions:{invoke:async()=>({data:{},error:null})}};}};`;

module.exports = { SUPA_STUB, OUT, BASE: 'http://localhost:8123/' };
