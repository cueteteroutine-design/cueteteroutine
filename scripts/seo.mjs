import { readFile, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('data/store.json','utf8')).tables;
const original = await readFile('dist/index.html','utf8');
const rawOrigin = process.env.VITE_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
const origin = rawOrigin ? new URL(rawOrigin).origin : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pages = [
  {path:'/',file:'index.html',title:'CUET ETE Routine | Class Schedule & Academic Calendar',heading:'CUET ETE Routine',description:'Find CUET ETE class routines by batch, academic dates, holidays, teacher schedules and room availability.',items:data.batches.filter(b=>b.is_active).map(b=>`${b.name} — Level ${b.level}, Term ${b.term}`)},
  {path:'/teachers',file:'teachers.html',title:'CUET ETE Teacher Schedules | ETE Routine',heading:'CUET ETE Teacher Schedules',description:'Find CUET ETE teacher class schedules across active batches and download printable routines.',items:data.teachers.map(t=>`${t.full_name} (${t.short_name})`)},
  {path:'/rooms',file:'rooms.html',title:'CUET ETE Room & Lab Schedules | ETE Routine',heading:'CUET ETE Room & Lab Schedules',description:'Browse CUET ETE room and laboratory schedules, class times and batch assignments.',items:data.rooms.map(r=>[r.name,r.building].filter(Boolean).join(' — '))},
];
for (const page of pages) {
  let html = original.replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title}</title>`).replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+|robots)"[^>]*>/g,'');
  const metadata = `<meta name="description" content="${esc(page.description)}"/><meta name="robots" content="index, follow"/><meta property="og:title" content="${page.title}"/><meta property="og:description" content="${esc(page.description)}"/><meta property="og:type" content="website"/><meta name="twitter:card" content="summary"/>` + (origin ? `<link rel="canonical" href="${origin}${page.path}"/><meta property="og:url" content="${origin}${page.path}"/><meta property="og:image" content="${origin}/Cuet_logo.png"/><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'CUET ETE Routine',alternateName:'ETE Routine',url:origin+'/',description:page.description,inLanguage:'en'}).replaceAll('<','\\u003c')}</script>` : '');
  html = html.replace('</head>',metadata+'</head>');
  const fallback = `<main style="max-width:1100px;margin:40px auto;padding:24px;font-family:system-ui"><nav><a href="/">Batch routines</a> · <a href="/teachers">Teachers</a> · <a href="/rooms">Rooms</a></nav><h1>${page.heading}</h1><p>${esc(page.description)}</p><p>Electronics and Telecommunication Engineering, Chittagong University of Engineering & Technology.</p><ul>${page.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><p>Enable JavaScript for the interactive timetable and PDF downloads.</p></main>`;
  html = html.replace('<div id="root"></div>',`<div id="root">${fallback}</div>`);
  await writeFile('dist/'+page.file,html);
}
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`);
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin ? pages.map(p=>`<url><loc>${esc(origin+p.path)}</loc></url>`).join('') : ''}</urlset>`);
if (!origin) console.warn('Set VITE_SITE_URL to your production URL for canonical URLs and sitemap entries.');
