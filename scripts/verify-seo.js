const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

console.log('--- VERIFICATION CHECKS ---');

// 1. Title & Meta description
const titleMatch = html.match(/<title>(.*?)<\/title>/);
console.log('Title:', titleMatch ? titleMatch[1] : 'MISSING');

const descMatch = html.match(/<meta name="description" content="(.*?)"/);
console.log('Meta Description Length:', descMatch ? descMatch[1].length : 0);
console.log('Meta Description:', descMatch ? descMatch[1] : 'MISSING');

// 2. Headings
const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].trim().replace(/\s+/g, ' '));
console.log('Count of <h1> tags:', h1s.length);
console.log('H1 content:', h1s[0]);

const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].trim().replace(/\s+/g, ' '));
console.log('Count of <h2> tags:', h2s.length);
h2s.forEach((h, i) => console.log('  H2 #' + (i+1) + ':', h.replace(/<[^>]+>/g, '').trim()));

// 3. Schema
const hasTouristAttraction = html.includes('TouristAttraction');
const hasLocalBusiness = html.includes('LocalBusiness');
const hasKadalundiBusiness = html.includes('Riverdale kayaking Kadalundi');
const hasBalathiruthi = html.includes('Balathiruthi, Kadalundi');
const hasGeo = html.includes('11.1306') && html.includes('75.8300');
const hasHours = html.includes('06:00') && html.includes('18:00');
console.log('Schema TouristAttraction & LocalBusiness:', hasTouristAttraction && hasLocalBusiness);
console.log('Schema Business Name:', hasKadalundiBusiness);
console.log('Schema Location & Geo:', hasBalathiruthi && hasGeo && hasHours);

// 4. Images
const imgs = [...html.matchAll(/<img[^>]*>/gi)];
console.log('Total <img> tags found:', imgs.length);
const lazyImgs = imgs.filter(m => m[0].includes('loading="lazy"'));
console.log('Images with loading="lazy":', lazyImgs.length);
const webpImgs = imgs.filter(m => m[0].includes('webp'));
console.log('Images with WebP format:', webpImgs.length);
