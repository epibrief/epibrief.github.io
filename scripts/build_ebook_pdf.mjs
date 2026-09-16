// ebook/*.html → ebook/*.pdf  (헤드리스 크롬으로 인쇄)
// 실행:  npx playwright install chromium && node scripts/build_ebook_pdf.mjs [파일명.html ...]
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve('ebook');
const args = process.argv.slice(2);
const files = (args.length ? args : readdirSync(dir).filter(f => f.endsWith('.html')))
  .map(f => resolve(dir, basename(f)));

const browser = await chromium.launch();
for (const html of files) {
  const pdf = html.replace(/\.html$/, '.pdf');
  const page = await browser.newPage();
  await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.close();
  console.log(basename(pdf), Math.round(statSync(pdf).size / 1024) + 'KB');
}
await browser.close();
