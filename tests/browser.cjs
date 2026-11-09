const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const out = path.resolve(__dirname, '../screenshots');
fs.mkdirSync(out, {recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 try{
  for(const width of [360,390,430,768,1440]){
   await page.setViewportSize({width,height:width===1440?1000:844});
   for(const route of ['/ar/','/en/','/ar/services','/ar/packages','/ar/booking','/ar/account','/ar/loyalty','/ar/reviews']){
    await page.goto(base+route);await page.waitForTimeout(150);
    const info=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,text:document.body.innerText.length,dir:document.documentElement.dir}));
    assert.ok(info.text>100,`Empty page ${route}`);
    assert.ok(info.scroll<=info.client+1,`Horizontal overflow ${width} ${route}: ${info.scroll}`);
    assert.equal(info.dir,route.startsWith('/ar')?'rtl':'ltr');
    results.push(`${width}px ${route}: no horizontal overflow, correct direction`);
    if((width===390||width===1440)&&['/ar/','/en/','/ar/booking','/ar/account','/ar/loyalty'].includes(route))await page.screenshot({path:path.join(out,`${route.slice(1).replaceAll('/','-')||'home'}-${width}.png`),fullPage:true});
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/concepts.html');
  await page.screenshot({path:path.join(out,'concepts-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'concepts-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  fs.writeFileSync(path.resolve(__dirname,'../BROWSER-RESULTS.json'),JSON.stringify({date:new Date().toISOString(),passed:results,errors},null,2));
  console.log(`${results.length} responsive route checks passed; screenshots saved.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
