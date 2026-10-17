// Crawlable SEO for the single-page app: when Express serves the built site it injects
// per-page <title>, meta description, Open Graph tags, canonical URL and JSON-LD into
// index.html, and it serves sitemap.xml / robots.txt for each store.
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const trim = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n - 1).trim()}…` : String(s || ''));

export const siteOrigin = (req) => `${req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;

const absolute = (origin, url) => (!url ? '' : /^https?:\/\//.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`);

/** Works out the meta tags for a storefront URL. Returns null for pages that keep the defaults. */
export async function pageMeta(req) {
  const store = req.store;
  const origin = siteOrigin(req);
  const path = req.path;
  const base = { siteName: store.name, url: `${origin}${req.originalUrl.split('#')[0]}` };

  const productMatch = path.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch) {
    const p = await Product.findOne({ store: store._id, slug: decodeURIComponent(productMatch[1]), isActive: true }).populate('category', 'name slug').lean();
    if (!p) return { ...base, title: `Product not found · ${store.name}`, robots: 'noindex' };
    const image = absolute(origin, p.images?.[0]);
    const url = `${origin}/product/${p.slug}`;
    return {
      ...base,
      url,
      title: `${p.name} · ${store.name}`,
      description: trim(`${p.description} ${p.brand ? `By ${p.brand}.` : ''} ₱${p.price.toLocaleString('en-PH')} — ${p.stock > 0 ? 'in stock' : 'sold out'}.`, 160),
      image,
      type: 'product',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: p.description,
          image: (p.images || []).map((i) => absolute(origin, i)),
          sku: p.variants?.[0]?.sku || String(p._id),
          brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
          category: p.category?.name,
          ...(p.numReviews > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.numReviews } } : {}),
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'PHP',
            price: p.price,
            availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: store.name },
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Shop', item: `${origin}/shop` },
            p.category && { '@type': 'ListItem', position: 2, name: p.category.name, item: `${origin}/shop?category=${p.category.slug}` },
            { '@type': 'ListItem', position: p.category ? 3 : 2, name: p.name, item: url },
          ].filter(Boolean),
        },
      ],
    };
  }

  if (path === '/shop' || path === '/shop/') {
    const slug = String(req.query.category || '');
    const cat = slug ? await Category.findOne({ store: store._id, slug }).lean() : null;
    const q = String(req.query.q || '').slice(0, 60);
    return {
      ...base,
      url: `${origin}/shop${cat ? `?category=${cat.slug}` : ''}`,
      title: q ? `Results for “${q}” · ${store.name}` : cat ? `${cat.name} · ${store.name}` : `Shop all products · ${store.name}`,
      description: trim(cat?.description ? `${cat.name}: ${cat.description}. Shop ${cat.name.toLowerCase()} at ${store.name} with fast delivery across the Philippines.` : `Browse every product at ${store.name}. Filter by category, brand, price and more.`, 160),
      robots: q ? 'noindex,follow' : undefined,
    };
  }

  if (path === '/' || path === '') {
    return {
      ...base,
      url: `${origin}/`,
      title: `${store.name} — ${store.branding?.tagline || 'Online store'}`,
      description: trim(store.branding?.heroText || `${store.branding?.tagline || ''} Shop electronics, fashion, home, beauty and sports with Cash on Delivery, GCash or bank transfer.`, 160),
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'Organization', name: store.name, url: `${origin}/` },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: store.name, url: `${origin}/`, potentialAction: { '@type': 'SearchAction', target: `${origin}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
      ],
    };
  }
  if (path === '/sell') return { ...base, title: 'Start your online store · Shopwise', description: 'Open a store on Shopwise in minutes: catalogue, checkout with COD, GCash, bank and PayPal, PDF invoices and an AI shopping assistant.' };
  if (path === '/support') return { ...base, title: `Help & support · ${store.name}`, description: `Shipping, returns, payments and order tracking at ${store.name}.` };
  if (/^\/(admin|platform|account|checkout|orders|cart|login|register)/.test(path)) return { ...base, title: store.name, robots: 'noindex' };
  return null;
}

/** Puts the meta for a page into the index.html template. */
export function injectMeta(html, meta) {
  if (!meta) return html;
  const tags = [
    meta.description && `<meta name="description" content="${esc(meta.description)}" />`,
    meta.robots && `<meta name="robots" content="${esc(meta.robots)}" />`,
    meta.url && `<link rel="canonical" href="${esc(meta.url)}" />`,
    `<meta property="og:site_name" content="${esc(meta.siteName)}" />`,
    `<meta property="og:type" content="${esc(meta.type || 'website')}" />`,
    meta.title && `<meta property="og:title" content="${esc(meta.title)}" />`,
    meta.description && `<meta property="og:description" content="${esc(meta.description)}" />`,
    meta.url && `<meta property="og:url" content="${esc(meta.url)}" />`,
    meta.image && `<meta property="og:image" content="${esc(meta.image)}" />`,
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    ...(meta.jsonLd || []).map(jsonLd),
  ].filter(Boolean);
  let out = html.replace(/<meta name="description"[^>]*>\s*/i, '');
  if (meta.title) out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(meta.title)}</title>`);
  return out.replace('</head>', `    <!-- seo -->\n    ${tags.join('\n    ')}\n  </head>`);
}

export async function sitemapXml(req) {
  const origin = siteOrigin(req);
  const store = req.store;
  const [products, cats] = await Promise.all([
    Product.find({ store: store._id, isActive: true }).select('slug updatedAt').lean(),
    Category.find({ store: store._id }).select('slug updatedAt').lean(),
  ]);
  const urls = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/shop`, priority: '0.9', changefreq: 'daily' },
    ...cats.map((c) => ({ loc: `${origin}/shop?category=${c.slug}`, lastmod: c.updatedAt, priority: '0.8', changefreq: 'weekly' })),
    ...products.map((p) => ({ loc: `${origin}/product/${p.slug}`, lastmod: p.updatedAt, priority: '0.7', changefreq: 'weekly' })),
    { loc: `${origin}/support`, priority: '0.4', changefreq: 'monthly' },
    ...(store.isDefault ? [{ loc: `${origin}/sell`, priority: '0.6', changefreq: 'monthly' }] : []),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
}

export const robotsTxt = (req) =>
  `User-agent: *\nDisallow: /admin\nDisallow: /platform\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /orders\nAllow: /\n\nSitemap: ${siteOrigin(req)}/sitemap.xml\n`;
