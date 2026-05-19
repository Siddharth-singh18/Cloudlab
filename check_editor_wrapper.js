import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/ide');
  await new Promise(r => setTimeout(r, 5000));
  
  const content = await page.evaluate(() => {
    const wrapper = document.querySelector('.flex-1.overflow-hidden');
    if (!wrapper) return 'No wrapper';
    
    // There are multiple flex-1 overflow-hidden. The first is Editor, second is Monaco wrapper
    const wrappers = Array.from(document.querySelectorAll('.flex-1.overflow-hidden'));
    return wrappers.map(w => w.className + ' Height: ' + w.clientHeight).join(' | ');
  });
  console.log('RESULT:', content);
  
  await browser.close();
})();
