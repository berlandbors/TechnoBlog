// generateRSS.js — генерация RSS-ленты из posts/list.txt
// Использование: node main/generateRSS.js
// Создаёт файл rss.xml в корне проекта

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://berlandbors.github.io/TechnoBlog';
const POSTS_LIST = path.join(__dirname, '..', 'posts', 'list.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'rss.xml');

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatRssDate(dateStr) {
    if (!dateStr) return new Date().toUTCString();
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toUTCString();
    return d.toUTCString();
}

async function generateRSS() {
    const listContent = fs.readFileSync(POSTS_LIST, 'utf-8');
    const postFiles = listContent
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('-'));

    const items = [];
    postFiles.forEach((file, index) => {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) return;
        const text = fs.readFileSync(filePath, 'utf-8');
        const lines = text.split('\n');
        const title = lines[0].trim();
        const date = lines[1].trim();
        const rawContent = lines.slice(2).join(' ').trim();
        const description = rawContent.substring(0, 200) + (rawContent.length > 200 ? '...' : '');
        const slug = title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/-+/g, '-');

        items.push({
            title: escapeXml(title),
            link: `${BASE_URL}/?article=${index}&title=${encodeURIComponent(slug)}`,
            description: escapeXml(description),
            pubDate: formatRssDate(date)
        });
    });

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ТехноБлог</title>
    <link>${BASE_URL}</link>
    <description>Браузерные технологии, веб приложения, инструменты для жизни</description>
${items.map(item => `    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.pubDate}</pubDate>
    </item>`).join('\n')}
  </channel>
</rss>`;

    fs.writeFileSync(OUTPUT_FILE, rssXml, 'utf-8');
    console.log(`RSS-лента сгенерирована: ${OUTPUT_FILE} (${items.length} записей)`);
}

generateRSS().catch(console.error);
