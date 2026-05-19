import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/ide');
  await new Promise(r => setTimeout(r, 5000));
  
  const content = await page.evaluate(() => {
    // find the monaco-editor element
    const monaco = document.querySelector('.monaco-editor');
    if (!monaco) {
      // Dump the whole editor container
      return document.querySelector('.flex-1.flex.flex-col.overflow-hidden')?.innerHTML || 'No editor container';
    }
    return 'MONACO EXISTS. Height: ' + monaco.clientHeight;
  });
  console.log('RESULT:', content);
  
  await browser.close();
})();
