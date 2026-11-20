// DealGuard feed fetcher — runs in GitHub Actions (Node 20+, zero dependencies).
// Pulls deal RSS feeds, normalizes into deals.json, and auto-discovers retailers
// into retailers.json (domain age via the free RDAP service). Safe to run locally:
//   node scripts/fetch-deals.mjs
import { readFile, writeFile } from "node:fs/promises";

const SOURCES = [
  { name: "Slickdeals", url: "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1" },
  { name: "RedFlagDeals", url: "https://forums.redflagdeals.com/feed/forum/9" }
];

const HEADERS = {
  "User-Agent": "DealGuard/1.0 (https://github.com/jherney/dealguard)",
  Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
};

const MAX_ITEMS_PER_SOURCE = 40;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stripCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
const stripHtml = (s) => s.replace(/<[^>]+>/g, " ");
const decodeEntities = (s) =>
  s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, e) => {
    const map = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (map[e]) return map[e];
    const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isNaN(code) ? m : String.fromCodePoint(code);
  });
const clean = (s) => decodeEntities(stripCdata(s || "")).trim();

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : "";
}

function parseItems(xml) {
  return xml.split(/<item[\s>]/).slice(1).map((c) => ({
    title: clean(tag(c, "title")),
    link: clean(tag(c, "link")),
    description: clean(tag(c, "description")),
    published: clean(tag(c, "pubDate")) || null
  })).filter((i) => i.title && i.link);
}

function extractPrices(text) {
  const amounts = [...text.matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => n > 0 && n < 100000);
  if (!amounts.length) return { salePrice: null, originalPrice: null };
  if (amounts.length === 1) return { salePrice: amounts[0], originalPrice: null };
  const sale = Math.min(...amounts);
  const orig = Math.max(...amounts);
  return { salePrice: sale, originalPrice: orig > sale ? orig : null };
}

function extractCoupon(text) {
  const m = text.match(/(?:coupon|promo)?\s*code[:\s]+["']?([A-Z0-9]{4,})["']?/i);
  return m ? m[1] : null;
}

const CATEGORY_KEYWORDS = [
  ["Gaming", /ps5|playstation|xbox|nintendo|switch|steam|gaming|\bgame\b|geforce|radeon/i],
  ["Electronics", /headphone|earbud|laptop|monitor|\btv\b|television|\bssd\b|iphone|ipad|tablet|speaker|keyboard|camera|\bphone\b|charger|power bank|projector|router|smartwatch/i],
  ["Home & Kitchen", /vacuum|kitchen|pillow|mattress|cookware|coffee|blender|air fryer|towel|bedding|\blamp\b|furniture|sofa|\bdesk\b/i],
  ["Clothing", /jacket|hoodie|\bshirt\b|\bpants\b|jeans|sneaker|\bshoes\b|boots|\bdress\b|adidas|nike/i],
  ["Outdoors", /\btent\b|\bbike\b|mower|grill|\bdrill\b|camping|fishing|kayak/i],
  ["Grocery", /grocery|snack|protein|vitamin|\bfood\b/i]
];

function guessCategory(text) {
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return "General";
}

function extractMerchantDomain(item, sourceHost) {
  const links = [...item.description.matchAll(/href=["'](https?:\/\/[^"']+)["']/g)].map((m) => m[1]);
  for (const u of links) {
    try {
      const h = new URL(u).hostname.replace(/^www\./, "");
      if (h !== sourceHost && !h.endsWith("slickdeals.net") && !h.endsWith("redflagdeals.com")) return h;
    } catch { /* skip malformed */ }
  }
  return null;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const key = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// Naive root-domain: last two labels. Fine for .com/.ca; co.uk-style domains need a PSL lookup.
const rootDomain = (h) => h.split(".").slice(-2).join(".");

async function domainAgeYears(domain) {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const reg = (data.events || []).find((e) => e.eventAction === "registration");
    if (!reg) return null;
    return (Date.now() - new Date(reg.eventDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  } catch {
    return null;
  }
}

async function loadJson(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
}

async function main() {
  const prev = await loadJson("deals.json", { deals: [] });
  const dealMap = new Map((prev.deals || []).map((d) => [d.key || key(d.title), d]));
  const retailersDoc = await loadJson("retailers.json", { retailers: [] });
  const retailerMap = new Map((retailersDoc.retailers || []).map((r) => [r.id, r]));
  const now = new Date().toISOString();

  for (const source of SOURCES) {
    let xml;
    try {
      const res = await fetch(source.url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch (e) {
      console.warn(`WARN ${source.name} fetch failed: ${e.message} — keeping previous data`);
      continue;
    }
    const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
    const items = parseItems(xml).slice(0, MAX_ITEMS_PER_SOURCE);
    for (const item of items) {
      const text = `${item.title} ${stripHtml(item.description)}`;
      const { salePrice, originalPrice } = extractPrices(text);
      const merchant = extractMerchantDomain(item, sourceHost);
      const retailerId = merchant ? slug(rootDomain(merchant)) : slug(source.name);
      const k = key(item.title);
      dealMap.set(k, {
        id: slug(item.title).slice(0, 48) || k.slice(0, 48),
        key: k,
        title: item.title,
        url: item.link,
        source: source.name,
        retailerId,
        category: guessCategory(text),
        salePrice,
        originalPrice,
        coupon: extractCoupon(text),
        ends: null,
        published: item.published,
        fetchedAt: now
      });
      if (!retailerMap.has(retailerId)) {
        retailerMap.set(retailerId, {
          id: retailerId,
          name: merchant ? rootDomain(merchant) : source.name,
          domain: merchant || sourceHost,
          category: "General",
          shipping: "See retailer",
          returnsWindow: "See retailer",
          auto: true,
          signals: {
            https: true,
            returns: null,
            contact: null,
            securePayments: null,
            reviews: null,
            domainYears: null
          }
        });
      }
    }
    console.log(`OK ${source.name}: ${items.length} items`);
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  const deals = [...dealMap.values()].filter((d) => new Date(d.fetchedAt || 0).getTime() > cutoff);

  // Enrich retailers missing a domain age via RDAP (free, no key — rate-limited politely).
  for (const r of retailerMap.values()) {
    if (r.signals.domainYears == null && r.domain && r.domain.includes(".")) {
      const yrs = await domainAgeYears(rootDomain(r.domain));
      if (yrs != null) r.signals.domainYears = Math.round(yrs * 10) / 10;
      await sleep(300);
    }
  }

  deals.sort((a, b) => new Date(b.published || b.fetchedAt) - new Date(a.published || a.fetchedAt));

  await writeFile("deals.json", JSON.stringify({ updated: now, count: deals.length, deals }, null, 2) + "\n");
  await writeFile("retailers.json", JSON.stringify({ retailers: [...retailerMap.values()] }, null, 2) + "\n");
  console.log(`Wrote ${deals.length} deals across ${retailerMap.size} retailers`);
}

main().catch((e) => { console.error(e); process.exit(1); });
