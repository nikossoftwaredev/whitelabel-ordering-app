import { existsSync,readFileSync } from 'fs';
import { dirname,resolve } from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mdPath = resolve(__dirname, 'offer-figata.md');
const pdfPath = resolve(__dirname, 'offer-figata.pdf');
const mdContent = readFileSync(mdPath, 'utf8');

// Embed image as base64 data URI, or return empty string if missing
function imageToDataUri(relativePath) {
  const absPath = resolve(__dirname, relativePath);
  if (!existsSync(absPath)) return null;
  const ext = relativePath.split('.').pop().toLowerCase();
  let mime = 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
  const data = readFileSync(absPath).toString('base64');
  return `data:${mime};base64,${data}`;
}

// Basic markdown → HTML converter for this document's structure
function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeLines = [];
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (!tableRows.length) return '';
    let t = '<table>';
    tableRows.forEach((row, i) => {
      const cells = row.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (i === 0) {
        t += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
      } else if (i === 1 && cells.every(c => /^[-:]+$/.test(c))) {
        // separator row, skip
      } else {
        t += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
      }
    });
    t += '</tbody></table>';
    tableRows = [];
    inTable = false;
    return t;
  }

  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
        const dataUri = imageToDataUri(src);
        if (!dataUri) return `<div class="mockup-missing">📷 ${alt || src}</div>`;
        const imgClass = alt.toLowerCase().includes('customer') ? 'mockup-img mockup-img-mobile' : 'mockup-img';
        return `<img src="${dataUri}" alt="${alt}" class="${imgClass}"/>`;
      });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '<pre><code>' + codeLines.join('\n') + '</code></pre>\n';
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inTable) { html += flushTable(); }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) { codeLines.push(line); continue; }

    // Table detection
    if (line.includes('|')) {
      if (inTable) {
        tableRows.push(line);
        continue;
      } else {
        inTable = true;
        tableRows.push(line);
        continue;
      }
    } else if (inTable) {
      html += flushTable();
    }

    if (line.startsWith('# ')) { html += `<h1>${inline(line.slice(2))}</h1>\n`; }
    else if (line.startsWith('## ')) { html += `<h2>${inline(line.slice(3))}</h2>\n`; }
    else if (line.startsWith('### ')) { html += `<h3>${inline(line.slice(4))}</h3>\n`; }
    else if (line.startsWith('- ') || line.startsWith('* ')) { html += `<li>${inline(line.slice(2))}</li>\n`; }
    else if (line.startsWith('> ')) { html += `<blockquote>${inline(line.slice(2))}</blockquote>\n`; }
    else if (line.trim() === '---') { html += '<hr/>\n'; }
    else if (line.trim() === '') { html += '<br/>\n'; }
    else { html += `<p>${inline(line)}</p>\n`; }
  }

  if (inTable) html += flushTable();

  return html;
}

const bodyHtml = mdToHtml(mdContent);

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px 50px;
    max-width: 900px;
    margin: 0 auto;
  }
  h1 {
    font-size: 26pt;
    font-weight: 800;
    color: #2d6a4f;
    margin-bottom: 4px;
    margin-top: 12px;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #2d6a4f;
    margin-top: 22px;
    margin-bottom: 8px;
    border-bottom: 2px solid #d8f3dc;
    padding-bottom: 4px;
  }
  h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1b4332;
    margin-top: 16px;
    margin-bottom: 6px;
  }
  p { margin: 6px 0; }
  li {
    margin-left: 20px;
    margin-bottom: 3px;
    list-style-type: disc;
  }
  hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 18px 0;
  }
  pre {
    background: #f4f4f4;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 8.5pt;
    font-family: 'Courier New', monospace;
    overflow: hidden;
    margin: 12px 0;
    white-space: pre;
  }
  code {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    background: #f0f0f0;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre code { background: none; padding: 0; font-size: 8.5pt; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10pt;
  }
  th {
    background: #2d6a4f;
    color: white;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 6px 10px;
    border-bottom: 1px solid #e8e8e8;
  }
  tr:nth-child(even) td { background: #f9fafb; }
  blockquote {
    background: #f0faf4;
    border-left: 4px solid #2d6a4f;
    padding: 10px 16px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    font-style: italic;
    color: #444;
  }
  .mockup-img {
    width: 100%;
    max-width: 480px;
    display: block;
    margin: 12px auto;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .mockup-img-mobile {
    max-width: 240px;
  }
  .mockup-missing {
    background: #f5f5f5;
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 30px;
    text-align: center;
    color: #888;
    font-size: 10pt;
    margin: 12px 0;
  }
  strong { font-weight: 700; }
  em { font-style: italic; }
  br { display: block; margin: 2px 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });

await page.pdf({
  path: pdfPath,
  format: 'A4',
  margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
  printBackground: true,
});

await browser.close();
console.log('PDF saved to', pdfPath);
