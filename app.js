const state = { q: "", cat: "all", minDisc: 0, sort: "discount" };
const $ = (sel) => document.querySelector(sel);

let deals = window.SAMPLE_DEALS || [];
let retailers = window.SAMPLE_RETAILERS || [];
let retailerById = Object.fromEntries(retailers.map((r) => [r.id, r]));
let dataSource = "sample";
let lastUpdated = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function loadLiveData() {
  try {
    const [dRes, rRes] = await Promise.all([
      fetch("deals.json", { cache: "no-store" }),
      fetch("retailers.json", { cache: "no-store" })
    ]);
    if (!dRes.ok || !rRes.ok) throw new Error("live data not generated yet");
    const dJson = await dRes.json();
    const rJson = await rRes.json();
    if (Array.isArray(dJson.deals) && dJson.deals.length) {
      deals = dJson.deals;
      if (Array.isArray(rJson.retailers) && rJson.retailers.length) retailers = rJson.retailers;
      dataSource = "live";
      lastUpdated = dJson.updated || null;
      retailerById = Object.fromEntries(retailers.map((r) => [r.id, r]));
    }
  } catch (e) {
    console.info("DealGuard: using built-in sample data (" + e.message + ")");
  }
}

// Scores only the signals we actually know; unknowns are excluded and flagged.
function scoreRetailer(r) {
  const s = r.signals || {};
  const weighted = [
    [s.https, 15],
    [s.returns, 20],
    [s.contact, 15],
    [s.securePayments, 15],
    [s.reviews == null ? null : s.reviews / 5, 20],
    [s.domainYears == null ? null : Math.min(s.domainYears, 10) / 10, 15]
  ];
  let got = 0, max = 0, partial = false;
  for (const [v, w] of weighted) {
    if (v == null) { partial = true; continue; }
    max += w;
    got += (v === true ? 1 : v === false ? 0 : v) * w;
  }
  return { score: max ? Math.round((got / max) * 100) : 0, partial };
}

function gradeFor(score) {
  if (score >= 90) return ["A", "grade-a"];
  if (score >= 75) return ["B", "grade-b"];
  if (score >= 60) return ["C", "grade-c"];
  if (score >= 45) return ["D", "grade-d"];
  return ["F", "grade-f"];
}

const discount = (d) =>
  d.originalPrice && d.salePrice ? Math.round((1 - d.salePrice / d.originalPrice) * 100) : null;
const money = (n) => (n == null ? "" : "$" + n.toFixed(2));

function renderStats() {
  const discs = deals.map(discount).filter((x) => x != null);
  const avgDisc = discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : 0;
  const aCount = retailers.filter((r) => scoreRetailer(r).score >= 90).length;
  const tiles = [
    [deals.length, "deals tracked"],
    [avgDisc + "%", "average discount"],
    [retailers.length, "retailers rated"],
    [aCount, "A-grade retailers"],
    [dataSource === "live" ? "Live feeds" : "Sample data",
      lastUpdated ? "updated " + new Date(lastUpdated).toLocaleString() : "data source"]
  ];
  $("#statsBar").innerHTML = tiles
    .map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
}

function renderCategories() {
  const cats = [...new Set(deals.map((d) => d.category))].sort();
  $("#cat").innerHTML = `<option value="all">All categories</option>` +
    cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function dealCard(d) {
  const r = retailerById[d.retailerId] || { name: d.source || "Unknown store", signals: {} };
  const { score, partial } = scoreRetailer(r);
  const [grade, cls] = gradeFor(score);
  const disc = discount(d);
  const action = d.url
    ? `<a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">View deal ↗</a>`
    : `<button data-title="${esc(d.title)}">View deal</button>`;
  const meta = [
    d.coupon ? `Code <b>${esc(d.coupon)}</b>` : null,
    d.ends ? "Ends " + esc(d.ends) : null,
    d.source && d.source !== "Sample" ? "via " + esc(d.source) : null
  ].filter(Boolean).join(" · ");
  return `<article class="card deal-card">
    <div class="deal-top"><span class="tag">${esc(d.category)}</span>${disc != null ? `<span class="disc">-${disc}%</span>` : ""}</div>
    <h3>${esc(d.title)}</h3>
    <div class="retailer-line">${esc(r.name)} <span class="badge ${cls}" title="Safety score ${score}/100${partial ? " (partial — some signals unverified)" : ""}">${partial ? "~" : ""}${grade}</span></div>
    <div class="prices"><span class="sale">${money(d.salePrice) || "See price"}</span>${d.originalPrice ? `<span class="orig">${money(d.originalPrice)}</span>` : ""}</div>
    <div class="meta">${meta}</div>
    ${action}
  </article>`;
}

function renderDeals() {
  let list = deals.filter((d) => {
    const r = retailerById[d.retailerId] || { name: d.source || "" };
    const text = (d.title + " " + r.name).toLowerCase();
    const disc = discount(d);
    return text.includes(state.q.toLowerCase()) &&
      (state.cat === "all" || d.category === state.cat) &&
      (disc == null ? state.minDisc === 0 : disc >= state.minDisc);
  });
  const sorters = {
    discount: (a, b) => (discount(b) ?? -1) - (discount(a) ?? -1),
    priceAsc: (a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity),
    priceDesc: (a, b) => (b.salePrice ?? -1) - (a.salePrice ?? -1),
    safety: (a, b) => scoreRetailer(retailerById[b.retailerId] || {}).score - scoreRetailer(retailerById[a.retailerId] || {}).score
  };
  list.sort(sorters[state.sort]);
  $("#dealsGrid").innerHTML = list.map(dealCard).join("");
  $("#dealsEmpty").hidden = list.length > 0;
  document.querySelectorAll(".deal-card button").forEach((btn) =>
    btn.addEventListener("click", () =>
      alert("Demo: this would open the retailer's product page for:\n" + btn.dataset.title)));
}

function signalRow(v, label) {
  if (v == null) return `<li class="unknown">${label} — unverified</li>`;
  return `<li class="${v ? "" : "missing"}">${label}</li>`;
}

function retailerCard(r) {
  const { score, partial } = scoreRetailer(r);
  const [grade, cls] = gradeFor(score);
  const ringCls = score >= 75 ? "" : score >= 50 ? "warn" : "bad";
  const s = r.signals || {};
  return `<article class="card">
    <div class="retailer-head">
      <div class="ring ${ringCls}" style="--score:${score}"><span>${score}</span></div>
      <div>
        <h3>${esc(r.name)} <span class="badge ${cls}" title="${partial ? "Partial score — some signals unverified" : "Fully scored"}">${partial ? "~" : ""}${grade}</span></h3>
        <div class="retailer-meta">${esc(r.domain || "")} · ${esc(r.category || "General")}${r.auto ? " · auto-discovered" : ""}</div>
      </div>
    </div>
    <ul class="signals">
      ${signalRow(s.https, "Secure connection (HTTPS)")}
      ${signalRow(s.returns, "Clear return policy" + (s.returns ? " — " + esc(r.returnsWindow || "") : ""))}
      ${signalRow(s.contact, "Real address & phone listed")}
      ${signalRow(s.securePayments, "Credit card / PayPal accepted")}
      ${signalRow(s.reviews == null ? null : s.reviews >= 3.5, "Off-site reviews" + (s.reviews == null ? "" : ": " + s.reviews.toFixed(1) + "/5"))}
      ${signalRow(s.domainYears == null ? null : s.domainYears >= 2, "Domain age" + (s.domainYears == null ? "" : ": " + s.domainYears + " yr"))}
    </ul>
    <div class="retailer-meta">Shipping: ${esc(r.shipping || "See retailer")}</div>
  </article>`;
}

function renderRetailers() {
  const sorted = [...retailers].sort((a, b) => scoreRetailer(b).score - scoreRetailer(a).score);
  $("#retailersGrid").innerHTML = sorted.map(retailerCard).join("");
}

function normalizeDomain(input) {
  return input.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function checkStore() {
  const domain = normalizeDomain($("#domainInput").value);
  const out = $("#checkResult");
  if (!domain) { out.innerHTML = ""; return; }
  const known = retailers.find((r) => r.domain === domain || r.name.toLowerCase().replace(/\s+/g, "") === domain.replace(/\..*$/, ""));
  if (known) {
    const { score, partial } = scoreRetailer(known);
    const [grade, cls] = gradeFor(score);
    out.innerHTML = `<div class="report">
      <h3>${esc(known.name)} — <span class="badge ${cls}">${partial ? "~" : ""}${grade} (${score}/100)</span></h3>
      <p class="retailer-meta">${esc(known.domain)} is in our directory.${partial ? " Score is partial — some trust signals are unverified." : ""}</p>
      <p>${score >= 75 ? "✅ Safe to shop — standard precautions still apply." : score >= 50 ? "⚠️ Proceed with caution — review the missing trust signals below." : "🚫 High risk — we recommend shopping elsewhere."}</p>
    </div>`;
    $("#retailers").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const flags = [];
  const riskyTlds = [".top", ".xyz", ".buzz", ".click", ".shop", ".live"];
  if (riskyTlds.some((t) => domain.endsWith(t))) flags.push("Uses a TLD frequently seen in scam stores (" + domain.slice(domain.lastIndexOf(".")) + ")");
  if ((domain.match(/-/g) || []).length > 1) flags.push("Multiple hyphens — often used to imitate real brands");
  if (/\d{3,}/.test(domain)) flags.push("Long number strings in the domain");
  if (/(official|secure|verify|login|outlet|clearance)/.test(domain)) flags.push("Contains words like 'official', 'outlet' or 'clearance' — common in lookalike stores");
  if (domain.length > 25) flags.push("Unusually long domain name");
  const score = Math.max(5, 70 - flags.length * 12);
  const verdict = flags.length === 0
    ? "No obvious red flags, but unknown stores still warrant a manual check below."
    : flags.length + " heuristic red flag(s) found — verify carefully before buying.";
  out.innerHTML = `<div class="report">
    <h3>${esc(domain)} — not in our directory</h3>
    <p><strong>Heuristic score: ${score}/100</strong> (demo checks only — not a live lookup). ${verdict}</p>
    ${flags.length ? "<ul>" + flags.map((f) => `<li>${esc(f)}</li>`).join("") + "</ul>" : ""}
    <p class="retailer-meta">For production, call the Google Safe Browsing API and a reputation source (e.g. Scamadviser, Trustpilot) here.</p>
  </div>`;
}

const CHECKLIST = [
  [20, "Site loads over HTTPS (padlock in address bar)"],
  [15, "Lists a real physical address and phone number"],
  [15, "Return/refund policy is easy to find and reasonable"],
  [15, "Accepts credit cards or PayPal — not gift cards, crypto, or wire transfer"],
  [10, "Domain is older than one year (check a WHOIS lookup)"],
  [10, "Has reviews on independent sites, not just its own"],
  [10, "Prices are plausible — not 80–90% off everything"],
  [5,  "No broken English, fake countdown timers, or pressure pop-ups"]
];

function renderChecklist() {
  $("#checklist").innerHTML = CHECKLIST.map((c, i) =>
    `<label><input type="checkbox" data-w="${c[0]}" data-i="${i}" /> ${c[1]}</label>`).join("");
  $("#checklist").addEventListener("change", updateVerdict);
}

function updateVerdict() {
  const score = [...document.querySelectorAll('#checklist input:checked')]
    .reduce((a, el) => a + Number(el.dataset.w), 0);
  const text = score >= 85 ? `${score}/100 — Looks trustworthy. Standard caution still applies.`
    : score >= 60 ? `${score}/100 — Mixed signals. Dig deeper before entering payment details.`
    : score >= 35 ? `${score}/100 — Risky. Missing key trust signals.`
    : `${score}/100 — Likely unsafe. Shop elsewhere.`;
  $("#verdictText").textContent = text;
}

function bindEvents() {
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderDeals(); });
  $("#heroSearch").addEventListener("input", (e) => { state.q = e.target.value; $("#q").value = e.target.value; renderDeals(); });
  $("#heroGo").addEventListener("click", () => $("#deals").scrollIntoView({ behavior: "smooth" }));
  $("#cat").addEventListener("change", (e) => { state.cat = e.target.value; renderDeals(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderDeals(); });
  $("#minDisc").addEventListener("input", (e) => { state.minDisc = Number(e.target.value); $("#discVal").textContent = e.target.value + "%"; renderDeals(); });
  $("#checkBtn").addEventListener("click", checkStore);
  $("#domainInput").addEventListener("keydown", (e) => { if (e.key === "Enter") checkStore(); });
}

function renderAll() {
  renderStats();
  renderCategories();
  renderDeals();
  renderRetailers();
}

(async function init() {
  await loadLiveData();
  renderAll();
  renderChecklist();
  bindEvents();
})();
