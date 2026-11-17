const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;
(async()=>{const b=await chromium.launch();
for(const [n,vp] of [['1180x820',{width:1180,height:820}],['1133x744',{width:1133,height:744}],['1024x768',{width:1024,height:768}],['820x1180',{width:820,height:1180}]]){
 const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const page=await ctx.newPage();await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
 await page.evaluate(()=>{tA.value='Toulouse HB';tB.value='Nîmes HB';a1.value='D';a2.value='L';window.startMatch();});await page.waitForTimeout(300);await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
 await page.evaluate(()=>MS.scrollIntoView());await page.waitForTimeout(200);
 const r=await page.evaluate(()=>{const lp=document.querySelector('.left-panel');return{sh:lp.scrollHeight,ch:lp.clientHeight,top:lp.getBoundingClientRect().top,bottom:lp.getBoundingClientRect().bottom,vh:innerHeight}});
 const ok=r.sh<=r.ch+1;if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n,JSON.stringify(r));
 await page.screenshot({path:OUT+'lp_'+n+'.png'});await ctx.close();}
await b.close();console.log(fails?'ECHECS':'OK');})();
