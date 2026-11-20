const state = { q: "", cat: "all", minDisc: 0, sort: "discount" };
const $ = (sel) => document.querySelector(sel);

function scoreRetailer(r) {
  const s = r.signals;
  let score = 0;
  if (s.https) score += 15;
  if (s.returns) score += 20;
  if (s.contact) score += 15;
  if (s.securePayments) score += 15;
  score += (s.reviews / 5) * 20;
  score += (Math.min(s.domainYears, 10) / 10) * 15;
  return Math.round(score);
}

function gradeFor(score) {
  if (score >= 90) return ["A", "grade-a"];
  if (score >= 75) return ["B", "grade-b"];
  if (score >= 60) return ["C", "grade-c"];
  if (score >= 45) return ["D", "grade-d"];
  return ["F", "grade-f"];
}

const retailerById = Object.fromEntries(RETAILERS.map((r) => [r.id, r]));
const discount = (d) => Math.round((1 - d.salePrice / d.originalPrice) * 100);
const money = (n) => "$" + n.toFixed(2);

function renderStats() {
  const avgDisc = Math.round(DEALS.reduce((a, d) => a + discount(d), 0) / DEALS.length);
  const aCount = RETAILERS.filter((r) => scoreRetailer(r) >= 90).length;
  const best = [...RETAILERS].sort((a, b) => scoreRetailer(b) - scoreRetailer(a))[0];
  $("#statsBar").innerHTML = [
    [DEALS.length, "deals tracked"],
    [avgDisc + "%", "average discount"],
    [RETAILERS.length, "retailers rated"],
    [aCount, "A-grade retailers"],
    [best.name, "top-rated: " + scoreRetailer(best) + "/100"]
  ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
}

function renderCategories() {
  const cats = [...new Set(DEALS.map((d) => d.category))].sort();
  $("#cat").innerHTML = `<option value="all">All categories</option>` +
    cats.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function dealCard(d) {
  const r = retailerById[d.retailerId];
  const score = scoreRetailer(r);
  const [grade, cls] = gradeFor(score);
  return `<article class="card deal-card">
    <div class="deal-top"><span class="tag">${d.category}</span><span class="disc">-${discount(d)}%</span></div>
    <h3>${d.title}</h3>
    <div class="retailer-line">${r.name} <span class="badge ${cls}" title="Safety score ${score}/100">${grade}</span></div>
    <div class="prices"><span class="sale">${money(d.salePrice)}</span><span class="orig">${money(d.originalPrice)}</span></div>
    <div class="meta">${d.coupon ? "Code <b>" + d.coupon + "</b> · " : ""}Ends ${d.ends}</div>
    <button data-title="${d.title}">View deal</button>
  </article>`;
}

function renderDeals() {
  let list = DEALS.filter((d) => {
    const text = (d.title + " " + retailerById[d.retailerId].name).toLowerCase();
    return text.includes(state.q.toLowerCase()) &&
      (state.cat === "all" || d.category === state.cat) &&
      discount(d) >= state.minDisc;
  });
  const sorters = {
    discount: (a, b) => discount(b) - discount(a),
    priceAsc: (a, b) => a.salePrice - b.salePrice,
    priceDesc: (a, b) => b.salePrice - a.salePrice,
    safety: (a, b) => scoreRetailer(retailerById[b.retailerId]) - scoreRetailer(retailerById[a.retailerId])
  };
  list.sort(sorters[state.sort]);
  $("#dealsGrid").innerHTML = list.map(dealCard).join("");
  $("#dealsEmpty").hidden = list.length > 0;
  document.querySelectorAll(".deal-card button").forEach((btn) =>
    btn.addEventListener("click", () =>
      alert("Demo: this would open the retailer's product page for:\n" + btn.dataset.title)));
}

function signalRow(ok, label) {
  return `<li class="${ok ? "" : "missing"}">${label}</li>`;
}

function retailerCard(r) {
  const score = scoreRetailer(r);
  const [grade, cls] = gradeFor(score);
  const ringCls = score >= 75 ? "" : score >= 50 ? "warn" : "bad";
  const s = r.signals;
  return `<article class="card">
    <div class="retailer-head">
      <div class="ring ${ringCls}" style="--score:${score}"><span>${score}</span></div>
      <div>
        <h3>${r.name} <span class="badge ${cls}">${grade}</span></h3>
        <div class="retailer-meta">${r.domain} · ${r.category}</div>
      </div>
    </div>
    <ul class="signals">
      ${signalRow(s.https, "Secure connection (HTTPS)")}
      ${signalRow(s.returns, "Clear return policy — " + r.returnsWindow)}
      ${signalRow(s.contact, "Real address & phone listed")}
      ${signalRow(s.securePayments, "Credit card / PayPal accepted")}
      ${signalRow(s.reviews >= 3.5, "Off-site reviews: " + s.reviews.toFixed(1) + "/5")}
      ${signalRow(s.domainYears >= 2, "Domain age: " + s.domainYears + " yr")}
    </ul>
    <div class="retailer-meta">Shipping: ${r.shipping}</div>
  </article>`;
}

function renderRetailers() {
  const sorted = [...RETAILERS].sort((a, b) => scoreRetailer(b) - scoreRetailer(a));
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
  const known = RETAILERS.find((r) => r.domain === domain || r.name.toLowerCase().replace(/\s+/g, "") === domain.replace(/\..*$/, ""));
  if (known) {
    const score = scoreRetailer(known);
    const [grade, cls] = gradeFor(score);
    out.innerHTML = `<div class="report">
      <h3>${known.name} — <span class="badge ${cls}">${grade} (${score}/100)</span></h3>
      <p class="retailer-meta">${known.domain} is in our directory. Returns: ${known.returnsWindow}. Shipping: ${known.shipping}.</p>
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
    <h3>${domain} — not in our directory</h3>
    <p><strong>Heuristic score: ${score}/100</strong> (demo checks only — not a live lookup). ${verdict}</p>
    ${flags.length ? "<ul>" + flags.map((f) => `<li>${f}</li>`).join("") + "</ul>" : ""}
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

$("#q").addEventListener("input", (e) => { state.q = e.target.value; renderDeals(); });
$("#heroSearch").addEventListener("input", (e) => { state.q = e.target.value; $("#q").value = e.target.value; renderDeals(); });
$("#heroGo").addEventListener("click", () => $("#deals").scrollIntoView({ behavior: "smooth" }));
$("#cat").addEventListener("change", (e) => { state.cat = e.target.value; renderDeals(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderDeals(); });
$("#minDisc").addEventListener("input", (e) => { state.minDisc = Number(e.target.value); $("#discVal").textContent = e.target.value + "%"; renderDeals(); });
$("#checkBtn").addEventListener("click", checkStore);
$("#domainInput").addEventListener("keydown", (e) => { if (e.key === "Enter") checkStore(); });

renderStats();
renderCategories();
renderDeals();
renderRetailers();
renderChecklist();
