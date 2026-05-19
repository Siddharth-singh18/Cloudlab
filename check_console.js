import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173/ide');
  await new Promise(r => setTimeout(r, 5000));
  
  const content = await page.evaluate(() => {
    return document.querySelector('.flex-1.overflow-hidden')?.innerHTML || 'No editor container';
  });
  console.log('DOM CONTENT DUMP:', content.substring(0, 500));
  
  await browser.close();
})();
