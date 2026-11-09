"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const h = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const ico = (name, cls = "") => `<i data-lucide="${name}" class="${cls}"></i>`;
const icons = () => {
  window.lucide?.createIcons();
  window.refreshDropdowns?.();
};
const money = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
const norm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
let idCounter = 0;
const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "el-" + Date.now().toString(36) + "-" + (++idCounter).toString(36);
const BANNER_PRESETS = window.BANNER_TEMPLATE_PRESETS;
const FORMATS = BANNER_PRESETS.formats;
const bannerPresets = (brand = S.brand) => window.resolveBannerPresets(brand);
const boardFormat = (b) =>
  bannerPresets(b?.brand || S.brand).formats[b?.format || "vertical"] ||
  FORMATS.vertical;
const S = {
  brand: "superkoch",
  workspace: "site",
  format: "vertical",
  view: "import",
  report: null,
  catalogSource: null,
  priceSource: null,
  preloadedCatalog: null,
  preloadedPrices: null,
  sourceLoading: { catalog: false, prices: false },
  sourceErrors: { catalog: "", prices: "" },
  sourcesDirty: true,
  selected: new Set(),
  cluster: "",
  query: "",
  page: 1,
  pageSize: 20,
  boards: [],
  active: 0,
  tab: "design",
  designSections: {
    product: false,
    offer: true,
    selection: true,
    style: false,
    images: true,
    actions: false,
  },
  selectedNode: null,
  selectedNodes: [],
  alignReference: "selection",
  zoom: 0,
  boardQuery: "",
  title: "Campanha",
  modal: null,
  imageCache: new Map(),
  assetMap: {},
  history: new Map(),
  future: new Map(),
  exportSelected: new Set(),
  exportFormat: "png",
  exportQuality: 0.95,
  exporting: false,
  guides: false,
};
let stage = null,
  stageVersion = 0,
  imageUploadCallback = null,
  toastTimer = null;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4000);
}
function parsePrice(v) {
  return OfferData.parsePrice(v);
}
const imageSrc = (url) =>
  S.assetMap[url] ||
  (!url
    ? "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="60"><rect width="50" height="60" rx="6" fill="#eef2e8"/><path d="M15 21h20v20H15z" stroke="#b0c29a" fill="none"/><circle cx="22" cy="28" r="3" fill="#b0c29a"/></svg>',
      )
    : /^(data:|blob:|\/)/.test(url)
      ? url
      : "/api/image?url=" + encodeURIComponent(url));
function thumb(url, cls = "product-thumb") {
  return `<img class="${cls}" src="${h(imageSrc(url))}" loading="lazy" alt="" onerror="this.onerror=null;this.src='/assets/image-missing.svg'">`;
}
function brandProfile(id = S.brand) {
  return window.OFFER_BRANDS[id] || window.OFFER_BRANDS.superkoch;
}
function supportsPaid() {
  return brandProfile().workspaces.includes("paid");
}
function brandStylePresets() {
  return brandProfile().styles || window.OFFER_STYLE_PRESETS || [];
}
function brandSwitcher(cls = "") {
  return `<div class="brand-switcher ${cls}"><span class="brand-switch-label">Bandeira</span><div class="brand-switch" role="radiogroup" aria-label="Bandeira">${Object.entries(
    window.OFFER_BRANDS,
  )
    .map(
      ([id, b]) =>
        `<button role="radio" aria-checked="${S.brand === id}" data-action="switch-brand" data-brand="${id}" ${Object.values(S.sourceLoading).some(Boolean) || S.exporting ? "disabled" : ""}>${h(b.label)}</button>`,
    )
    .join(
      "",
    )}</div><div class="brand-logo-panel"><img src="${brandProfile().logo}" alt="${h(brandProfile().label)}" width="180" height="62"></div></div>`;
}
const brandSessionKeys = [
  "workspace",
  "format",
  "view",
  "report",
  "catalogSource",
  "priceSource",
  "sourceErrors",
  "sourcesDirty",
  "selected",
  "cluster",
  "query",
  "page",
  "boards",
  "active",
  "tab",
  "designSections",
  "selectedNode",
  "selectedNodes",
  "alignReference",
  "zoom",
  "boardQuery",
  "title",
  "history",
  "future",
  "exportSelected",
  "exportFormat",
  "exportQuality",
  "guides",
];
const brandSessionDefaults = Object.fromEntries(
    brandSessionKeys.map((key) => [key, structuredClone(S[key])]),
  ),
  brandSessions = new Map();
function switchBrand(id) {
  if (!window.OFFER_BRANDS[id] || S.brand === id) return;
  if (S.exporting || Object.values(S.sourceLoading).some(Boolean))
    return toast("Aguarde a operação atual antes de trocar de bandeira.");
  updatePreview();
  closeModal();
  brandSessions.set(
    S.brand,
    Object.fromEntries(brandSessionKeys.map((key) => [key, S[key]])),
  );
  Object.assign(
    S,
    brandSessions.get(id) || structuredClone(brandSessionDefaults),
  );
  S.brand = id;
  if (!supportsPaid()) S.workspace = "site";
  animateBrandSwitch();
  render();
}
let brandAnimationTimer;
function animateBrandSwitch() {
  const root = document.documentElement;
  if (!root?.classList) return;
  clearTimeout(brandAnimationTimer);
  root.classList.remove("brand-changing");
  void root.offsetWidth;
  root.classList.add("brand-changing");
  brandAnimationTimer = setTimeout(
    () => root.classList.remove("brand-changing"),
    750,
  );
}
function logo() {
  return `<div class="logo"><img src="${brandProfile().icon}" alt=""><span>oferta<span style="font-weight:450">studio</span><span style="color:var(--brand-primary)">.</span></span></div>`;
}
function shell(content) {
  return `<aside class="sidebar">${logo()}${brandSwitcher()}<div class="nav-label">WORKSPACE</div><nav><button class="nav-item ${S.workspace === "site" ? "active" : ""}" data-action="workspace-site">${ico("panels-top-left")}<span>Banners Site</span><b class="nav-dot"></b></button>${supportsPaid() ? `<button class="nav-item ${S.workspace === "paid" ? "active" : ""}" data-action="workspace-paid">${ico("layout-grid")}<span>Mídia Paga</span></button>` : ""}<button class="nav-item" data-action="help">${ico("circle-help")}<span>Como funciona</span></button></nav><div class="sidebar-spacer"></div><div class="session-note">${ico("sparkles")}<b>Seu fluxo, mais leve.</b>Uma planilha. Vários produtos.<br>Cada oferta no seu lugar.</div></aside><main class="shell-main"><header class="topbar"><div class="breadcrumb">${ico("house")}<span>Meu espaço</span>${ico("chevron-right")}<b>${S.workspace === "paid" ? "Mídia Paga" : "Banners Site"}</b></div>${brandSwitcher("brand-mobile")}<span class="mobile-label">${logo()}</span></header><div class="page">${S.workspace === "paid" ? "" : stepper()}${content}</div></main>`;
}
function stepper() {
  const names = ["Planilha", "Formato", "Produtos", "Editor"],
    idx = { import: 0, formats: 1, products: 2, editor: 3 }[S.view];
  return `<div class="stepper">${names.map((n, i) => `${i ? '<div class="step-line"></div>' : ""}<button class="step ${i === idx ? "current" : i < idx ? "done" : ""}" data-action="step" data-index="${i}" ${i > idx ? "disabled" : ""}><span class="num">${i < idx ? ico("check") : String(i + 1).padStart(2, "0")}</span>${n}</button>`).join("")}</div>`;
}
function sourceCard(kind) {
  const catalog = kind === "catalog",
    source = catalog ? S.catalogSource : S.priceSource,
    preloaded = catalog ? S.preloadedCatalog : S.preloadedPrices,
    loading = S.sourceLoading[kind],
    error = S.sourceErrors[kind];
  const title = catalog ? "Informações dos produtos" : "Preços e mecânicas";
  const mapping = catalog
    ? [
        ["H", "SKU"],
        ["I", "Produto"],
        ["T", "Imagem"],
      ]
    : [
        ["I", "SKU"],
        ["H", "Tipo"],
        ["K", "Varejo"],
        ["N", "Clube"],
        ["T", "Pague"],
        ["U", "Leve"],
        ["Z", "Capa"],
      ];
  return `<section class="source-card"><div class="card-title"><span>${catalog ? "01" : "02"} · ${title}</span>${source ? ico("circle-check", "check-circle") : ico("file-spreadsheet")}</div><div class="source-dropzone ${loading ? "busy" : ""}" data-source="${kind}">${ico(catalog ? "package-search" : "badge-dollar-sign")}<strong>${source ? h(source.filename) : "Arraste a planilha aqui"}</strong><p>${source ? `${Number(source.rowCount).toLocaleString("pt-BR")} linhas · ${catalog ? source.skuCount + " SKUs disponíveis" : source.offers.length + " registros de preço"}` : "Excel ou CSV · até 25 MB"}</p><button class="btn small" data-action="upload-source" data-source="${kind}" ${loading ? "disabled" : ""}>${loading ? '<span class="spinner"></span>' : ico("folder-open")}${source ? "Trocar planilha" : "Selecionar " + (catalog ? "informações" : "preços")}</button></div><div class="source-mappings">${mapping.map(([col, label]) => `<span><b>${col}</b>${label}</span>`).join("")}</div>${preloaded ? `<button class="source-previous" data-action="use-source" data-source="${kind}" ${loading ? "disabled" : ""}>${ico("file-check-2")}${catalog ? "Usar informações anteriores" : "Usar preços enviados"}</button>` : ""}${source?.imageVariants ? `<p class="hint">${source.imageVariants} SKUs têm várias imagens: usamos a primeira, e as demais ficam disponíveis para troca.</p>` : ""}${source?.ambiguous?.length ? `<p class="source-error">${source.ambiguous.length} ${source.ambiguous.length === 1 ? "SKU tem nome conflitante" : "SKUs têm nomes conflitantes"} e precisam de correção.</p>` : ""}${error ? `<p class="source-error" role="alert">${h(error)}</p>` : ""}</section>`;
}
function importView() {
  const isReady = Boolean(S.catalogSource && S.priceSource);
  const isLoading = Object.values(S.sourceLoading || {}).some(Boolean);
  const canContinue = isReady && !isLoading;

  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">DOIS ARQUIVOS. UM FLUXO DE OFERTAS.</div>
        <h1>Conecte produtos<br>e preços pelo SKU.</h1>
        <p>
          Nome e imagem vêm da planilha de informações.<br>
          Preço, mecânica e capa vêm da planilha de preços.
        </p>
      </div>
      <span class="pill heading-tag">
        ${ico("git-merge")}Cruzamento automático por SKU
      </span>
    </div>

    <div class="sources-grid">
      ${sourceCard("catalog")}
      ${sourceCard("prices")}
    </div>

    <div class="import-next">
      <div>
        <strong>
          ${isReady ? "As duas fontes estão prontas." : "Carregue as duas planilhas para continuar."}
        </strong>
        <p>O preço antigo da planilha de informações será ignorado.</p>
      </div>
      <div>
        <label class="btn">
          Abrir projeto salvo
          <input 
            type="file" 
            id="project-file" 
            accept=".zip,.json,application/zip,application/json" 
            hidden
          >
        </label>

        <button 
          class="btn primary" 
          data-action="use-report" 
          ${canContinue ? "" : "disabled"}
        >
          Cruzar planilhas e continuar ${ico("arrow-right")}
        </button>
      </div>

    </div>

    ${S.report ? importSummary() : ""}

    <div class="rules-grid">
      ${renderOfferRules()}
    </div>

    <p class="hint">
      Os produtos são agrupados pela capa/cluster da coluna Z. Um SKU pode ter ofertas diferentes em capas diferentes.
    </p>
  `;
}

// Subcomponente para organizar os cards informativos de regras
function renderOfferRules() {
  const rules = [
    { icon: "tag", title: "Normal", desc: "Preço varejo da coluna K." },
    { icon: "badge-check", title: "Club Koch", desc: "Preço fidelidade da coluna N + selo Clube K." },
    { icon: "package-plus", title: "Leve / Pague", desc: "LEVE U · PAGUE T, selo e texto legal." },
    { icon: "package-plus", title: "Pague e Leve", desc: "LEVE U · PAGUE T e texto legal, sem selo." }
  ];

  return rules.map(rule => `
    <div>
      ${ico(rule.icon)}
      <strong>${rule.title}</strong>
      <p>${rule.desc}</p>
    </div>
  `).join("");
}
function importSummary() {
  const r = S.report;
  if (!r || S.sourcesDirty) return "";
  const reasons = new Map();
  r.issues.forEach((i) =>
    reasons.set(i.reason, (reasons.get(i.reason) || 0) + 1),
  );
  const samples = [
    ...new Map(r.issues.map((i) => [i.sku + "|" + i.reason, i])).values(),
  ].slice(0, 40);
  return `<section class="import-summary"><strong>${r.products.length} ofertas disponíveis · ${r.skuCount} SKUs · ${r.clusters.length} capas</strong><p>${r.duplicates.toLocaleString("pt-BR")} repetições idênticas agrupadas entre unidades.</p>${r.missingImages ? `<p class="source-error">${r.missingImages} ofertas sem imagem no catálogo. Você poderá enviar ou substituir a imagem no editor.</p>` : ""}${r.issues.length ? `<details><summary>${r.issues.length.toLocaleString("pt-BR")} linhas com pendências — não serão diagramadas</summary><ul>${[...reasons].map(([reason, count]) => `<li>${h(reason)}: <b>${count.toLocaleString("pt-BR")}</b></li>`).join("")}</ul><p>Exemplos de SKUs para conferir:</p><div class="import-issues">${samples.map((i) => `<div><b>${h(i.sku || "Sem SKU")}</b><span>${h(i.reason)}</span></div>`).join("")}</div><p class="hint">Exibindo até 40 combinações de SKU e motivo. Corrija a fonte e importe novamente.</p></details>` : '<p class="success-note">Todos os registros puderam ser cruzados.</p>'}</section>`;
}
function formatsView() {
  return `<div class="page-heading"><div><div class="eyebrow">UM BOM COMEÇO PARA CADA OFERTA</div><h1>Escolha o seu formato.</h1><p>Três layouts prontos para personalizar.</p></div><button class="btn ghost small" data-action="nav-import">${ico("arrow-left")}Voltar</button></div><div class="format-layout format-grid">${Object.values(
    bannerPresets().formats,
  )
    .map(
      (f) =>
        `<article class="format-card ${S.format === f.id ? "is-selected" : ""}" data-action="choose-format" data-format="${f.id}"><div class="format-image"><img src="${f.preview}" alt="Layout ${f.name}"></div><h3>${f.name}</h3><p>${f.width} × ${f.height} px</p><button class="btn primary" data-action="choose-format" data-format="${f.id}">Usar este formato ${ico("arrow-right")}</button></article>`,
    )
    .join("")}</div>${importSummary()}`;
}
function offerLabel(p, offer) {
  if (offer) {
    if (offer.model === "percentage")
      return (offer.upTo ? "Com até " : "") + offer.percentage + "% OFF";
    if (offer.model === "takePay")
      return `LEVE ${offer.takeQty} PAGUE ${offer.payQty}`;
    return money(offer.price);
  }
  if (p.offerKind === 'percentage') {
  return `${p.percentage ?? 0}% OFF`;
  }
  return p.offerKind === "takePay"
    ? `LEVE ${p.takeQty} PAGUE ${p.payQty}`
    : money(p.price);
}
function offerTypeLabel(p) {
  return p.offerKind === "takePay"
    ? p.showClub === false
      ? "Pague e Leve"
      : "MercaPromo Pague e Leve"
    : p.offerKind === "club"
      ? "Club Koch"
      : "Normal";
}
function filteredProducts() {
  return (S.report?.products || []).filter(
    (p) =>
      (!S.cluster || p.cluster === S.cluster) &&
      (!S.query ||
        norm(
          p.name + " " + p.sku + " " + p.category + " " + p.offerType,
        ).includes(norm(S.query))),
  );
}
function productsView() {
  return `<div class="page-heading"><div><div class="eyebrow">ESCOLHA O QUE VAI GANHAR DESTAQUE</div><h1>Suas próximas ofertas.</h1><p>Filtre por capa e selecione um produto por criativo.</p></div><button class="btn ghost small" data-action="open-formats">${ico("arrow-left")}Formato</button></div><div class="table-toolbar"><label class="search">${ico("search")}<input id="product-query" placeholder="Buscar por nome ou SKU" value="${h(S.query)}" aria-label="Buscar produtos por nome ou SKU"></label><select id="cluster-filter" class="select cluster-filter" aria-label="Filtrar por capa ou cluster"><option value="">Todas as capas</option>${S.report.clusters.map((x) => `<option value="${h(x)}" ${x === S.cluster ? "selected" : ""}>${h(x)}</option>`).join("")}</select><span class="table-stats" id="table-stats"></span></div><div class="products-table"><div class="product-header"><input type="checkbox" id="select-page" aria-label="Selecionar página"><span>Produto</span><span class="sku-col">SKU</span><span>Oferta</span></div><div id="product-rows"></div><div class="pagination" id="pagination"></div></div><div class="selection-bar" id="selection-bar"></div>${importSummary()}`;
}
function updateProducts() {
  const all = filteredProducts(),
    pages = Math.max(1, Math.ceil(all.length / S.pageSize));
  S.page = Math.min(S.page, pages);
  const rows = all.slice((S.page - 1) * S.pageSize, S.page * S.pageSize);
  $("#table-stats").textContent = all.length + " ofertas nesta capa";
  $("#product-rows").innerHTML = rows.length
    ? rows
        .map(
          (p) =>
            `<div class="product-row ${S.selected.has(p.id) ? "selected" : ""}" data-action="toggle-product" data-id="${p.id}" role="checkbox" tabindex="0" aria-checked="${S.selected.has(p.id)}" aria-label="Selecionar ${h(p.name)}, ${offerLabel(p)}"><input type="checkbox" ${S.selected.has(p.id) ? "checked" : ""} tabindex="-1" aria-hidden="true"><div class="product-info">${thumb(p.image)}<div><strong>${h(p.name)}</strong><small>${h(p.cluster) + " · " + h(offerTypeLabel(p))} · SKU ${h(p.sku)}</small></div></div><span class="sku">${h(p.sku)}</span><span class="price">${offerLabel(p)}</span></div>`,
        )
        .join("")
    : `<div class="empty">${ico("search")}<br>Nenhum produto encontrado.<br>Tente outro nome ou SKU.</div>`;
  $("#pagination").innerHTML =
    `<span>${all.length ? (S.page - 1) * S.pageSize + 1 + "–" + Math.min(S.page * S.pageSize, all.length) : "0"} de ${all.length} ofertas</span><div style="display:flex;align-items:center;gap:8px"><button class="icon-btn" data-action="page-prev" ${S.page <= 1 ? "disabled" : ""} aria-label="Página anterior">${ico("chevron-left")}</button><span>${S.page} / ${pages}</span><button class="icon-btn" data-action="page-next" ${S.page >= pages ? "disabled" : ""} aria-label="Próxima página">${ico("chevron-right")}</button></div>`;
  $("#select-page").checked =
    rows.length > 0 && rows.every((p) => S.selected.has(p.id));
  $("#select-page").indeterminate =
    rows.some((p) => S.selected.has(p.id)) &&
    !rows.every((p) => S.selected.has(p.id));
  updateSelectionBar();
  icons();
}
function updateSelectionBar() {
  const n = S.selected.size;
  $("#selection-bar").innerHTML =
    `<div><strong>${n} ${n === 1 ? "produto selecionado" : "produtos selecionados"}</strong><small>${n ? "Um criativo para cada oferta." : "Marque os produtos que você quer diagramar."}</small></div><div style="display:flex;gap:10px">${n ? '<button class="btn ghost small" style="color:var(--ui-bacaad)" data-action="clear-selection">Limpar</button>' : ""}<button class="btn primary" data-action="start-editor" ${!n ? "disabled" : ""}>Diagramar ${n || ""} ${n === 1 ? "criativo" : "criativos"}${ico("arrow-right")}</button></div>`;
}
function defaultTheme(format = "vertical") {
  const theme = {
    stylePreset: "encarte",
    backgroundMode: "template",
    backgroundImage: "",
    backgroundFit: "cover",
    background:
      window.OFFER_STYLE_PRESETS?.find((p) => p.id === "encarte")?.background ||
      "#0753dc",
    backgroundEnd:
      window.OFFER_STYLE_PRESETS?.find((p) => p.id === "encarte")
        ?.backgroundEnd || "#073381",
    gradient: true,
    priceColor: "#ff0800",
    ctaColor: format === "panoramic" ? "#ffce00" : "#ff0800",
    ctaTextColor: format === "panoramic" ? "#ff0800" : "#ffffff",
    textColor: "#ffffff",
  };
  const creative = brandProfile().creative;
  if (creative) {
    const { priceShape, fontFamily, ...colors } = creative;
    Object.assign(theme, colors);
  }
  return theme;
}
function baseNodes(p) {
  return [
    {
      id: uid(),
      type: "text",
      label: "Nome do produto",
      role: "name",
      text: p.name,
      ...bannerPresets().layouts.vertical.name,
      fontFamily: "Cocogoose Pro",
      fontStyle: "bold",
      fill: "#ffffff",
      align: "center",
      lineHeight: 1.02,
      shadowColor: "#142e69",
      shadowBlur: 3,
      shadowOffsetY: 4,
      rotation: 0,
      opacity: 1,
    },
    {
      id: uid(),
      type: "rect",
      role: "priceBand",
      label: "Faixa de preço",
      ...bannerPresets().layouts.vertical.priceBand,
      fill: "#ff0800",
      cornerRadius: 105,
      rotation: 0,
      opacity: 1,
    },
    {
      id: uid(),
      type: "price",
      role: "price",
      label: "Preço da oferta",
      value: p.price,
      ...bannerPresets().layouts.vertical.price,
      fill: "#ffffff",
      rotation: 0,
      opacity: 1,
    },
    {
      id: uid(),
      type: "image",
      role: "productImage",
      label: "Imagem 1",
      src: p.image,
      ...bannerPresets().productImages.vertical.byCount[1][0],
      rotation: 0,
      opacity: 1,
      flipX: false,
    },
    {
      id: uid(),
      type: "rect",
      role: "ctaBand",
      label: "Fundo do botão",
      ...bannerPresets().layouts.vertical.ctaBand,
      fill: "#ff0800",
      cornerRadius: 50,
      rotation: 0,
      opacity: 1,
    },
    {
      id: uid(),
      type: "text",
      role: "cta",
      label: "Chamada para ação",
      text: "VER OFERTA",
      ...bannerPresets().layouts.vertical.cta,
      fontFamily: "Cocogoose Pro",
      fontStyle: "bold",
      fill: "#ffffff",
      align: "center",
      lineHeight: 1,
      rotation: 0,
      opacity: 1,
    },
  ];
}
const OFFER_LEGAL = "*Mesmo produto, marca, gramatura e preço.";
function initialOffer(p) {
  return {
    model: p.offerKind === 'percentage'
      ? 'percentage'
      : p.offerKind === 'takePay'
        ? 'takePay'
        : 'price',
    showClub:
      typeof p.showClub === "boolean"
        ? p.showClub
        : ["club", "takePay"].includes(p.offerKind),
    price: p.price ?? p.retailPrice ?? 0,
    takeQty: p.takeQty || 2,
    payQty: p.payQty || 1,
    percentage: p.percentage ?? 40,
    upTo: false,
  };
}
function ensureOffer(b) {
  return b.offer || (b.offer = initialOffer(b.product));
}
function defaultNodes(p, offer = initialOffer(p), format = "vertical") {
  const nodes = baseNodes({ ...p, price: offer.price });
  if (offer.model === "takePay") {
    const i = nodes.findIndex((n) => n.role === "price");
    nodes[i] = {
      id: uid(),
      type: "text",
      role: "offerHeadline",
      label: "Leve / Pague",
      text: `LEVE ${offer.takeQty}\nPAGUE ${offer.payQty}`,
      ...bannerPresets().layouts.vertical.offerHeadline,
      fontFamily: "Cocogoose Pro",
      fontStyle: "bold",
      fill: "#ffffff",
      align: "center",
      lineHeight: 0.88,
      rotation: 0,
      opacity: 1,
    };
    nodes.push({
      id: uid(),
      type: "text",
      role: "offerLegal",
      label: "Texto legal",
      text: OFFER_LEGAL,
      ...bannerPresets().layouts.vertical.offerLegal,
      fontFamily: "Cocogoose Pro",
      fontStyle: "normal",
      fill: "#ffffff",
      align: "center",
      lineHeight: 1,
      rotation: 0,
      opacity: 1,
    });
  }
  if (offer.model === "percentage") {
    const i = nodes.findIndex((n) => n.role === "price");
    nodes[i] = {
      id: uid(),
      type: "discount",
      role: "offerDiscount",
      label: "Porcentagem de desconto",
      value: offer.percentage,
      upTo: offer.upTo,
      ...bannerPresets().layouts.vertical.offerDiscount,
      fill: "#ffffff",
      rotation: 0,
      opacity: 1,
    };
  }
  if (offer.showClub)
    nodes.splice(
      nodes.findIndex((n) => n.role === "productImage"),
      0,
      {
        id: uid(),
        type: "image",
        role: "clubBadge",
        label: "Selo Clube K",
        src: "/assets/clube-k.png",
        ...bannerPresets().layouts.vertical.clubBadge,
        rotation: 0,
        opacity: 1,
      },
    );
  for (const n of nodes)
    if (["text", "price", "discount"].includes(n.type)) {
      n.fontFamily = "Cocogoose Pro";
      n.fontWeight =
        n.role === "offerLegal" ? 350 : n.role === "name" ? 400 : 700;
      n.fontStyle = "normal";
      n.letterSpacing = 0;
    }
  const adapted = adaptFormatNodes(nodes, format);
  if (brandProfile().creative) {
    const theme = defaultTheme(format);
    for (const n of adapted) {
      if (n.role === "priceBand") {
        n.type = "svg";
        n.src = brandProfile().creative.priceShape;
        n.fill = theme.priceColor;
      }
      if (["text", "price", "discount"].includes(n.type)) {
        n.fontFamily = brandProfile().creative.fontFamily;
        n.fontWeight = brandProfile().typography.fontWeight;
        n.lineHeight = brandProfile().typography.lineHeight;
      }
      if (["price", "offerHeadline", "offerDiscount"].includes(n.role))
        n.fill = theme.priceTextColor;
      if (n.role === "ctaBand") n.fill = theme.ctaColor;
      if (n.role === "cta") n.fill = theme.ctaTextColor;
      if (n.role === "name") n.shadowColor = "#700018";
    }
  }
  const first = adapted.find((n) => n.role === "productImage"),
    images = [first, { ...first, id: uid(), label: "Imagem 2" }];
  adapted.splice(adapted.indexOf(first) + 1, 0, images[1]);
  const boxes = productBoxes(format, 2);
  images.forEach((n, i) => {
    [n.x, n.y, n.width, n.height] = boxes[i];
  });
  return adapted;
}
function productBoxes(format, count) {
  const config =
    bannerPresets().productImages[format] ||
    bannerPresets().productImages.vertical;
  if (config.byCount)
    return config.byCount[count].map((b) => [b.x, b.y, b.width, b.height]);
  const { x, y, width: w, height: h } = config.area,
    step = config.overlapStep,
    stagger = config.stagger,
    slot = w / (1 + (count - 1) * step);
  return Array.from({ length: count }, (_, i) => [
    x + i * slot * step,
    y + (i % 2 ? 0 : h * stagger),
    slot,
    h - (i % 2 ? 0 : h * stagger),
  ]);
}
function adaptFormatNodes(nodes, format) {
  if (format === "vertical") return nodes;
  const pano = format === "panoramic",
    layout = bannerPresets().layouts[format] || bannerPresets().layouts.mini;
  for (const n of nodes) {
    const box = layout[n.role];
    if (box) Object.assign(n, box);
    if (n.role === "name") {
      n.align = pano ? "center" : "left";
      n.shadowBlur = pano ? 0 : 3;
      n.shadowOffsetY = pano ? 0 : 3;
    }
    if (n.role === "priceBand") n.cornerRadius = n.height / 2;
    if (n.role === "ctaBand") {
      n.cornerRadius = n.height / 2;
      if (pano) n.fill = "#ffce00";
    }
    if (n.role === "cta" && pano) n.fill = "#ff0800";
    if (n.role === "productImage")
      [n.x, n.y, n.width, n.height] = productBoxes(format, 1)[0];
  }
  // Mini places the call to action in front of the product image.
  if (!pano) {
    const cta = nodes.filter((n) => ["ctaBand", "cta"].includes(n.role));
    nodes = nodes.filter((n) => !["ctaBand", "cta"].includes(n.role));
    nodes.push(...cta);
  }
  return nodes;
}
const mechanicRoles = new Set([
  "price",
  "offerHeadline",
  "offerDiscount",
  "clubBadge",
  "offerLegal",
]);
function syncOfferNodes(b) {
  const offer = ensureOffer(b);
  b.offerDrafts ??= {};
  for (const n of b.nodes)
    if (mechanicRoles.has(n.role)) b.offerDrafts[n.role] = { ...n };
  const additions = defaultNodes(b.product, offer, b.format)
    .filter((n) => mechanicRoles.has(n.role))
    .map((fresh) => {
      const old = b.offerDrafts[fresh.role];
      if (!old) {
        if (fresh.type !== "image") fresh.fill = b.theme.textColor;
        return fresh;
      }
      const node = { ...old };
      if (fresh.role === "price") node.value = offer.price;
      if (fresh.role === "offerHeadline") node.text = fresh.text;
      if (fresh.role === "offerDiscount") {
        node.value = offer.percentage;
        node.upTo = offer.upTo;
      }
      return node;
    });
  b.nodes = b.nodes.filter((n) => !mechanicRoles.has(n.role));
  const at = b.nodes.findIndex((n) => n.role === "productImage");
  b.nodes.splice(
    at < 0 ? b.nodes.length : at,
    0,
    ...additions.filter((n) => n.role !== "offerLegal"),
  );
  b.nodes.push(...additions.filter((n) => n.role === "offerLegal"));
  b.preview = null;
}

function otherClusterPrices(b) {
  return (S.report?.products ?? [])
    .filter(
      (p) =>
        String(p.sku) === String(b.product.sku) &&
        (p.offerKind === "normal" || p.offerKind === "club") &&
        Number.isFinite(p.price),
    )
    .sort(
      (a, z) =>
        Number(z.cluster === b.product.cluster) -
        Number(a.cluster === b.product.cluster),
    );
}

function clusterPriceBox(b) {
  const offers = otherClusterPrices(b);
  if (!offers.length) return "";

  return `
    <details style="margin-top: 8px; font-size: 11px;">
      <summary style="cursor: pointer; padding: 4px 0; font-weight: 600;">
        Preços por capa (${offers.length})
      </summary>

      <div style="display: grid; gap: 3px; margin-top: 4px;">
        ${offers.map((p) => {
          const isCurrentCluster = p.cluster === b.product.cluster;

          return `
            <button
              type="button"
              class="btn small"
              data-action="use-cluster-price"
              data-id="${h(p.id)}"
              style="display: flex; justify-content: space-between; align-items: center; gap: 6px; width: 100%; padding: 4px 6px; min-height: 0; font-size: 11px; line-height: 1.25; white-space: normal; text-align: left;"
            >
              <span>
                ${h(p.cluster)}${isCurrentCluster ? " (Atual)" : ""}
              </span>

              <span style="display: grid; gap: 2px; text-align: right; white-space: nowrap;">
                <strong>${h(money(p.price))}</strong>
                ${p.offerKind === "club"
                  ? '<span style="font-size: 9px;">Clube K</span>'
                  : ""}
              </span>
            </button>`;
        }).join("")}
      </div>
    </details>`;
}

function offerProperties(b) {
  const o = ensureOffer(b);
  return `<section class="property-section"><h3>Mecânica da oferta</h3><label class="field"><span>Tipo de oferta</span><select data-mechanic="model" aria-label="Tipo de oferta">${[
    ["price", "Preço"],
    ["takePay", "Pague e Leve"],
    ["percentage", "Porcentagem"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${o.model === v ? "selected" : ""}>${t}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="toggle-row">Mostrar selo Clube K<input type="checkbox" data-mechanic="showClub" ${o.showClub ? "checked" : ""}></label>${o.model === "takePay" ? `<div class="field-row" style="margin-top:12px">${field("Quantidade Leve", o.takeQty, 'data-mechanic="takeQty" type="number" min="2" step="1"')}${field("Quantidade Pague", o.payQty, 'data-mechanic="payQty" type="number" min="1" step="1"')}</div><label class="field"><span>Texto legal</span><textarea data-role="offerLegal" aria-label="Texto legal">${h(b.nodes.find((n) => n.role === "offerLegal")?.text || "")}</textarea></label>` : o.model === "percentage" ? `${field("Desconto (%)", o.percentage, 'data-mechanic="percentage" type="number" min="0" max="100" step="1"')}<label class="toggle-row">Mostrar “com até”<input type="checkbox" data-mechanic="upTo" aria-label="Mostrar com até" ${o.upTo ? "checked" : ""}></label>` : field("Preço (R$)", o.price, 'data-role="price" inputmode="decimal"') + clusterPriceBox(b)}<p class="hint">${o.model === "percentage" ? "Informe o desconto desejado. O selo pode ser ativado em qualquer modelo." : o.model === "takePay" ? "A faixa mostra as quantidades, sem preço monetário." : "Alterar o selo não altera o valor do preço."}</p></section>`;
}


function updateMechanic(el, refresh) {
  const b = current();
  if (!b) return;
  const o = ensureOffer(b),
    key = el.dataset.mechanic;
  let value = el.type === "checkbox" ? el.checked : el.value;
  if (key === "model" && !["price", "takePay", "percentage"].includes(value))
    return;
  if (key === "upTo") value = value === true || value === "true";
  if (["takeQty", "payQty", "percentage"].includes(key)) {
    value = Number(value);
    if (
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < (key === 'percentage' ? 0 : 1) ||
      (key === 'percentage' && value > 100)
    ) {
      if (refresh) {
        toast(
          "Use um valor inteiro válido. O desconto deve ficar entre 0% e 100%.",
        );
        renderProperties();
      }
      return;
    }
    const take = key === "takeQty" ? value : o.takeQty,
      pay = key === "payQty" ? value : o.payQty;
    if (key !== "percentage" && take <= pay) {
      if (refresh) {
        toast("A quantidade Leve deve ser maior que Pague.");
        renderProperties();
      }
      return;
    }
  }
  if (o[key] === value) return;
  snapshot();
  o[key] = value;
  syncOfferNodes(b);
  clearModelSelection();
  drawStage();
  renderBoardList();
  if (refresh) renderProperties();
}
function updateBoardPrice(b, value) {
  ensureOffer(b).price = value;
  b.product.price = value;
  if (b.product.offerKind === "club") b.product.loyaltyPrice = value;
  else b.product.retailPrice = value;
}
function makeBoard(p) {
  const b = {
    id: uid(),
    brand: S.brand,
    format: S.format,
    product: { ...p },
    theme: defaultTheme(S.format),
    offer: initialOffer(p),
    offerDrafts: {},
    imageSpacing: 20,
    imageScale: 100,
    imageLayout: "original",
    nodes: defaultNodes(p, initialOffer(p), S.format),
    preview: null,
  };
  S.history.set(b.id, []);
  S.future.set(b.id, []);
  return b;
}
function current() {
  return S.boards[S.active];
}
function snapshot(b = current()) {
  if (!b) return;
  const a = S.history.get(b.id) || [];
  a.push(
    JSON.stringify({
      product: b.product,
      theme: b.theme,
      nodes: b.nodes,
      offer: b.offer,
      offerDrafts: b.offerDrafts,
      imageSpacing: b.imageSpacing,
      imageScale: b.imageScale,
      imageLayout: b.imageLayout,
    }),
  );
  if (a.length > 40) a.shift();
  S.history.set(b.id, a);
  S.future.set(b.id, []);
  updateUndoButtons();
}
function historyGo(direction) {
  const b = current();
  if (!b) return;
  const from = direction === "undo" ? S.history : S.future,
    to = direction === "undo" ? S.future : S.history;
  const a = from.get(b.id) || [];
  if (!a.length) return;
  const dest = to.get(b.id) || [];
  dest.push(
    JSON.stringify({
      product: b.product,
      theme: b.theme,
      nodes: b.nodes,
      offer: b.offer,
      offerDrafts: b.offerDrafts,
      imageSpacing: b.imageSpacing,
      imageScale: b.imageScale,
      imageLayout: b.imageLayout,
    }),
  );
  to.set(b.id, dest);
  Object.assign(b, JSON.parse(a.pop()));
  clearModelSelection();
  drawStage();
  renderProperties();
  renderBoardList();
  updateUndoButtons();
}
function editorView() {
  const b = current();
  return `<div class="editor"><header class="editor-top">${logo()}${supportsPaid() ? '<button class="btn small" data-action="workspace-paid">Mídia Paga</button>' : ""}<span class="editor-brand">${h(brandProfile().label)}</span><div class="top-separator"></div><button class="icon-btn" data-action="back-products" title="Voltar aos produtos">${ico("arrow-left")}</button><input class="project-title" id="project-title" value="${h(S.title)}" aria-label="Nome da campanha"><span class="session-indicator"><span class="status-dot"></span>Alterações mantidas nesta sessão</span><span class="spacer"></span><div class="undo-area" style="display:flex;gap:3px"><button class="icon-btn" id="undo-btn" data-action="undo" title="Desfazer (Ctrl+Z)">${ico("undo-2")}</button><button class="icon-btn" id="redo-btn" data-action="redo" title="Refazer (Ctrl+Shift+Z)">${ico("redo-2")}</button></div><button class="btn primary" data-action="export">${ico("download")}Exportar${ico("chevron-down")}</button></header><div class="editor-body"><aside class="boards-panel"><div class="panel-header">Criativos<span class="counter">${S.boards.length}</span></div><div class="board-search"><label class="search">${ico("search")}<input id="board-query" placeholder="Nome ou SKU" value="${h(S.boardQuery)}" aria-label="Buscar criativos"></label></div><div class="boards-list" id="boards-list"></div><div class="board-panel-bottom"><button class="btn" data-action="back-products">${ico("plus")}Adicionar produtos</button><p>Cada criativo tem suas<br>próprias configurações.</p></div></aside><main class="canvas-workspace"><div class="canvas-toolbar"><div class="left-tools"><button class="icon-btn" data-action="select-all-nodes" title="Selecionar todos os elementos (Ctrl+A)">${ico("scan")}</button><button class="icon-btn active" title="Selecionar e mover">${ico("mouse-pointer-2")}</button><button class="icon-btn" data-action="add-text" title="Adicionar texto">${ico("type")}</button><button class="icon-btn" data-action="add-rect" title="Adicionar forma">${ico("square")}</button><button class="icon-btn" data-action="add-image" title="Adicionar imagem">${ico("image-plus")}</button><div class="tool-divider"></div><button class="icon-btn ${S.guides ? "active" : ""}" data-action="toggle-guides" title="Mostrar guias">${ico("scan-line")}</button></div><span class="format-label">${ico("rectangle-horizontal")}${boardFormat(b).name} · ${boardFormat(b).width} × ${boardFormat(b).height} px</span></div><div class="canvas-area" id="canvas-area"><div class="artboard-wrapper" id="artboard-wrapper"><span class="canvas-caption" id="canvas-caption">01 · ${h(b.product.name)}</span><div id="fabric-container"></div></div></div><div class="canvas-bottom"><span>Shift + clique: selecionar vários · Arraste no fundo para selecionar</span><div class="zoom-controls"><button class="icon-btn" data-action="zoom-out" title="Diminuir zoom">${ico("minus")}</button><button class="zoom-value" data-action="zoom-fit" id="zoom-label" title="Ajustar à tela">Ajustar</button><button class="icon-btn" data-action="zoom-in" title="Aumentar zoom">${ico("plus")}</button><button class="icon-btn" data-action="zoom-fit" title="Ajustar à tela">${ico("maximize")}</button></div></div></main><aside class="properties-panel"><div class="property-tabs">${[
    ["design", "Design"],
    ["layers", "Camadas"],
    ["elements", "Elementos"],
  ]
    .map(
      ([id, n]) =>
        `<button class="property-tab ${S.tab === id ? "active" : ""}" data-action="property-tab" data-tab="${id}">${n}</button>`,
    )
    .join(
      "",
    )}</div><div class="property-scroll" id="property-scroll"></div><footer class="property-footer">Tudo se mantém ao trocar de criativo.</footer></aside></div></div>`;
}
function renderBoardList() {
  const el = $("#boards-list");
  if (!el) return;
  el.innerHTML = S.boards
    .map((b, i) => ({ b, i }))
    .filter(
      ({ b }) =>
        !S.boardQuery ||
        norm(b.product.name + " " + b.product.sku).includes(norm(S.boardQuery)),
    )
    .map(
      ({ b, i }) =>
        `<button class="board-card ${i === S.active ? "active" : ""}" data-action="switch-board" data-index="${i}" aria-label="Editar ${h(b.product.name)}"><img class="board-mini" style="aspect-ratio:${boardFormat(b).width}/${boardFormat(b).height};height:auto" id="mini-${b.id}" src="${b.preview || "/assets/blank-preset.svg"}" alt=""><span class="board-card-text"><strong>${h(b.product.name)}</strong><small>SKU ${h(b.product.sku)}</small><small title="${h(b.product.cluster)}">${h(b.product.cluster)} · ${boardFormat(b).name}</small><small style="font-size:10px;color:var(--ui-687f55)">${offerLabel(b.product, b.offer)}</small></span><span class="board-number">${String(i + 1).padStart(2, "0")}</span></button>`,
    )
    .join("");
  icons();
}
function field(label, value, attributes = "") {
  return `<label class="field"><span>${label}</span><input value="${h(value)}" ${attributes}></label>`;
}
function colorField(label, value, attributes) {
  return `<label class="field"><span>${label}</span><div class="color-input"><input type="color" value="${h(value)}" ${attributes} aria-label="${label}"><input type="text" value="${h(value)}" maxlength="7" pattern="#[0-9a-fA-F]{6}" ${attributes} aria-label="Código da cor: ${label}"></div></label>`;
}
function nodeById() {
  return current()?.nodes.find((n) => n.id === S.selectedNode);
}
function renderProperties() {
  const el = $("#property-scroll");
  if (!el) return;
  const b = current(),
    selection = selectedModels(),
    n = nodeById();
  $$(".property-tab").forEach((e) =>
    e.classList.toggle("active", e.dataset.tab === S.tab),
  );
  if (S.tab === "layers") {
    el.innerHTML = `<section class="property-section"><h3>Camadas <span class="muted tiny">${b.nodes.length}</span></h3><p class="hint" style="margin-bottom:15px">Use as caixas ou Shift + clique para selecionar várias. As primeiras ficam à frente.</p>${[
      ...b.nodes,
    ]
      .reverse()
      .map(
        (n) =>
          `<div class="layer-item ${S.selectedNodes.includes(n.id) ? "active" : ""}" data-action="select-node" data-id="${n.id}"><input type="checkbox" class="layer-checkbox" data-action="toggle-node-selection" data-id="${n.id}" aria-label="Selecionar camada ${h(n.label)}" ${S.selectedNodes.includes(n.id) ? "checked" : ""} ${n.locked || n.hidden ? "disabled" : ""}>${ico(n.type === "image" ? "image" : n.type === "text" || n.type === "price" || n.type === "discount" ? "type" : n.type === "circle" ? "circle" : "square")}<span class="name">${h(n.label)}</span><button class="icon-btn" data-action="toggle-lock" data-id="${n.id}" title="${n.locked ? "Desbloquear" : "Bloquear"}">${ico(n.locked ? "lock" : "lock-open")}</button><button class="icon-btn" data-action="toggle-visible" data-id="${n.id}" title="${n.hidden ? "Mostrar" : "Ocultar"}">${ico(n.hidden ? "eye-off" : "eye")}</button></div>`,
      )
      .join(
        "",
      )}<div class="layer-item" style="color:var(--ui-9baa8c)">${ico("lock")}<span>Fundo da prancheta</span></div></section><div class="property-section"><button class="btn small" data-action="tab-design" style="width:100%">${ico("sliders-horizontal")}Propriedades da seleção</button></div>`;
    icons();
    return;
  }
  if (S.tab === "elements") {
    el.innerHTML = `<section class="property-section"><h3>Adicione ao seu criativo</h3><div class="tools-grid"><button class="tool-card" data-action="add-text">${ico("type")}Texto</button><button class="tool-card" data-action="add-image">${ico("image-plus")}Imagem</button><button class="tool-card" data-action="add-rect">${ico("square")}Retângulo</button><button class="tool-card" data-action="add-circle">${ico("circle")}Círculo</button></div></section><section class="property-section"><h3>Imagens do produto</h3>${imageSection(b)}<p class="hint">Escolha outros produtos, envie arquivos ou use um link de imagem.</p></section>`;
    icons();
    return;
  }
  el.innerHTML = `<section class="property-section"><h3>Produto ${ico("package")}</h3><div style="font-size:10px;line-height:1.6;color:var(--ui-798d67);margin-bottom:11px">${h(b.product.name)}<span style="display:block;color:var(--ui-a1ae96);font-size:9px">SKU ${h(b.product.sku)} · ${h(b.product.cluster)}</span></div><button class="btn small" data-action="replace-product" style="width:100%">${ico("replace")}Trocar produto</button></section>${offerProperties(b)}${selection.length > 1 ? selectionControls() : n ? nodeProperties(n) : `<section class="property-section"><h3>Texto da oferta ${ico("type")}</h3><label class="field"><span>Nome do produto</span><textarea data-role="name" aria-label="Nome do produto">${h(b.nodes.find((n) => n.role === "name")?.text || "")}</textarea></label>${field("Texto do botão", b.nodes.find((n) => n.role === "cta")?.text || "", 'data-role="cta"')}</section>`}<section class="property-section"><h3>Estilo do preset ${ico("palette")}</h3>${backgroundProperties(b)}<div class="color-row" style="margin-top:10px">${colorField("Faixa de preço", b.theme.priceColor, 'data-theme="priceColor"')}${colorField("Botão", b.theme.ctaColor, 'data-theme="ctaColor"')}</div>${b.theme.priceTextColor ? colorField("Texto do preço", b.theme.priceTextColor, 'data-theme="priceTextColor"') : ""}${colorField("Cor dos textos", b.theme.textColor, 'data-theme="textColor"')}${colorField("Texto do botão", b.theme.ctaTextColor || b.theme.textColor, 'data-theme="ctaTextColor"')}<button class="btn small" style="width:100%;margin-top:5px" data-action="apply-theme">${ico("copy-check")}Aplicar estilo a todos</button></section><section class="property-section"><h3>Imagens do produto ${ico("images")}</h3>${imageSection(b)}<p class="hint">Cada imagem pode ser movida, redimensionada e substituída individualmente.</p></section><section class="property-section"><button class="btn ghost small" style="width:100%" data-action="reset-layout">${ico("rotate-ccw")}Restaurar layout deste criativo</button></section>`;
  decorateDesignSections(el);
  icons();
}
function backgroundProperties(b) {
  const t = b.theme,
    mode = t.backgroundMode || "template";
  return `<label class="field"><span>Preset de cores</span><select data-background="preset" aria-label="Preset de cores"><option value="custom" disabled ${t.stylePreset === "custom" ? "selected" : ""}>Personalizado</option>${brandStylePresets()
    .map(
      (p) =>
        `<option value="${h(p.id)}" data-start="${h(p.background)}" data-end="${h(p.backgroundEnd)}" ${(t.stylePreset || "encarte") === p.id ? "selected" : ""}>${h(p.label)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field"><span>Tipo de fundo</span><select data-background="mode" aria-label="Tipo de fundo">${[
    ["template", "Original do formato"],
    ["color", "Cor / degradê"],
    ["image", "Imagem"],
  ]
    .map(
      ([id, label]) =>
        `<option value="${id}" ${mode === id ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><div class="color-row">${colorField("Cor do fundo", t.background, 'data-theme="background"')}${colorField("Fim do degradê", t.backgroundEnd, 'data-theme="backgroundEnd"')}</div><label class="toggle-row">Usar degradê<input type="checkbox" data-theme="gradient" ${t.gradient ? "checked" : ""}></label><button class="btn small" data-action="background-image" style="width:100%;margin-top:12px">${ico("image-plus")}${t.backgroundImage ? "Trocar imagem de fundo" : "Adicionar imagem de fundo"}</button>${
    t.backgroundImage
      ? `<label class="field" style="margin-top:12px"><span>Ajuste da imagem de fundo</span><select data-background="fit" aria-label="Ajuste da imagem de fundo">${[
          ["cover", "Preencher (recorta as bordas)"],
          ["contain", "Mostrar inteira"],
          ["stretch", "Esticar"],
        ]
          .map(
            ([id, label]) =>
              `<option value="${id}" ${(t.backgroundFit || "cover") === id ? "selected" : ""}>${label}</option>`,
          )
          .join(
            "",
          )}</select></label><button class="btn ghost small" data-action="remove-background" style="width:100%">${ico("x")}Remover imagem de fundo</button>`
      : ""
  }<button class="btn small" data-action="apply-background-all" style="width:100%;margin-top:10px">${ico("copy-check")}Aplicar fundo a todos</button><p class="hint">O fundo ocupa a prancheta inteira. Aplicar a todos mantém os textos e as cores dos outros elementos.</p>`;
}
function updateBackground(key, value) {
  const b = current();
  if (!b) return;
  if (key === "preset") {
    const preset = brandStylePresets().find((p) => p.id === value);
    if (!preset || b.theme.stylePreset === value) return;
    snapshot(b);
    b.theme = {
      ...b.theme,
      stylePreset: preset.id,
      background: preset.background,
      backgroundEnd: preset.backgroundEnd,
    };
    b.preview = null;
    drawStage();
    renderProperties();
    return;
  }
  if (key === "mode" && !["template", "color", "image"].includes(value)) return;
  if (key === "fit" && !["cover", "contain", "stretch"].includes(value)) return;
  if (key === "mode" && value === "image" && !b.theme.backgroundImage) {
    renderProperties();
    openImagePicker(null, "background");
    return;
  }
  const prop = key === "mode" ? "backgroundMode" : "backgroundFit";
  if (b.theme[prop] === value) return;
  snapshot(b);
  b.theme = { ...b.theme, [prop]: value };
  b.preview = null;
  drawStage();
  renderProperties();
}
function applyBackgroundToAll() {
  const source = current();
  if (!source) return;
  const keys = [
    "stylePreset",
    "background",
    "backgroundEnd",
    "gradient",
    "backgroundMode",
    "backgroundImage",
    "backgroundFit",
  ];
  for (const b of S.boards) {
    if (b === source) continue;
    snapshot(b);
    const theme = { ...b.theme };
    for (const key of keys)
      theme[key] =
        source.theme[key] ??
        (key === "backgroundMode"
          ? "template"
          : key === "backgroundFit"
            ? "cover"
            : key === "backgroundImage"
              ? ""
              : theme[key]);
    b.theme = theme;
    b.preview = null;
  }
  renderBoardList();
  toast("Fundo aplicado a todos os criativos.");
}
function backgroundImageOptions(img, width, height, fit = "cover") {
  const iw = img.naturalWidth,
    ih = img.naturalHeight,
    base = {
      selectable: false,
      evented: false,
      objectCaching: false,
      strokeWidth: 0,
    };
  if (fit === "stretch")
    return {
      ...base,
      left: 0,
      top: 0,
      scaleX: width / iw,
      scaleY: height / ih,
    };
  const scale =
    fit === "contain"
      ? Math.min(width / iw, height / ih)
      : Math.max(width / iw, height / ih);
  if (fit === "contain")
    return {
      ...base,
      left: (width - iw * scale) / 2,
      top: (height - ih * scale) / 2,
      scaleX: scale,
      scaleY: scale,
    };
  return {
    ...base,
    left: 0,
    top: 0,
    width: width / scale,
    height: height / scale,
    cropX: Math.max(0, (iw - width / scale) / 2),
    cropY: Math.max(0, (ih - height / scale) / 2),
    scaleX: scale,
    scaleY: scale,
  };
}
async function addSceneBackground(st, b, failed) {
  if (b.theme.backgroundMode !== "image" || !b.theme.backgroundImage) return;
  try {
    const img = await loadImage(b.theme.backgroundImage);
    if (st.disposed || st.destroyed) return;
    st.add(
      new fabric.FabricImage(
        img,
        backgroundImageOptions(
          img,
          boardFormat(b).width,
          boardFormat(b).height,
          b.theme.backgroundFit,
        ),
      ),
    );
  } catch {
    failed.push("Imagem de fundo");
  }
}
const IMAGE_LAYOUTS = window.OFERTA_PRESETS.imageLayouts.map((p) => [
  p.id,
  p.label,
]);
function layoutSlots(layout, count) {
  return (
    window.OFERTA_PRESETS.imageLayouts
      .find((p) => p.id === layout)
      ?.slots[count]?.map((slot) => [...slot]) || []
  );
}
function imageLayoutIcon(layout, count) {
  return `<svg viewBox="0 0 100 64" aria-hidden="true" focusable="false">${layoutSlots(
    layout,
    count,
  )
    .map(
      ([x, y, w, h], i) =>
        `<rect x="${5 + x * 90}" y="${4 + y * 56}" width="${w * 90}" height="${h * 56}" rx="4" fill="currentColor" fill-opacity="${0.24 + i * 0.2}" stroke="currentColor" stroke-width="1.5"/>`,
    )
    .join("")}</svg>`;
}
function imageLayoutPicker(b, count) {
  return `<div class="image-layout-picker"><span class="image-layout-label">Posicionamento das imagens</span><div class="image-layout-grid" role="group" aria-label="Templates de posicionamento de imagens">${IMAGE_LAYOUTS.map(([id, label]) => `<button type="button" class="image-layout-choice ${b.imageLayout === id ? "selected" : ""}" data-action="image-layout" data-layout="${id}" aria-label="Posicionar imagens: ${label}" aria-pressed="${b.imageLayout === id}" title="${label}">${imageLayoutIcon(id, count)}<span>${label}</span></button>`).join("")}</div><p class="hint">Aplique uma composição e ajuste a escala ou o espaçamento abaixo.</p></div>`;
}
function layoutSpacingVectors(layout, count) {
  const slots = layoutSlots(layout, count),
    centers = slots.map(([x, y, w, h]) => [x + w / 2, y + h / 2]),
    cx = centers.reduce((s, c) => s + c[0], 0) / count,
    cy = centers.reduce((s, c) => s + c[1], 0) / count;
  return centers.map(([x, y]) => {
    const dx = x - cx,
      dy = y - cy,
      len = Math.hypot(dx, dy);
    return len < 0.001
      ? [0, 0]
      : [((dx / len) * (count - 1)) / 2, ((dy / len) * (count - 1)) / 2];
  });
}
function offsetLayoutImages(images, layout, gap) {
  const vectors = layoutSpacingVectors(layout, images.length);
  images.forEach((n, i) => {
    n.x += vectors[i][0] * gap;
    n.y += vectors[i][1] * gap;
  });
}
function setProductLayout(layout, record = true) {
  const b = current();
  if (!b || !IMAGE_LAYOUTS.some(([id]) => id === layout)) return;
  const images = b.nodes.filter((n) => n.role === "productImage");
  if (images.length < 2 || images.length > 3) return;
  if (record) snapshot(b);
  spacingRequests.set(b, (spacingRequests.get(b) || 0) + 1);
  const [x, y, w, h] = productBoxes(b.format || "vertical", 1)[0],
    padding = Math.min(
      bannerPresets().imageComposition.padding,
      w * bannerPresets().imageComposition.paddingRatio,
      h * bannerPresets().imageComposition.paddingRatio,
    ),
    slots = layoutSlots(layout, images.length);
  images.forEach((n, i) => {
    const [sx, sy, sw, sh] = slots[i];
    Object.assign(n, {
      x: x + padding + sx * (w - padding * 2),
      y: y + padding + sy * (h - padding * 2),
      width: sw * (w - padding * 2),
      height: sh * (h - padding * 2),
      rotation: 0,
    });
  });
  scaleProductNodes(images, (b.imageScale ?? 100) / 100);
  offsetLayoutImages(images, layout, b.imageSpacing ?? 20);
  b.imageLayout = layout;
  b.preview = null;
  clearModelSelection();
  drawStage();
  renderProperties();
}
function imageSection(b) {
  const imgs = b.nodes.filter((n) => n.role === "productImage");
  return `<label class="field"><span>Quantidade de imagens</span><div class="segmented">${[1, 2, 3].map((v) => `<button class="${imgs.length === v ? "selected" : ""}" data-action="image-count" data-count="${v}">${ico(v === 1 ? "image" : "images")}${v}</button>`).join("")}</div></label>${imgs.length > 1 ? `${imageLayoutPicker(b, imgs.length)}${field(IMAGE_LAYOUTS.some(([id]) => id === b.imageLayout) ? "Afastamento do layout (px)" : "Espaçamento horizontal (px)", b.imageSpacing ?? 20, `data-image-spacing type="number" min="${-Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)))}" max="${Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)))}" step="1"`)}<input class="image-spacing-range" type="range" min="${-Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)))}" max="${Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)))}" step="1" value="${b.imageSpacing ?? 20}" data-image-spacing aria-label="Ajustar espaçamento entre imagens"><p class="hint">Valores positivos afastam; negativos sobrepõem. Mantém o tamanho e a composição escolhida.</p>` : ""}${field("Escala do bloco (%)", b.imageScale ?? 100, 'data-product-scale type="number" min="25" max="250" step="1"')}<input class="image-spacing-range" type="range" min="25" max="250" step="1" value="${b.imageScale ?? 100}" data-product-scale aria-label="Ajustar escala do bloco de produtos"><p class="hint">Aumenta ou reduz todas as imagens juntas, a partir do centro do bloco.</p>${imgs.map((n, i) => `<button class="image-slot" data-action="replace-image" data-id="${n.id}">${thumb(n.src, "")}<span><strong>Imagem ${i + 1}</strong><small>Trocar imagem</small></span>${ico("replace")}</button>`).join("")}`;
}
function textWeight(n) {
  return Number(n.fontWeight) || (n.fontStyle === "bold" ? 700 : 400);
}
function typographyControls(n) {
  return `<label class="field"><span>Fonte</span><select data-node="fontFamily" aria-label="Fonte">${["Cocogoose Pro", "Cera Pro", "DM Sans", "Arial", "Georgia", "Verdana", "Trebuchet MS"].map((v) => `<option ${n.fontFamily === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label class="field"><span>Peso da fonte</span><select data-node="fontWeight" aria-label="Peso da fonte">${(n.fontFamily ===
  "Cera Pro"
    ? [
        [300, "Light"],
        [400, "Regular"],
        [900, "Black"],
      ]
    : [
        [350, "Thin / Semilight"],
        [400, "Regular"],
        [700, "Bold"],
      ]
  )
    .map(
      ([v, label]) =>
        `<option value="${v}" ${textWeight(n) === v ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><div class="field-row">${n.type === "text" ? field("Altura de linha", n.lineHeight ?? 1.1, 'type="number" min="0.5" max="3" step="0.05" data-node="lineHeight"') : ""}${field("Espaçamento de letras (px)", n.letterSpacing ?? 0, 'type="number" min="-5" max="30" step="0.1" data-node="letterSpacing"')}</div>${n.type === "text" ? `<label class="field"><span>Estilo</span><select data-node="fontStyle" aria-label="Estilo do texto"><option value="normal" ${n.fontStyle !== "italic" ? "selected" : ""}>Normal</option><option value="italic" ${n.fontStyle === "italic" ? "selected" : ""}>Itálico</option></select></label><label class="toggle-row">Sublinhado<input type="checkbox" data-node="underline" ${n.underline ? "checked" : ""}></label>` : ""}`;
}
function fabricTypography(n) {
  return {
    fontFamily: n.fontFamily || "Cocogoose Pro",
    fontWeight: textWeight(n),
    charSpacing: (1000 * (n.letterSpacing || 0)) / (n.fontSize || 218),
  };
}
let creativeFontsReady;
function loadCreativeFonts() {
  return (creativeFontsReady ??= document.fonts
    ? Promise.all(
        [
          ["Cocogoose Pro", [100, 350, 400, 700]],
          ["Cera Pro", [300, 400, 900]],
        ].flatMap(([family, weights]) =>
          weights.map((weight) =>
            document.fonts.load(`${weight} 56px "${family}"`),
          ),
        ),
      ).then((faces) => {
        if (faces.some((face) => !face.length))
          throw new Error(
            "Não foi possível carregar as fontes dos criativos. Recarregue a página.",
          );
      })
    : Promise.resolve());
}
function creativeFilename(b, format = S.exportFormat) {
  const number = S.boards.indexOf(b) + 1,
    label =
      b.format === "vertical" || !b.format ? "Vertical" : boardFormat(b).name,
    sku = String(b.product.sku).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  return `${label} ${number} - ${sku}.${format}`;
}
function nodeProperties(n) {
  return `<section class="property-section"><h3>${h(n.label)} <button class="icon-btn" data-action="deselect" title="Fechar seleção">${ico("x")}</button></h3>${
    n.type === "text"
      ? `<label class="field"><span>Texto</span><textarea data-node="text" aria-label="Texto">${h(n.text)}</textarea></label>${field("Tamanho", n.fontSize, 'type="number" min="8" max="400" data-node="fontSize"')}<div class="segmented" style="margin-bottom:12px">${[
          ["left", "align-left"],
          ["center", "align-center"],
          ["right", "align-right"],
        ]
          .map(
            ([v, i]) =>
              `<button class="${n.align === v ? "selected" : ""}" data-action="text-align" data-value="${v}" title="${v}">${ico(i)}</button>`,
          )
          .join("")}</div>`
      : ""
  }${n.type === "price" ? `${field("Preço (R$)", n.value, 'data-node="value" inputmode="decimal"')}${field("Tamanho", n.fontSize, 'type="number" min="30" max="400" data-node="fontSize"')}` : ""}${n.type === "discount" ? field("Tamanho", n.fontSize, 'type="number" min="30" max="400" data-node="fontSize"') : ""}${["text", "price", "discount"].includes(n.type) ? typographyControls(n) : ""}${n.type === "image" ? `<button class="btn small" data-action="replace-image" data-id="${n.id}" style="width:100%;margin-bottom:12px">${ico("replace")}Substituir imagem</button><button class="btn small" data-action="flip-image" style="width:100%;margin-bottom:12px">${ico("flip-horizontal-2")}Espelhar horizontalmente</button>` : colorField("Cor", n.fill || "#ffffff", 'data-node="fill"')}<div class="field-row">${field("X", Math.round(n.x), 'type="number" data-node="x"')}${field("Y", Math.round(n.y), 'type="number" data-node="y"')}</div><div class="field-row">${field("Largura", Math.round(n.width), 'type="number" min="5" max="5000" data-node="width"')}${field("Altura", Math.round(n.height), 'type="number" min="5" max="5000" data-node="height"')}</div><div class="field-row">${field("Rotação (°)", Math.round(n.rotation || 0), 'type="number" data-node="rotation"')}${field("Opacidade (%)", Math.round((n.opacity ?? 1) * 100), 'type="number" min="0" max="100" data-node="opacity"')}</div>${n.type === "rect" ? field("Arredondamento", n.cornerRadius || 0, 'type="number" min="0" data-node="cornerRadius"') : ""}<h3 style="margin-top:17px">Alinhar à prancheta</h3><div class="align-buttons">${[
    ["left", "align-start-vertical", "Esquerda"],
    ["center", "align-center-vertical", "Centro horizontal"],
    ["right", "align-end-vertical", "Direita"],
    ["top", "align-start-horizontal", "Topo"],
    ["middle", "align-center-horizontal", "Centro vertical"],
    ["bottom", "align-end-horizontal", "Base"],
  ]
    .map(
      ([v, i, t]) =>
        `<button class="icon-btn" data-action="align-node" data-value="${v}" title="${t}">${ico(i)}</button>`,
    )
    .join(
      "",
    )}</div><div class="tools-grid" style="margin-top:12px"><button class="tool-card" data-action="bring-front">${ico("bring-to-front")}Para frente</button><button class="tool-card" data-action="send-back">${ico("send-to-back")}Para trás</button><button class="tool-card" data-action="duplicate-node">${ico("copy")}Duplicar</button><button class="tool-card" data-action="delete-node" style="color:#a76d62">${ico("trash-2")}Excluir</button></div></section>`;
}
function updateUndoButtons() {
  if (!$("#undo-btn")) return;
  $("#undo-btn").disabled = !(S.history.get(current()?.id) || []).length;
  $("#redo-btn").disabled = !(S.future.get(current()?.id) || []).length;
}
function calcZoom() {
  const e = $("#canvas-area");
  if (!e) return 0.4;
  const css = getComputedStyle(e),
    width =
      e.clientWidth -
      parseFloat(css.paddingLeft) -
      parseFloat(css.paddingRight) -
      2,
    height =
      e.clientHeight -
      parseFloat(css.paddingTop) -
      parseFloat(css.paddingBottom) -
      2;
  const fit = Math.min(
    width / boardFormat(current()).width,
    height / boardFormat(current()).height,
  );
  return (
    S.zoom ||
    Math.max(
      0.1,
      Math.min(
        boardFormat(current()).width > boardFormat(current()).height ? 1 : 0.65,
        fit,
      ),
    )
  );
}
function fitImage(img, w, h) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  return { width: img.naturalWidth * s, height: img.naturalHeight * s };
}
function loadImage(src) {
  if (!src) return Promise.reject(new Error("Imagem não informada"));
  if (S.imageCache.has(src)) return S.imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(
      () => reject(new Error("A imagem demorou para responder")),
      25000,
    );
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error("Não foi possível carregar esta imagem"));
    };
    img.src = imageSrc(src);
  });
  S.imageCache.set(src, promise);
  promise.catch(() => S.imageCache.delete(src));
  return promise;
}
// Fabric.js owns rendering and controls; board models remain independent of the canvas.
function sceneOptions(n, interactive) {
  return {
    left: n.x,
    top: n.y,
    originX: "left",
    originY: "top",
    angle: n.rotation || 0,
    opacity: n.opacity ?? 1,
    visible: !n.hidden,
    selectable: interactive && !n.locked,
    evented: interactive,
    lockMovementX: !!n.locked,
    lockMovementY: !!n.locked,
    lockScalingFlip: true,
    lockSkewingX: true,
    lockSkewingY: true,
    hasControls: !n.locked,
    objectCaching: false,
    borderColor: brandProfile().primary,
    cornerColor: "#ffffff",
    cornerStrokeColor: brandProfile().primary,
    transparentCorners: false,
    cornerSize: 8,
    padding: 4,
    strokeWidth: 0,
    modelId: n.id,
  };
}
function slotGroup(n, children, interactive) {
  const slot = new fabric.Rect({
    left: 0,
    top: 0,
    width: n.width,
    height: n.height,
    fill: "transparent",
    strokeWidth: 0,
    objectCaching: false,
  });
  return new fabric.Group([slot, ...children], {
    ...sceneOptions(n, interactive),
    subTargetCheck: false,
    layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
  });
}
function textObject(text, n) {
  return new fabric.Textbox(text, {
    left: 0,
    top: 0,
    width: n.width,
    fontSize: n.fontSize,
    ...fabricTypography(n),
    underline: !!n.underline,
    fontStyle: n.fontStyle === "italic" ? "italic" : "normal",
    fill: n.fill,
    textAlign: n.align || "left",
    lineHeight: n.lineHeight || 1.1,
    strokeWidth: 0,
    objectCaching: false,
    splitByGrapheme: false,
    ...(n.shadowColor
      ? {
          shadow: new fabric.Shadow({
            color: n.shadowColor,
            blur: n.shadowBlur || 0,
            offsetY: n.shadowOffsetY || 0,
          }),
        }
      : {}),
  });
}
const svgShapeSources = new Map();
async function svgShapeSource(src) {
  if (!svgShapeSources.has(src)) {
    const pending = fetch(src).then((r) => {
      if (!r.ok) throw Error("Não foi possível carregar a forma SVG.");
      return r.text();
    });
    svgShapeSources.set(src, pending);
    pending.catch(() => svgShapeSources.delete(src));
  }
  return svgShapeSources.get(src);
}
async function sceneNode(n, interactive, failed) {
  if (n.type === "svg") {
    try {
      const result = await fabric.loadSVGFromString(
        await svgShapeSource(n.src),
      );
      const parts = result.objects.filter(Boolean);
      if (!parts.length) throw Error("SVG vazio");
      const paint = (o) => {
        o.set({ fill: n.fill, objectCaching: false });
        o.getObjects?.().forEach(paint);
      };
      parts.forEach(paint);
      const shape = fabric.util.groupSVGElements(parts, result.options);
      shape.set({
        left: 0,
        top: 0,
        scaleX: n.width / shape.width,
        scaleY: n.height / shape.height,
        objectCaching: false,
      });
      return slotGroup(n, [shape], interactive);
    } catch {
      failed.push(n.label);
      return slotGroup(
        n,
        [
          new fabric.Rect({
            left: 0,
            top: 0,
            width: n.width,
            height: n.height,
            fill: n.fill,
            objectCaching: false,
          }),
        ],
        interactive,
      );
    }
  }
  if (n.type === "text") {
    const text = textObject(n.text, n);
    if (n.role === "name") {
      while (text.fontSize > 18 && text.height > n.height)
        text.set({
          fontSize: text.fontSize - 1,
          charSpacing: (1000 * (n.letterSpacing || 0)) / (text.fontSize - 1),
        });
    }
    text.set("top", (n.height - text.height) / 2);
    return slotGroup(n, [text], interactive);
  }
  if (n.type === "price") {
    const parts = Number(n.value).toFixed(2).split("."),
      fs = n.fontSize || 218;
    const opts = {
      ...fabricTypography(n),
      fill: n.fill,
      strokeWidth: 0,
      objectCaching: false,
    };
    const cur = new fabric.FabricText("R$", { ...opts, fontSize: fs * 0.49 }),
      integer = new fabric.FabricText(parts[0], { ...opts, fontSize: fs }),
      cents = new fabric.FabricText("," + parts[1], {
        ...opts,
        fontSize: fs * 0.49,
      });
    const w = cur.width + integer.width + cents.width + 12,
      ht = integer.height,
      sc = Math.min(n.width / w, n.height / ht);
    cur.set({ left: 0, top: (ht - cur.height) / 2 });
    integer.set({ left: cur.width + 5, top: 0 });
    cents.set({
      left: cur.width + integer.width + 7,
      top: (ht - cents.height) / 2,
    });
    const price = new fabric.Group([cur, integer, cents], {
        left: n.align === 'left'
            ? 0
            : n.align === 'right'
            ? n.width - w * sc
            : (n.width - w * sc) / 2,
      top: (n.height - ht * sc) / 2,
      scaleX: sc,
      scaleY: sc,
      strokeWidth: 0,
      objectCaching: false,
    });
    return slotGroup(n, [price], interactive);
  }
  if (n.type === "discount") {
    const fs = n.fontSize || 218,
      opts = {
        ...fabricTypography(n),
        fill: n.fill,
        strokeWidth: 0,
        objectCaching: false,
      };
    const number = new fabric.FabricText(String(n.value), {
        ...opts,
        fontSize: fs,
      }),
      percent = new fabric.FabricText("%", { ...opts, fontSize: fs * 0.63 }),
      off = new fabric.FabricText("OFF", { ...opts, fontSize: fs * 0.29 }),
      prefix = n.upTo
        ? new fabric.FabricText("com\naté", {
            ...opts,
            fontSize: fs * 0.25,
            lineHeight: 0.82,
            textAlign: "right",
          })
        : null;
    const prefixWidth = prefix ? prefix.width + 12 : 0,
      height = number.height,
      columnLeft = prefixWidth + number.width + 5;
    number.set({ left: prefixWidth, top: 0 });
    percent.set({ left: columnLeft, top: 0 });
    off.set({
      left: columnLeft + (percent.width - off.width) / 2,
      top: Math.min(height - off.height, percent.height * 0.82),
    });
    if (prefix) prefix.set({ left: 0, top: (height - prefix.height) / 2 });
    const width = columnLeft + Math.max(percent.width, off.width),
      scale = Math.min(n.width / width, n.height / height),
      children = [...(prefix ? [prefix] : []), number, percent, off];
    const graphic = new fabric.Group(children, {
      left: (n.width - width * scale) / 2,
      top: (n.height - height * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      strokeWidth: 0,
      objectCaching: false,
    });
    return slotGroup(n, [graphic], interactive);
  }
  if (n.type === "rect") {
    const r = Math.min(n.cornerRadius || 0, n.width / 2, n.height / 2);
    if (n.role === "priceBand") {
      return new fabric.Path(
        `M 0 0 H ${n.width - r} Q ${n.width} 0 ${n.width} ${r} V ${n.height - r} Q ${n.width} ${n.height} ${n.width - r} ${n.height} H 0 Z`,
        { ...sceneOptions(n, interactive), fill: n.fill },
      );
    }
    return new fabric.Rect({
      ...sceneOptions(n, interactive),
      width: n.width,
      height: n.height,
      rx: r,
      ry: r,
      fill: n.fill,
    });
  }
  if (n.type === "circle")
    return new fabric.Ellipse({
      ...sceneOptions(n, interactive),
      rx: n.width / 2,
      ry: n.height / 2,
      fill: n.fill,
    });
  if (n.type === "image") {
    let children;
    try {
      const img = await loadImage(n.src),
        size = fitImage(img, n.width, n.height);
      children = [
        new fabric.FabricImage(img, {
          left: (n.width - size.width) / 2,
          top: (n.height - size.height) / 2,
          scaleX: size.width / img.naturalWidth,
          scaleY: size.height / img.naturalHeight,
          flipX: !!n.flipX,
          strokeWidth: 0,
          objectCaching: false,
        }),
      ];
    } catch {
      failed.push(n.label);
      children = [
        new fabric.Rect({
          left: 0,
          top: 0,
          width: n.width,
          height: n.height,
          fill: "#ffffff10",
          stroke: "#ffffff55",
          strokeDashArray: [8, 6],
          strokeWidth: 1,
          rx: 12,
          ry: 12,
        }),
        new fabric.Textbox("Imagem indisponível\nClique para substituir", {
          left: 10,
          top: n.height / 2 - 30,
          width: n.width - 20,
          fontSize: 22,
          textAlign: "center",
          fill: "#ffffffbb",
          strokeWidth: 0,
        }),
      ];
    }
    return slotGroup(n, children, interactive);
  }
}
function decorateDesignSections(container) {
  const keys = ["product", "offer", "selection", "style", "images", "actions"];
  [...container.children]
    .filter((el) => el.classList.contains("property-section"))
    .forEach((section, index) => {
      const key = keys[index] || "section-" + index,
        details = document.createElement("details"),
        summary = document.createElement("summary"),
        body = document.createElement("div");
      details.className = section.className + " design-section";
      details.dataset.designSection = key;
      details.open = S.designSections[key] ?? true;
      let heading = section.querySelector(":scope > h3");
      if (!heading) {
        heading = document.createElement("h3");
        heading.textContent = "Ações do criativo";
      }
      const buttons = [...heading.querySelectorAll("button")];
      buttons.forEach((button) => {
        button.classList.add("section-close");
        section.prepend(button);
      });
      heading.remove();
      summary.append(heading);
      body.className = "design-section-content";
      while (section.firstChild) body.append(section.firstChild);
      details.append(summary, body);
      details.addEventListener("toggle", () => {
        S.designSections[key] = details.open;
      });
      section.replaceWith(details);
    });
}
function scaleProductNodes(images, factor) {
  const bounds = images.map(nodeBounds),
    cx =
      (Math.min(...bounds.map((b) => b.left)) +
        Math.max(...bounds.map((b) => b.right))) /
      2,
    cy =
      (Math.min(...bounds.map((b) => b.top)) +
        Math.max(...bounds.map((b) => b.bottom))) /
      2;
  for (const n of images) {
    n.x = cx + (n.x - cx) * factor;
    n.y = cy + (n.y - cy) * factor;
    n.width *= factor;
    n.height *= factor;
  }
}
function setProductScale(value, record = true) {
  const b = current(),
    percent = Number(value);
  if (!b || !Number.isFinite(percent) || percent < 25 || percent > 250) return;
  const images = b.nodes.filter((n) => n.role === "productImage");
  if (!images.length || Math.abs((b.imageScale ?? 100) - percent) < 0.0001)
    return;
  if (record) snapshot(b);
  const factor = percent / (b.imageScale ?? 100);
  spacingRequests.set(b, (spacingRequests.get(b) || 0) + 1);
  scaleProductNodes(images, factor);
  b.imageScale = percent;
  if (images.length > 1) b.imageSpacing = (b.imageSpacing ?? 20) * factor;
  b.preview = null;
  $$("[data-product-scale]").forEach((el) => {
    if (el !== document.activeElement) el.value = percent;
  });
  $$("[data-image-spacing]").forEach((el) => {
    el.min = -Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)));
    el.max = Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)));
    el.value = Math.round((b.imageSpacing ?? 20) * 100) / 100;
  });
  drawStage();
}
// Redraw text layout during scaling, cancelling unequal outer scale on the glyphs.
function previewTextResize(object, node, parentScaleX = 1, parentScaleY = 1) {
  const text = object.getObjects?.().find((child) => child.isType?.("Textbox"));
  if (!text) return;
  const sx = Math.abs(object.scaleX * parentScaleX),
    sy = Math.abs(object.scaleY * parentScaleY);
  if (sx < 0.001 || sy < 0.001) return;
  const width = Math.max(5, node.width * sx),
    height = Math.max(5, node.height * sy);
  let fontSize = Math.max(8, node.fontSize * sy);
  text.set({
    width,
    fontSize,
    charSpacing: (1000 * (node.letterSpacing || 0)) / fontSize,
    scaleX: 1 / sx,
    scaleY: 1 / sy,
  });
  text.initDimensions();
  if (node.role === "name") {
    while (fontSize > 18 && text.height > height) {
      fontSize--;
      text.set({
        fontSize,
        charSpacing: (1000 * (node.letterSpacing || 0)) / fontSize,
      });
      text.initDimensions();
    }
  }
  text.set({
    left: -node.width / 2,
    top: -node.height / 2 + (height - text.height) / (2 * sy),
  });
  text.setCoords();
  object.dirty = true;
  return { width, height, fontSize };
}
function bindSceneEvents(st, b) {
  const syncSelection = () => {
    if (st.restoringSelection || st.disposed || stage !== st || current() !== b)
      return;
    setModelSelection(
      st
        .getActiveObjects()
        .map((o) => o.modelId)
        .filter(Boolean),
    );
    const active = st.getActiveObject();
    if (active?.isType("ActiveSelection")) {
      active.set({
        borderColor: "#89ad52",
        cornerColor: "#ffffff",
        cornerStrokeColor: brandProfile().primary,
        transparentCorners: false,
        cornerSize: 8,
        lockScalingFlip: true,
        lockSkewingX: true,
        lockSkewingY: true,
      });
      active.setControlsVisibility({
        ml: false,
        mr: false,
        mt: false,
        mb: false,
      });
    }
    renderProperties();
  };
  st.on("selection:created", syncSelection);
  st.on("selection:updated", syncSelection);
  st.on("selection:cleared", syncSelection);
  st.on("object:moving", ({ target: o }) => {
    if (!S.guides) return;
    const n = b.nodes.find((n) => n.id === o.modelId);
    if (!n) return;
    const x = (boardFormat(b).width - n.width * Math.abs(o.scaleX)) / 2,
      y = (boardFormat(b).height - n.height * Math.abs(o.scaleY)) / 2;
    if (Math.abs(o.left - x) < 7) o.set("left", x);
    if (Math.abs(o.top - y) < 7) o.set("top", y);
  });
  st.on("object:scaling", ({ target, transform }) => {
    const objects = target.isType("ActiveSelection")
        ? target.getObjects()
        : [target],
      px = target.isType("ActiveSelection") ? target.scaleX : 1,
      py = target.isType("ActiveSelection") ? target.scaleY : 1;
    for (const object of objects) {
      const n = b.nodes.find((n) => n.id === object.modelId);
      if (n?.type === "text") {
        const preview = previewTextResize(object, n, px, py);
        if (preview && S.selectedNode === n.id) {
          for (const [key, value] of Object.entries(preview)) {
            const input = $(`[data-node="${key}"]`);
            if (input && input !== document.activeElement)
              input.value = Math.round(value);
          }
        }
      }
    }
    st.requestRenderAll();
  });
  st.on("object:modified", ({ target: o }) => {
    if (st.pendingCommit) return;
    st.pendingCommit = true;
    queueMicrotask(() => {
      if (st.disposed || stage !== st || current() !== b) return;
      snapshot(b);
      const objects = o.isType("ActiveSelection") ? [...o.getObjects()] : [o],
        ids = objects.map((o) => o.modelId).filter(Boolean);
      // Releasing an ActiveSelection converts its children back to artboard coordinates.
      st.restoringSelection = true;
      try {
        st.discardActiveObject();
      } finally {
        st.restoringSelection = false;
      }
      for (const object of objects) {
        const n = b.nodes.find((n) => n.id === object.modelId);
        if (!n || n.locked) continue;
        n.x = object.left;
        n.y = object.top;
        n.width = Math.max(5, n.width * Math.abs(object.scaleX));
        n.height = Math.max(5, n.height * Math.abs(object.scaleY));
        if (n.type === "text")
          n.fontSize = Math.max(8, n.fontSize * Math.abs(object.scaleY));
        n.rotation = object.angle;
      }
      setModelSelection(ids);
      b.preview = null;
      drawStage();
      renderProperties();
    });
  });
  st.on("mouse:dblclick", ({ target: o }) => {
    const n = b.nodes.find((n) => n.id === o?.modelId);
    if (!n || n.locked) return;
    selectNode(n.id);
    if (n.type === "image") openImagePicker(n.id);
    else {
      S.tab = "design";
      renderProperties();
      const el =
        n.type === "discount"
          ? $('[data-mechanic="percentage"]')
          : $(`[data-node="${n.type === "price" ? "value" : "text"}"]`);
      el?.focus();
      el?.select();
    }
  });
}
async function createScene(container, b, scale, interactive = false) {
  const host =
      typeof container === "string"
        ? document.getElementById(container)
        : container,
    canvas = document.createElement("canvas");
  host.replaceChildren(canvas);
  const CanvasClass = interactive
    ? class extends fabric.Canvas {
        getRetinaScaling() {
          return Math.max(2, super.getRetinaScaling());
        }
      }
    : fabric.StaticCanvas;
  const st = new CanvasClass(canvas, {
    width: boardFormat(b).width * scale,
    height: boardFormat(b).height * scale,
    enableRetinaScaling: interactive,
    renderOnAddRemove: false,
    selection: interactive,
    selectionKey: ["shiftKey", "ctrlKey", "metaKey"],
    selectionFullyContained: false,
    selectionColor: brandProfile().primary + "25",
    selectionBorderColor: brandProfile().primary,
    uniformScaling: true,
    uniScaleKey: "none",
    preserveObjectStacking: true,
  });
  st.getContext().imageSmoothingQuality = "high";
  if (st.contextTop) st.contextTop.imageSmoothingQuality = "high";
  st.boardId = b.id;
  st.sceneReady = false;
  st.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  st.backgroundColor = b.theme.gradient
    ? new fabric.Gradient({
        type: "linear",
        gradientUnits: "pixels",
        coords: { x1: 0, y1: 0, x2: 0, y2: boardFormat(b).height },
        colorStops: [
          { offset: 0, color: b.theme.background },
          { offset: 1, color: b.theme.backgroundEnd },
        ],
      })
    : b.theme.background;
  if (
    b.format === "panoramic" &&
    (!b.theme.backgroundMode || b.theme.backgroundMode === "template")
  ) {
    const cfg = bannerPresets(b.brand || S.brand).backgroundPanels.panoramic,
      panel = new fabric.Rect({
        left: cfg.x,
        top: cfg.y,
        width: cfg.width,
        height: cfg.height,
        rx: cfg.radius,
        ry: cfg.radius,
        fill: st.backgroundColor,
        selectable: false,
        evented: false,
        objectCaching: false,
      });
    st.backgroundColor = cfg.outsideColor;
    st.add(panel);
  }
  const failed = [];
  const fonts = loadCreativeFonts();
  const ready = Promise.all([fonts, addSceneBackground(st, b, failed)])
    .then(() =>
      Promise.all(b.nodes.map((n) => sceneNode(n, interactive, failed))),
    )
    .then((nodes) => {
      if (st.disposed || st.destroyed) return;
      nodes.filter(Boolean).forEach((o) => st.add(o));
      if (interactive && S.guides) {
        for (const points of [
          [
            boardFormat(b).width / 2,
            0,
            boardFormat(b).width / 2,
            boardFormat(b).height,
          ],
          [
            0,
            boardFormat(b).height / 2,
            boardFormat(b).width,
            boardFormat(b).height / 2,
          ],
        ])
          st.add(
            new fabric.Line(points, {
              stroke: "#c6f36b",
              strokeWidth: 1,
              opacity: 0.6,
              strokeDashArray: [7, 7],
              selectable: false,
              evented: false,
              excludeFromExport: true,
            }),
          );
      }
      if (interactive) bindSceneEvents(st, b);
      st.sceneReady = true;
      st.renderAll();
    });
  return { stage: st, ready, failed };
}
async function drawStage() {
  if (!$("#fabric-container") || !current()) return;
  const version = ++stageVersion;
  const previousStage = stage;
  stage = null;
  previousStage?.dispose();
  const b = current(),
    zoom = calcZoom();
  const wrap = $("#artboard-wrapper");
  wrap.style.width = boardFormat(b).width * zoom + "px";
  wrap.style.height = boardFormat(b).height * zoom + "px";
  $("#zoom-label").textContent = Math.round(zoom * 100) + "%";
  $("#canvas-caption").textContent =
    String(S.active + 1).padStart(2, "0") + " · " + b.product.name;
  const r = await createScene("fabric-container", b, zoom, true);
  if (version !== stageVersion) {
    r.stage.dispose();
    return;
  }
  stage = r.stage;
  updateUndoButtons();
  await r.ready;
  if (version !== stageVersion) return;
  selectNodes(S.selectedNodes, false);
  updatePreview(b);
}
function setModelSelection(ids) {
  S.selectedNodes = [...new Set(ids)];
  S.selectedNode = S.selectedNodes.length === 1 ? S.selectedNodes[0] : null;
}
function clearModelSelection() {
  setModelSelection([]);
}
function selectedModels() {
  return (current()?.nodes || []).filter(
    (n) => S.selectedNodes.includes(n.id) && !n.locked && !n.hidden,
  );
}
function selectionControls() {
  const count = selectedModels().length;
  return `<section class="property-section multi-properties"><h3>${count} elementos selecionados <button class="icon-btn" data-action="deselect" title="Limpar seleção">${ico("x")}</button></h3><p class="hint">Shift + clique para incluir ou remover. Arraste a seleção para mover todos.</p><label class="field"><span>Alinhar em relação à</span><select id="align-reference" aria-label="Referência do alinhamento"><option value="selection" ${S.alignReference === "selection" ? "selected" : ""}>Seleção</option><option value="artboard" ${S.alignReference === "artboard" ? "selected" : ""}>Prancheta</option></select></label><div class="align-buttons">${[
    ["left", "align-start-vertical", "Alinhar à esquerda"],
    ["center", "align-center-vertical", "Alinhar ao centro horizontal"],
    ["right", "align-end-vertical", "Alinhar à direita"],
    ["top", "align-start-horizontal", "Alinhar ao topo"],
    ["middle", "align-center-horizontal", "Alinhar ao centro vertical"],
    ["bottom", "align-end-horizontal", "Alinhar à base"],
  ]
    .map(
      ([v, i, t]) =>
        `<button class="icon-btn" data-action="align-selection" data-value="${v}" title="${t}">${ico(i)}</button>`,
    )
    .join(
      "",
    )}</div><h3 style="margin-top:17px">Distribuir espaçamento</h3><div class="tools-grid"><button class="tool-card" data-action="distribute-selection" data-axis="x" ${count < 3 ? "disabled" : ""} title="Distribuir horizontalmente">${ico("align-horizontal-space-around")}Horizontal</button><button class="tool-card" data-action="distribute-selection" data-axis="y" ${count < 3 ? "disabled" : ""} title="Distribuir verticalmente">${ico("align-vertical-space-around")}Vertical</button></div><p class="hint">Distribuição iguala os espaços entre três ou mais elementos e mantém os extremos.</p><div class="tools-grid" style="margin-top:12px"><button class="tool-card" data-action="selection-front">${ico("bring-to-front")}Para frente</button><button class="tool-card" data-action="selection-back">${ico("send-to-back")}Para trás</button><button class="tool-card" data-action="selection-duplicate">${ico("copy")}Duplicar</button><button class="tool-card" data-action="delete-node">${ico("trash-2")}Excluir</button></div><button class="btn small" data-action="deselect" style="width:100%;margin-top:12px">Limpar seleção</button></section>`;
}
// Bounds in artboard coordinates, including rotated elements.
function nodeBounds(n) {
  const a = ((n.rotation || 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const points = [
    [0, 0],
    [n.width, 0],
    [0, n.height],
    [n.width, n.height],
  ].map(([x, y]) => ({ x: n.x + x * c - y * s, y: n.y + x * s + y * c }));
  const left = Math.min(...points.map((p) => p.x)),
    top = Math.min(...points.map((p) => p.y)),
    right = Math.max(...points.map((p) => p.x)),
    bottom = Math.max(...points.map((p) => p.y));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}
function alignSelection(direction) {
  const nodes = selectedModels();
  if (nodes.length < 2) return;
  const boxes = nodes.map(nodeBounds);
  const bounds =
    S.alignReference === "artboard"
      ? {
          left: 0,
          top: 0,
          right: boardFormat(current()).width,
          bottom: boardFormat(current()).height,
        }
      : {
          left: Math.min(...boxes.map((b) => b.left)),
          top: Math.min(...boxes.map((b) => b.top)),
          right: Math.max(...boxes.map((b) => b.right)),
          bottom: Math.max(...boxes.map((b) => b.bottom)),
        };
  snapshot();
  nodes.forEach((n, i) => {
    const b = boxes[i];
    if (direction === "left") n.x += bounds.left - b.left;
    if (direction === "center")
      n.x += (bounds.left + bounds.right - b.left - b.right) / 2;
    if (direction === "right") n.x += bounds.right - b.right;
    if (direction === "top") n.y += bounds.top - b.top;
    if (direction === "middle")
      n.y += (bounds.top + bounds.bottom - b.top - b.bottom) / 2;
    if (direction === "bottom") n.y += bounds.bottom - b.bottom;
  });
  current().preview = null;
  drawStage();
  renderProperties();
}
function distributeSelection(axis) {
  const nodes = selectedModels();
  if (nodes.length < 3) return;
  const key = axis === "x" ? "left" : "top",
    size = axis === "x" ? "width" : "height",
    end = axis === "x" ? "right" : "bottom";
  const items = nodes
    .map((n) => ({ n, b: nodeBounds(n) }))
    .sort((a, b) => a.b[key] - b.b[key]);
  const first = items[0].b[key],
    last = items.at(-1).b[end],
    gap =
      (last - first - items.reduce((sum, item) => sum + item.b[size], 0)) /
      (items.length - 1);
  snapshot();
  let position = first;
  items.forEach(({ n, b }, i) => {
    if (i > 0 && i < items.length - 1) n[axis] += position - b[key];
    position += b[size] + gap;
  });
  current().preview = null;
  drawStage();
  renderProperties();
}
function changeSelectionOrder(front) {
  const b = current(),
    ids = new Set(selectedModels().map((n) => n.id));
  if (!ids.size) return;
  snapshot();
  const selected = b.nodes.filter((n) => ids.has(n.id)),
    others = b.nodes.filter((n) => !ids.has(n.id));
  b.nodes = front ? [...others, ...selected] : [...selected, ...others];
  b.preview = null;
  drawStage();
  renderProperties();
}
function duplicateSelection() {
  const nodes = selectedModels();
  if (!nodes.length) return;
  snapshot();
  const copies = nodes.map((n) => {
    const copy = {
      ...n,
      id: uid(),
      x: n.x + 20,
      y: n.y + 20,
      label: n.label + " (cópia)",
    };
    delete copy.role;
    return copy;
  });
  current().nodes.push(...copies);
  setModelSelection(copies.map((n) => n.id));
  current().preview = null;
  drawStage();
  renderProperties();
}
function deleteSelection() {
  const ids = new Set(selectedModels().map((n) => n.id));
  if (!ids.size) return;
  snapshot();
  current().nodes = current().nodes.filter((n) => !ids.has(n.id));
  current().preview = null;
  clearModelSelection();
  drawStage();
  renderProperties();
}
function selectAllNodes() {
  selectNodes(
    (current()?.nodes || [])
      .filter((n) => !n.locked && !n.hidden)
      .map((n) => n.id),
  );
}
function selectNodes(ids, properties = true) {
  setModelSelection(
    ids.filter((id) =>
      current()?.nodes.some((n) => n.id === id && !n.locked && !n.hidden),
    ),
  );
  if (stage?.getActiveObjects && stage.sceneReady && !stage.disposed) {
    stage.restoringSelection = true;
    try {
      stage.discardActiveObject();
      const objects = stage
        .getObjects()
        .filter(
          (o) =>
            S.selectedNodes.includes(o.modelId) && o.selectable && o.visible,
        );
      if (objects.length === 1) stage.setActiveObject(objects[0]);
      else if (objects.length > 1) {
        const selection = new fabric.ActiveSelection(objects, {
          canvas: stage,
          borderColor: "#89ad52",
          cornerColor: "#ffffff",
          cornerStrokeColor: brandProfile().primary,
          transparentCorners: false,
          cornerSize: 8,
          padding: 4,
          lockScalingFlip: true,
          lockSkewingX: true,
          lockSkewingY: true,
        });
        selection.setControlsVisibility({
          ml: false,
          mr: false,
          mt: false,
          mb: false,
        });
        stage.setActiveObject(selection);
      }
      stage.requestRenderAll();
    } finally {
      stage.restoringSelection = false;
    }
  }
  if (properties) renderProperties();
}
function selectNode(id, properties = true, additive = false) {
  let ids = id ? [id] : [];
  if (id && additive)
    ids = S.selectedNodes.includes(id)
      ? S.selectedNodes.filter((x) => x !== id)
      : [...S.selectedNodes, id];
  selectNodes(ids, properties);
}
function updatePreview(b = current()) {
  if (
    !stage ||
    b !== current() ||
    stage.boardId !== b.id ||
    !stage.sceneReady ||
    stage.disposed
  )
    return;
  try {
    b.preview = stage.toDataURL({
      format: "png",
      multiplier: 0.22 / stage.getZoom(),
      filter: (o) => !o.excludeFromExport,
    });
    const el = $("#mini-" + b.id);
    if (el) el.src = b.preview;
  } catch {}
}
async function generatePreview(b) {
  if (b.preview) return b.preview;
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0";
  document.body.append(container);
  let r;
  try {
    r = await createScene(container, b, 0.2, false);
    await r.ready;
    b.preview = r.stage.toDataURL({ format: "png", multiplier: 1 });
  } finally {
    await r?.stage.dispose();
    container.remove();
  }
  return b.preview;
}
function render() {
  if (document.documentElement) {
    document.documentElement.dataset.brand = S.brand;
    document.documentElement.style?.setProperty(
      "--brand-primary",
      brandProfile().primary,
    );
    document.documentElement.style?.setProperty(
      "--brand-primary-hover",
      brandProfile().primaryHover,
    );
  }
  const favicon = $('link[rel="icon"]');
  if (favicon) favicon.href = brandProfile().icon;
  if (!supportsPaid() && S.workspace === "paid") S.workspace = "site";
  if (S.workspace === "paid" && window.PaidMedia) {
    stageVersion++;
    const old = stage;
    stage = null;
    old?.dispose();
    window.PaidMedia.render();
    return;
  }
  window.PaidMedia?.dispose();
  if (S.view !== "editor") {
    stageVersion++;
    const previousStage = stage;
    stage = null;
    previousStage?.dispose();
    $("#app").innerHTML = shell(
      S.view === "import"
        ? importView()
        : S.view === "formats"
          ? formatsView()
          : productsView(),
    );
    if (S.view === "products") updateProducts();
  } else {
    $("#app").innerHTML = editorView();
    renderBoardList();
    renderProperties();
    requestAnimationFrame(() => drawStage());
  }
  icons();
}
window.renderBannerWorkspace = () => render();
function campaignTitle(filename) {
  const name = String(filename || "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.(xlsx?|csv|tsv)$/i, "");
  const cluster = name.match(/(?:^|[-_\s])cluster[-_\s]+(\d+)(?=[-_\s.]|$)/i),
    dated = name.match(
      /(?:^|[-_\s])(\d+)[-_\s]\d{2}[-_\s]\d{2}[-_\s]\d{4}(?=[-_\s.]|$)/,
    );
  const id = cluster?.[1] || dated?.[1];
  return id ? "Campanha " + id : "Campanha";
}
function useReport() {
  if (!S.sourcesDirty && S.report?.products.length) {
    S.view = "formats";
    render();
    return;
  }
  if (!S.catalogSource || !S.priceSource)
    return toast("Carregue as duas planilhas.");
  const data = OfferData.combine(S.catalogSource, S.priceSource);
  const apply = () => {
    S.report = data;
    S.title = campaignTitle(data.priceFilename);
    S.sourcesDirty = false;
    S.selected.clear();
    S.boards = [];
    S.history.clear();
    S.future.clear();
    clearModelSelection();
    S.cluster = data.clusters[0] || "";
    S.active = 0;
    S.boardQuery = "";
    S.tab = "design";
    S.zoom = 0;
    S.query = "";
    S.page = 1;
    S.view = data.products.length ? "formats" : "import";
    render();
    toast(
      data.products.length
        ? `${data.products.length} ofertas cruzadas pelo SKU.`
        : "Nenhuma oferta disponível. Confira as pendências abaixo.",
    );
  };
  if (S.boards.length) {
    openConfirm(
      "Atualizar as fontes?",
      "O novo cruzamento inicia outra sessão e substitui os criativos atuais. Exporte o que deseja manter antes de continuar.",
      apply,
    );
    return;
  }
  apply();
}
async function importSheet(file, kind) {
  if (!file) return;
  if (!["catalog", "prices"].includes(kind)) return;
  if (!/\.(xlsx|xls|csv|tsv)$/i.test(file.name)) {
    S.sourceErrors[kind] = "Escolha um arquivo Excel ou CSV.";
    render();
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    S.sourceErrors[kind] = "A planilha deve ter até 25 MB.";
    render();
    return;
  }
  S.sourceLoading[kind] = true;
  S.sourceErrors[kind] = "";
  render();
  try {
    const wb = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: false,
      }),
      minColumns = kind === "catalog" ? 20 : 26;
    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        defval: "",
        raw: true,
      }),
    })).filter((s) => s.rows.some((r) => r.length >= minColumns));
    if (!sheets.length)
      throw new Error(
        kind === "catalog"
          ? "A planilha de informações precisa chegar à coluna T."
          : "A planilha de preços precisa chegar à coluna Z.",
      );
    if (sheets.length > 1) {
      openSheetPicker(sheets, file.name, kind);
      return;
    }
    applyRows(sheets[0].rows, file.name, kind);
  } catch (e) {
    S.sourceErrors[kind] = e.message || "Não foi possível ler esta planilha.";
    toast(S.sourceErrors[kind]);
  } finally {
    S.sourceLoading[kind] = false;
    if (S.view === "import") render();
  }
}
function applyRows(rows, filename, kind) {
  const data =
    kind === "catalog"
      ? OfferData.parseCatalog(rows, filename)
      : OfferData.parsePrices(rows, filename);
  if (kind === "catalog" && !data.products.length)
    throw new Error(
      "Não há SKUs válidos sem conflitos nessa planilha de informações.",
    );
  if (kind === "prices" && !data.offers.length)
    throw new Error("Não há registros na planilha de preços.");
  if (kind === "catalog") S.catalogSource = data;
  else S.priceSource = data;
  S.sourceErrors[kind] = "";
  S.sourcesDirty = true;
  closeModal();
  if (S.view === "import") render();
  toast(
    `${kind === "catalog" ? "Informações dos produtos" : "Preços e mecânicas"} carregados.`,
  );
}
function startEditor() {
  const products = S.report.products.filter((p) => S.selected.has(p.id));
  if (!products.length) return;
  const old = new Map(
    S.boards
      .filter((b) => (b.format || "vertical") === S.format)
      .map((b) => [b.product.id, b]),
  );
  S.boards = products.map((p) => old.get(p.id) || makeBoard(p));
  S.active = Math.min(S.active, S.boards.length - 1);
  clearModelSelection();
  S.view = "editor";
  render();
}
const spacingRequests = new WeakMap();
function imageBounds(n, img) {
  if (!img) return nodeBounds(n);
  const fitted = fitImage(img, n.width, n.height),
    dx = (n.width - fitted.width) / 2,
    dy = (n.height - fitted.height) / 2,
    a = ((n.rotation || 0) * Math.PI) / 180;
  return nodeBounds({
    ...n,
    x: n.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: n.y + dx * Math.sin(a) + dy * Math.cos(a),
    width: fitted.width,
    height: fitted.height,
  });
}
function spaceImageNodes(images, gap, loaded) {
  const bounds = images.map((n, i) => imageBounds(n, loaded[i])),
    left = Math.min(...bounds.map((b) => b.left)),
    right = Math.max(...bounds.map((b) => b.right)),
    width =
      bounds.reduce((sum, b) => sum + b.width, 0) + gap * (images.length - 1);
  let cursor = (left + right - width) / 2;
  images.forEach((n, i) => {
    n.x += cursor - bounds[i].left;
    cursor += bounds[i].width + gap;
  });
}
async function setImageSpacing(value, record = true) {
  const b = current(),
    gap = Number(value);
  if (
    !b ||
    !Number.isFinite(gap) ||
    Math.abs(gap) > Math.max(300, Math.ceil(Math.abs(b.imageSpacing ?? 20)))
  )
    return;
  const images = b.nodes.filter((n) => n.role === "productImage");
  if (images.length < 2) return;
  if (IMAGE_LAYOUTS.some(([id]) => id === b.imageLayout)) {
    if (b.imageSpacing === gap) return;
    if (record) snapshot(b);
    spacingRequests.set(b, (spacingRequests.get(b) || 0) + 1);
    offsetLayoutImages(images, b.imageLayout, gap - (b.imageSpacing ?? 20));
    b.imageSpacing = gap;
    b.preview = null;
    if (current() === b) {
      $$("[data-image-spacing]").forEach((el) => {
        if (el !== document.activeElement) el.value = gap;
      });
      drawStage();
    }
    return;
  }
  const request = (spacingRequests.get(b) || 0) + 1;
  spacingRequests.set(b, request);
  const results = await Promise.allSettled(images.map((n) => loadImage(n.src)));
  if (
    spacingRequests.get(b) !== request ||
    !images.every((n) => b.nodes.includes(n))
  )
    return;
  const proposed = images.map((n) => ({ ...n }));
  spaceImageNodes(
    proposed,
    gap,
    results.map((r) => (r.status === "fulfilled" ? r.value : null)),
  );
  if (
    b.imageSpacing === gap &&
    proposed.every((n, i) => Math.abs(n.x - images[i].x) < 0.001)
  )
    return;
  if (record) snapshot(b);
  images.forEach((n, i) => (n.x = proposed[i].x));
  b.imageSpacing = gap;
  b.preview = null;
  if (current() === b) {
    $$("[data-image-spacing]").forEach((el) => {
      if (el !== document.activeElement) el.value = gap;
    });
    drawStage();
  }
}

function setImageCount(count) {
  const b = current();
  if (!b || ![1, 2, 3].includes(count)) return;
  let images = b.nodes.filter((n) => n.role === "productImage");
  if (images.length === count) {
    renderProperties();
    return;
  }
  const scale = b.imageScale ?? 100,
    spacing = b.imageSpacing ?? 20;
  snapshot();
  spacingRequests.set(b, (spacingRequests.get(b) || 0) + 1);
  while (images.length < count) {
    const n = {
      id: uid(),
      type: "image",
      role: "productImage",
      label: "Imagem " + (images.length + 1),
      src: b.product.image,
      x: 30,
      y: 606,
      width: 660,
      height: 435,
      rotation: 0,
      opacity: 1,
    };
    const at = b.nodes.findIndex((n) => n.role === "ctaBand");
    b.nodes.splice(at < 0 ? b.nodes.length : at, 0, n);
    images.push(n);
  }
  if (images.length > count) {
    const remove = images.slice(count).map((n) => n.id);
    b.nodes = b.nodes.filter((n) => !remove.includes(n.id));
    images = images.slice(0, count);
  }
  if (count > 1 && IMAGE_LAYOUTS.some(([id]) => id === b.imageLayout)) {
    setProductLayout(b.imageLayout, false);
    return;
  }
  b.imageScale = 100;
  const boxes = productBoxes(b.format || "vertical", count);
  images.forEach((n, i) => {
    [n.x, n.y, n.width, n.height] = boxes[i];
    n.label = "Imagem " + (i + 1);
    n.rotation = 0;
  });
  clearModelSelection();
  setProductScale(scale, false);
  b.imageSpacing = spacing;
  b.preview = null;
  drawStage();
  renderProperties();
  if (count > 1) setImageSpacing(spacing, false);
}

function addNode(type) {
  snapshot();
  let n = {
    id: uid(),
    type,
    label:
      type === "text"
        ? "Novo texto"
        : type === "rect"
          ? "Retângulo"
          : type === "circle"
            ? "Círculo"
            : "Imagem extra",
    x: 180,
    y: 580,
    width: 360,
    height: type === "text" ? 90 : 240,
    rotation: 0,
    opacity: 1,
    fill: "#c6f36b",
  };
  if (type === "text")
    Object.assign(n, {
      text: "Seu texto aqui",
      fontSize: 48,
      fontStyle: "normal",
      fontWeight: brandProfile().typography?.fontWeight || 700,
      fontFamily: brandProfile().creative?.fontFamily || "Cocogoose Pro",
      lineHeight: brandProfile().typography?.lineHeight ?? 1.1,
      letterSpacing: 0,
      align: "center",
    });
  if (type === "rect") n.cornerRadius = 15;
  n.x = (boardFormat(current()).width - n.width) / 2;
  n.y = (boardFormat(current()).height - n.height) / 2;
  current().nodes.push(n);
  setModelSelection([n.id]);
  S.tab = "design";
  drawStage();
  renderProperties();
}
function mutateNode(fn) {
  const n = nodeById();
  if (!n) return;
  snapshot();
  fn(n, current());
  drawStage();
  renderProperties();
  if (S.tab === "layers") renderProperties();
}
function openModal(content, narrow = false) {
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${narrow ? "narrow" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${content}</section></div>`;
  icons();
  const e = $("#modal-root button,#modal-root input");
  e?.focus();
}
function closeModal() {
  if (S.exporting) return;
  window.PaidMedia?.closeBackgrounds();
  $("#modal-root").innerHTML = "";
  S.modal = null;
  imageUploadCallback = null;
}
function openConfirm(title, text, callback) {
  S.modal = { type: "confirm", callback };
  openModal(
    `<header class="modal-header"><div><h2 id="modal-title">${h(title)}</h2><p>${h(text)}</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><footer class="modal-footer"><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm">Continuar</button></footer>`,
    true,
  );
}
function openSheetPicker(sheets, filename, kind) {
  S.modal = { type: "sheet", sheets, filename, kind };
  openModal(
    `<header class="modal-header"><div><h2 id="modal-title">Qual aba vamos usar?</h2><p>Sua planilha tem mais de uma aba.</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><div class="modal-content">${sheets.map((s, i) => `<button class="picker-product" data-action="choose-sheet" data-index="${i}">${ico("file-spreadsheet")}<span><strong>${h(s.name)}</strong><small>${s.rows.length} linhas</small></span>${ico("arrow-right")}</button>`).join("")}</div>`,
    true,
  );
}
function openImagePicker(id = null, mode = "image") {
  S.modal = {
    type: "image",
    id,
    mode,
    boardId: current()?.id,
    tab: mode === "background" ? "upload" : "products",
    query: "",
  };
  renderImagePicker();
}
function renderImagePicker() {
  const m = S.modal;
  const replace = m.mode === "product";
  openModal(
    `<header class="modal-header"><div><h2 id="modal-title">${replace ? "Trocar produto" : m.mode === "background" ? "Imagem de fundo" : m.id ? "Trocar imagem" : "Adicionar imagem"}</h2><p>${replace ? "Atualiza nome, preço e imagem. O estilo do criativo é mantido." : "Escolha uma imagem para este criativo."}</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><div class="modal-content">${
      replace
        ? ""
        : `<div class="modal-tabs">${(m.mode === "background"
            ? [
                ["upload", "Enviar arquivo"],
                ["url", "Por URL"],
              ]
            : [
                ["products", "Da planilha"],
                ["upload", "Enviar arquivo"],
                ["url", "Por URL"],
              ]
          )
            .map(
              ([v, l]) =>
                `<button class="${m.tab === v ? "active" : ""}" data-action="picker-tab" data-tab="${v}">${l}</button>`,
            )
            .join("")}</div>`
    }${m.tab === "products" ? `<label class="search">${ico("search")}<input id="picker-query" placeholder="Buscar produto por nome ou SKU" value="${h(m.query)}" aria-label="Buscar imagem de produto"></label><div class="picker-results" id="picker-results"></div>` : m.tab === "upload" ? `<div class="upload-image-zone">${ico("image-up")}<p>Envie uma imagem do seu computador.<br>PNG, JPG, WEBP, GIF, AVIF ou SVG · até 15 MB</p><button class="btn" data-action="upload-image">${ico("folder-open")}Escolher imagem</button></div>` : `<div class="url-entry"><label class="field"><span>Link direto da imagem</span><input type="url" id="image-url" placeholder="https://exemplo.com/produto.png"></label><button class="btn primary" data-action="use-image-url">${ico("link")}Usar esta imagem</button><p class="hint">Use uma URL pública que abra diretamente uma imagem.</p><div id="url-error" class="error"></div></div>`}</div><footer class="modal-footer"><small>${replace ? "Somente este criativo será atualizado." : "As outras imagens do criativo são mantidas."}</small><button class="btn small" data-action="close-modal">Cancelar</button></footer>`,
    true,
  );
  if (m.tab === "products") updatePickerResults();
}
function catalogImageOptions() {
  return S.catalogSource.products.flatMap((p) =>
    (p.images?.length ? p.images : [p.image]).map((image, i) => ({
      ...p,
      image,
      id: p.sku + "::" + i,
      imageIndex: i + 1,
    })),
  );
}
function updatePickerResults() {
  const m = S.modal,
    replace = m.mode === "product";
  const source = replace
    ? S.report.products.filter((p) => !S.cluster || p.cluster === S.cluster)
    : catalogImageOptions();
  const ps = source.filter(
    (p) =>
      !m.query ||
      norm(p.name + " " + p.sku + " " + p.category).includes(norm(m.query)),
  );
  $("#picker-results").innerHTML =
    ps
      .slice(0, 35)
      .map(
        (p) =>
          `<button class="picker-product" data-action="pick-product" data-id="${h(p.id)}">${thumb(p.image, "")}<span><strong>${h(p.name)}</strong><small>SKU ${h(p.sku)}${replace ? " · " + h(p.cluster) + " · " + h(offerTypeLabel(p)) : " · Imagem " + p.imageIndex}</small></span>${replace ? `<span class="price">${offerLabel(p)}</span>` : ""}</button>`,
      )
      .join("") || '<div class="empty">Nenhum produto encontrado.</div>';
  if (ps.length > 35)
    $("#picker-results").innerHTML +=
      '<p class="hint">Exibindo os primeiros 35 resultados. Refine sua busca.</p>';
  icons();
}
async function applyImage(src) {
  const modal = S.modal;
  if (!modal) return;
  try {
    await loadImage(src);
    if (S.modal !== modal || modal.boardId !== current()?.id) return;
    snapshot();
    const b = current();
    b.preview = null;
    if (modal.mode === "background") {
      b.theme = {
        ...b.theme,
        backgroundMode: "image",
        backgroundImage: src,
        backgroundFit: b.theme.backgroundFit || "cover",
      };
    } else if (modal.id) {
      const n = b.nodes.find((n) => n.id === modal.id);
      if (n) n.src = src;
    } else {
      const n = {
        id: uid(),
        type: "image",
        label: "Imagem extra",
        src,
        x: 180,
        y: 570,
        width: 360,
        height: 420,
        rotation: 0,
        opacity: 1,
      };
      b.nodes.push(n);
      setModelSelection([n.id]);
    }
    closeModal();
    drawStage();
    renderProperties();
    toast("Imagem atualizada.");
  } catch {
    const el = $("#url-error");
    if (el)
      el.textContent =
        "Não foi possível carregar a imagem. Confira o link ou envie o arquivo.";
    else
      toast("Não foi possível carregar essa imagem. Tente enviar um arquivo.");
  }
}
function replaceProduct(p) {
  const b = current();
  snapshot();
  const roles = mechanicRoles,
    previous = new Map(
      b.nodes.filter((n) => roles.has(n.role)).map((n) => [n.role, n]),
    );
  b.product = { ...p };
  b.offer = initialOffer(p);
  b.offerDrafts = {};
  b.nodes = b.nodes.filter((n) => !roles.has(n.role));
  const name = b.nodes.find((n) => n.role === "name");
  if (name) name.text = p.name;
  b.nodes
    .filter((n) => n.role === "productImage")
    .forEach((n) => (n.src = p.image));
  const additions = defaultNodes(p, initialOffer(p), b.format)
    .filter((n) => roles.has(n.role))
    .map((fresh) => {
      const old = previous.get(fresh.role);
      if (!old) return fresh;
      if (fresh.role === "price") old.value = p.price;
      if (fresh.role === "offerHeadline") old.text = fresh.text;
      if (fresh.role === "offerDiscount") {
        old.value = fresh.value;
        old.upTo = fresh.upTo;
      }
      return old;
    });
  const at = b.nodes.findIndex((n) => n.role === "productImage");
  b.nodes.splice(
    at < 0 ? b.nodes.length : at,
    0,
    ...additions.filter((n) => n.role !== "offerLegal"),
  );
  b.nodes.push(...additions.filter((n) => n.role === "offerLegal"));
  applyThemeToBoard(b, b.theme);
  b.preview = null;
  S.selected = new Set(S.boards.map((x) => x.product.id));
  clearModelSelection();
  closeModal();
  drawStage();
  renderProperties();
  renderBoardList();
  toast("Produto e mecânica atualizados neste criativo.");
}
async function openExport() {
  updatePreview();
  S.exportSelected = new Set(S.boards.map((b) => b.id));
  S.modal = { type: "export" };
  renderExport();
  for (const b of S.boards) {
    if (S.modal?.type !== "export") break;
    await generatePreview(b);
    const img = $("#export-preview-" + b.id);
    if (img) img.src = b.preview;
  }
}
function renderExport() {
  const n = S.exportSelected.size;
  openModal(
    `<header class="modal-header">
        <div>
            <div class="eyebrow" style="margin-bottom: 8px">PRONTOS PARA SAIR DO ESTÚDIO</div>
            <h2 id="modal-title">Exporte suas ofertas.</h2>
            <p>Escolha os criativos e o formato. Cada imagem sai nas dimensões originais do formato escolhido.</p>
        </div>
        <button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button>
    </header>
    <div class="modal-content">
        <div class="export-controls">
            <button class="btn small" data-action="export-toggle-all">
                ${ico(n === S.boards.length ? "square-check" : "square")}${n === S.boards.length ? "Desmarcar todos" :
                "Selecionar todos"}</button>
            <span class="muted tiny">${n} de ${S.boards.length} selecionados</span>
            <div class="spacer"></div>
            <label class="tiny muted" for="export-format">Formato</label>
            <select class="select" id="export-format">
  ${[
    ["png", "PNG"],
    ["jpg", "JPG"],
    ["webp", "WEBP"],
  ].map(([value, label]) =>
    `<option value="${value}" ${value === S.exportFormat ? "selected" : ""}>
      ${label}
    </option>`
  ).join("")}
</select>

${S.exportFormat !== "png" ? `
  <label class="tiny muted" for="export-quality">Qualidade</label>
  <select class="select" id="export-quality" style="min-width:80px">
    ${[
      [1, "100%"],
      [0.95, "95%"],
      [0.85, "85%"],
    ].map(([value, label]) =>
      `<option value="${value}" ${value === S.exportQuality ? "selected" : ""}>
        ${label}
      </option>`
    ).join("")}
  </select>
` : ""}

<label class="toggle-row">
  Incluir projeto editável
  <input type="checkbox" id="export-editable"
    ${S.includeEditableProject !== false ? "checked" : ""}>
</label>
</div>
<div class="export-grid">${S.boards.map((b, i) => `<article class="export-card ${S.exportSelected.has(b.id) ? "selected" : ""}" data-action="export-toggle" data-id="${b.id}" role="checkbox" tabindex="0" aria-checked="${S.exportSelected.has(b.id)}" aria-label="Exportar ${h(b.product.name)}"><div class="checkbox">${S.exportSelected.has(b.id) ? ico("check") : ""}</div><div class="export-card-preview"><img id="export-preview-${b.id}" src="${b.preview || "/assets/blank-preset.svg"}" alt="Prévia de ${h(b.product.name)}"></div><p>${h(b.product.name)}</p><small>${String(i + 1).padStart(2, "0")} · SKU ${h(b.product.sku)} · ${h(b.product.cluster)} · ${boardFormat(b).width} × ${boardFormat(b).height} px</small></article>`).join("")}</div><div id="export-error"></div><div id="export-progress"></div></div><footer class="modal-footer"><small>${n > 1 ? "Os criativos serão reunidos em um arquivo ZIP." : "Exportação no tamanho original do preset."}<br>Seus ajustes são aplicados individualmente.</small><button class="btn primary" data-action="download-export" id="download-export" ${!n ? "disabled" : ""}>${ico("download")}Exportar ${n} ${n === 1 ? "criativo" : "criativos"}</button></footer>`,
  );
  icons();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  $("#download-ready")?.remove();
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.id = "download-ready";
  a.className = "btn primary";
  a.style.textDecoration = "none";
  a.textContent = "Baixar arquivo";
  const footer = $("#modal-root .modal-footer");
  (footer || document.body).append(a);
  a.click();
  if (!footer) a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (a.isConnected) a.remove();
  }, 600000);
}
async function doExport() {
  if (S.exporting || !S.exportSelected.size) return;
  S.exporting = true;
  const btn = $("#download-export");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Preparando…';
  $$("#modal-root select,#modal-root [data-action]").forEach(
    (e) => (e.disabled = true),
  );
  const boards = S.boards.filter((b) => S.exportSelected.has(b.id)),
    zip = new JSZip(),
    fmt = S.exportFormat,
    type = fmt === "jpg" ? "image/jpeg" : "image/" + fmt;
  const includeProject = S.includeEditableProject !== false;
  const exportedBoards = [];
  const errors = [];
  let done = 0;
  try {
    await document.fonts.ready;
    for (const b of boards) {
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-10000px;top:0";
      document.body.append(container);
      let r;
      try {
        r = await createScene(container, b, 1, false);
        await r.ready;
        if (r.failed.length)
          throw new Error("Não carregou: " + r.failed.join(", "));
        const canvas = r.stage.toCanvasElement(1);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, type, S.exportQuality),
        );
        if (!blob) throw new Error("Falha ao gerar a imagem");
        if (blob.type !== type)
          throw new Error(
            "Seu navegador não suporta este formato. Escolha PNG ou JPG.",
          );
        const name = creativeFilename(b, fmt);
        done++;
        if (boards.length === 1 && !includeProject) {
          download(blob, name);
        } else {
          zip.file(name, blob);
        }

        exportedBoards.push(b);
        $("#export-progress").innerHTML =
          `<div class="export-progress"><div style="width:${((done + errors.length) / boards.length) * 100}%"></div></div><p class="hint">${done + errors.length} de ${boards.length} processados</p>`;
      } catch (e) {
        errors.push(b.product.name + ": " + e.message);
      } finally {
        await r?.stage.dispose();
        container.remove();
      }
    }
    if (done && (boards.length > 1 || includeProject)) {
      if (includeProject) {
        const project = {
          version: 1,
          workspace: 'site',
          brand: S.brand,
          title: S.title,
          boards: exportedBoards.map(({ preview, ...board }) => board),
        };

        const formatNames = new Set(
          exportedBoards.map(board =>
            board.format === 'vertical' ? 'Vertical' : boardFormat(board).name
          )
        );

        const formatName = formatNames.size === 1
          ? [...formatNames][0]
          : 'Formatos';

        zip.file(
          `${formatName} (Editável).json`,
          JSON.stringify(project, null, 2)
        );
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
      });

      const filename = norm(S.title).replace(/[^a-z0-9]+/g, '-');
      download(blob, `${filename}_${fmt}.zip`);
    }
    if (errors.length) {
      $("#export-error").innerHTML =
        `<div class="alert"><strong>${done} exportados. ${errors.length} criativos precisam de ajuste:</strong><br>${errors.map(h).join("<br>")}<br>Substitua as imagens indisponíveis e tente novamente.</div>`;
      toast("A exportação encontrou imagens indisponíveis.");
    } else
      toast(
        `${done} ${done === 1 ? "criativo exportado" : "criativos exportados"} em ${fmt.toUpperCase()}.`,
      );
  } catch (e) {
    $("#export-error").innerHTML = `<div class="alert">${h(e.message)}</div>`;
  } finally {
    S.exporting = false;
    $$("#modal-root select,#modal-root [data-action]").forEach(
      (e) => (e.disabled = false),
    );
    btn.innerHTML = ico("download") + "Exportar novamente";
    icons();
  }
}

async function openSavedProject(file) {
  try {
    let projectText;

    if (/\.json$/i.test(file.name)) {
      projectText = await file.text();
    } else {
      const zip = await JSZip.loadAsync(file);

      const entry =
        zip.file(/^[^/]+ \(Editável\)\.json$/i)[0] ??
        zip.file('projeto.json');

      if (!entry) {
        throw new Error('Este ZIP não contém um projeto editável.');
      }

      projectText = await entry.async('string');
    }

    const project = JSON.parse(projectText.replace(/^\uFEFF/, ''));
    const validId = id => typeof id === 'string' && /^[\w-]+$/.test(id);

    if (
      project?.version !== 1 ||
      project.workspace !== 'site' ||
      !Object.hasOwn(window.OFFER_BRANDS, project.brand) ||
      !Array.isArray(project.boards) ||
      !project.boards.length ||
      !project.boards.every(board =>
        board &&
        validId(board.id) &&
        board.brand === project.brand &&
        Object.hasOwn(FORMATS, board.format) &&
        board.product &&
        validId(board.product.id) &&
        typeof board.product.name === 'string' &&
        board.theme &&
        Array.isArray(board.nodes) &&
        board.nodes.every(node => node && validId(node.id))
      )
    ) {
      throw new Error('O arquivo de projeto é inválido ou incompatível.');
    }

    const restore = () => {
      if (S.brand !== project.brand) {
        switchBrand(project.brand);
        if (S.brand !== project.brand) return;
      }

      S.boards = project.boards.map(board => ({
        ...board,
        preview: null,
      }));

      const products = [...new Map(
        S.boards.map(board => [board.product.id, board.product])
      ).values()];

      const clusters = [...new Set(
        products.map(product => product.cluster).filter(Boolean)
      )];

      // Reconstrói a lista de produtos a partir do projeto salvo.
      S.report = {
        products,
        clusters,
        issues: [],
        duplicates: 0,
        skuCount: new Set(products.map(product => product.sku)).size,
        missingImages: products.filter(product => !product.image).length,
      };

      S.catalogSource = { products };
      S.priceSource = null;
      S.sourcesDirty = false;
      S.selected = new Set(products.map(product => product.id));

      S.title = typeof project.title === 'string'
        ? project.title
        : 'Projeto salvo';
      S.workspace = 'site';
      S.format = S.boards[0].format;
      S.active = 0;
      S.cluster = '';
      S.query = '';
      S.boardQuery = '';
      S.page = 1;
      S.zoom = 0;
      S.history = new Map();
      S.future = new Map();

      clearModelSelection();
      S.view = 'editor';
      render();
      toast('Projeto aberto.');
    };

    const targetBoards = project.brand === S.brand
      ? S.boards
      : brandSessions.get(project.brand)?.boards;

    if (targetBoards?.length) {
      openConfirm(
        'Abrir projeto salvo?',
        'O projeto substituirá os criativos abertos dessa bandeira.',
        restore
      );
    } else {
      restore();
    }
  } catch (error) {
    toast(error.message || 'Não foi possível abrir o projeto.');
  }
}

function showHelp() {
  S.modal = { type: "help" };
  openModal(
    `<header class="modal-header"><div><h2 id="modal-title">Da planilha à oferta.</h2><p>Um fluxo simples para criar em escala.</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><div class="modal-content">${[
      [
        "1",
        "Carregue as duas planilhas",
        "Informações: H = SKU, I = produto, T = imagem. Preços: I = SKU, H = tipo, K = varejo, N = fidelidade, T = Pague, U = Leve, Z = capa/cluster. Cruzamos os arquivos pelo SKU.",
      ],
      [
        "2",
        "Escolha formato e produtos",
        "Escolha Vertical (720 × 1281), Panorâmico (1512 × 720) ou Mini (720 × 288). Filtre pela capa/cluster e busque por nome ou SKU. Normal usa K e Club Koch usa N com selo. MercaPromo Pague e Leve usa as quantidades com selo e texto legal; Pague e Leve usa as mesmas quantidades e texto legal, sem selo. Selecione quantas ofertas quiser.",
      ],
      [
        "3",
        "Personalize cada criativo",
        "Clique em um elemento para editar. Arraste para mover, use as alças para redimensionar e o painel para ajustar textos, cores e posição. Use Shift + clique ou arraste no fundo para selecionar vários. Em Camadas, use as caixas de seleção, oculte ou bloqueie elementos. Com vários selecionados, alinhe e distribua pelo painel Design.",
      ],
      [
        "4",
        "Exporte em lote",
        "Confira as prévias, desmarque os criativos que não deseja e escolha PNG, JPG ou WEBP. Vários criativos são reunidos em um ZIP.",
      ],
    ]
      .map(
        ([n, t, p]) =>
          `<div class="help-step"><span class="num">${n}</span><div><strong>${t}</strong><p>${p}</p></div></div>`,
      )
      .join(
        "",
      )}<div class="alert">Os ajustes ficam nesta sessão enquanto a página estiver aberta. Fechar ou recarregar a página encerra a sessão. Exporte seus criativos antes de sair.</div><p class="hint">Atalhos: Ctrl/Cmd + Z para desfazer · Ctrl/Cmd + Shift + Z para refazer · Delete para excluir o elemento selecionado · Esc para fechar a seleção.</p></div>`,
    true,
  );
}
async function action(el, event) {
  const a = el.dataset.action;
  switch (a) {
    case "use-cluster-price": {
      const b = current();
      if (!b) break;

      const currentOffer = ensureOffer(b);
      if (currentOffer.model !== "price") break;

      const selectedOffer = otherClusterPrices(b).find(
        (p) => String(p.id) === el.dataset.id,
      );
      const priceNode = b.nodes.find((n) => n.role === "price");

      if (!selectedOffer || !priceNode) break;

      const showClub = selectedOffer.offerKind === "club";
      const priceChanged = priceNode.value !== selectedOffer.price;
      const badgeChanged = currentOffer.showClub !== showClub;

      if (!priceChanged && !badgeChanged) break;

      snapshot(b);

      if (priceChanged) {
        priceNode.value = selectedOffer.price;
        updateBoardPrice(b, selectedOffer.price);
      }

      if (badgeChanged) {
        currentOffer.showClub = showClub;
        syncOfferNodes(b);
        clearModelSelection();
      }

      b.preview = null;
      drawStage();
      renderBoardList();
      renderProperties();
      break;
    }
    case "switch-brand":
      switchBrand(el.dataset.brand);
      break;
    case "workspace-paid":
      if (!supportsPaid()) return;
      updatePreview();
      S.workspace = "paid";
      render();
      break;
    case "workspace-site":
      S.workspace = "site";
      render();
      break;
    case "nav-import":
      S.view = "import";
      render();
      break;
    case "upload-source":
      $(
        "#" +
          (el.dataset.source === "catalog" ? "catalog-file" : "prices-file"),
      ).click();
      break;
    case "use-source": {
      const kind = el.dataset.source;
      const data = kind === "catalog" ? S.preloadedCatalog : S.preloadedPrices;
      if (!data) return toast("O arquivo ainda não está disponível.");
      if (kind === "catalog") S.catalogSource = data;
      else S.priceSource = data;
      S.sourceErrors[kind] = "";
      S.sourcesDirty = true;
      render();
      break;
    }
    case "use-report":
      useReport();
      break;
    case "open-formats":
      if (S.sourcesDirty) {
        S.view = "import";
        render();
        toast("Cruze as duas fontes antes de escolher o formato.");
        break;
      }
      S.view = "formats";
      render();
      break;
    case "choose-format":
      if (S.sourcesDirty || !S.report?.products.length)
        return toast("Cruze as duas planilhas para continuar.");
      S.format = FORMATS[el.dataset.format] ? el.dataset.format : S.format;
      S.zoom = 0;
      S.view = "products";
      render();
      break;
    case "step": {
      const i = Number(el.dataset.index);
      if (i > 0 && S.sourcesDirty) {
        S.view = "import";
        render();
        return toast("Cruze as fontes atualizadas para continuar.");
      }
      if (i === 0) S.view = "import";
      if (i === 1) S.view = "formats";
      if (i === 2 && S.report) S.view = "products";
      render();
      break;
    }
    case "help":
      showHelp();
      break;
    case "toggle-product": {
      const id = el.dataset.id;
      if (S.selected.has(id)) S.selected.delete(id);
      else S.selected.add(id);
      updateProducts();
      break;
    }
    case "page-prev":
      S.page = Math.max(1, S.page - 1);
      updateProducts();
      break;
    case "page-next":
      S.page++;
      updateProducts();
      break;
    case "clear-selection":
      S.selected.clear();
      updateProducts();
      break;
    case "start-editor":
      startEditor();
      break;
    case "back-products":
      updatePreview();
      S.view = "products";
      render();
      break;
    case "switch-board":
      updatePreview();
      S.active = Number(el.dataset.index);
      clearModelSelection();
      renderBoardList();
      drawStage();
      renderProperties();
      break;
    case "property-tab":
      S.tab = el.dataset.tab;
      renderProperties();
      break;
    case "tab-design":
      S.tab = "design";
      renderProperties();
      break;
    case "select-node":
      selectNode(
        el.dataset.id,
        true,
        !!(event?.shiftKey || event?.ctrlKey || event?.metaKey),
      );
      break;
    case "toggle-node-selection":
      selectNode(el.dataset.id, true, true);
      break;
    case "select-all-nodes":
      selectAllNodes();
      break;
    case "align-selection":
      alignSelection(el.dataset.value);
      break;
    case "distribute-selection":
      distributeSelection(el.dataset.axis);
      break;
    case "selection-front":
      changeSelectionOrder(true);
      break;
    case "selection-back":
      changeSelectionOrder(false);
      break;
    case "selection-duplicate":
      duplicateSelection();
      break;
    case "deselect":
      selectNode(null);
      break;
    case "undo":
      historyGo("undo");
      break;
    case "redo":
      historyGo("redo");
      break;
    case "zoom-fit":
      S.zoom = 0;
      drawStage();
      break;
    case "zoom-in":
      S.zoom = Math.min(1.5, calcZoom() + 0.1);
      drawStage();
      break;
    case "zoom-out":
      S.zoom = Math.max(0.1, calcZoom() - 0.1);
      drawStage();
      break;
    case "toggle-guides":
      S.guides = !S.guides;
      el.classList.toggle("active", S.guides);
      drawStage();
      break;
    case "add-text":
      addNode("text");
      break;
    case "add-rect":
      addNode("rect");
      break;
    case "add-circle":
      addNode("circle");
      break;
    case "add-image":
      openImagePicker();
      break;
    case "replace-image":
      openImagePicker(el.dataset.id);
      break;
    case "replace-product":
      openImagePicker(null, "product");
      break;
    case "image-count":
      setImageCount(Number(el.dataset.count));
      break;
    case "image-layout":
      setProductLayout(el.dataset.layout);
      break;
    case "text-align":
      mutateNode((n) => (n.align = el.dataset.value));
      break;
    case "flip-image":
      mutateNode((n) => (n.flipX = !n.flipX));
      break;
    case "align-node":
      mutateNode((n) => {
        const v = el.dataset.value;
        if (v === "left") n.x = 0;
        if (v === "center") n.x = (boardFormat(current()).width - n.width) / 2;
        if (v === "right") n.x = boardFormat(current()).width - n.width;
        if (v === "top") n.y = 0;
        if (v === "middle")
          n.y = (boardFormat(current()).height - n.height) / 2;
        if (v === "bottom") n.y = boardFormat(current()).height - n.height;
      });
      break;
    case "bring-front":
      mutateNode((n, b) => {
        b.nodes = b.nodes.filter((x) => x.id !== n.id);
        b.nodes.push(n);
      });
      break;
    case "send-back":
      mutateNode((n, b) => {
        b.nodes = b.nodes.filter((x) => x.id !== n.id);
        b.nodes.unshift(n);
      });
      break;
    case "duplicate-node":
      mutateNode((n, b) => {
        const copy = {
          ...n,
          id: uid(),
          x: n.x + 20,
          y: n.y + 20,
          label: n.label + " (cópia)",
        };
        delete copy.role;
        b.nodes.push(copy);
        setModelSelection([copy.id]);
      });
      break;
    case "delete-node":
      deleteSelection();
      break;
    case "toggle-lock":
    case "toggle-visible": {
      const n = current().nodes.find((n) => n.id === el.dataset.id);
      if (!n) return;
      snapshot();
      if (a === "toggle-lock") n.locked = !n.locked;
      else n.hidden = !n.hidden;
      drawStage();
      renderProperties();
      break;
    }
    case "background-image":
      openImagePicker(null, "background");
      break;
    case "remove-background":
      if (current().theme.backgroundImage) {
        snapshot();
        current().theme = {
          ...current().theme,
          backgroundMode: "color",
          backgroundImage: "",
        };
        current().preview = null;
        drawStage();
        renderProperties();
      }
      break;
    case "apply-background-all":
      applyBackgroundToAll();
      break;
    case "apply-theme": {
      const theme = { ...current().theme };
      for (const b of S.boards) {
        if (b === current()) continue;
        snapshot(b);
        applyThemeToBoard(b, theme);
        b.preview = null;
      }
      toast("Estilo aplicado a todos os criativos.");
      break;
    }
    case "reset-layout":
      snapshot();
      current().nodes = defaultNodes(
        current().product,
        ensureOffer(current()),
        current().format,
      );
      current().offerDrafts = {};
      current().imageScale = 100;
      current().imageSpacing = 20;
      current().imageLayout = "original";
      current().theme = defaultTheme(current().format);
      clearModelSelection();
      drawStage();
      renderProperties();
      toast("Layout restaurado. Você pode desfazer.");
      break;
    case "close-modal":
      closeModal();
      break;
    case "confirm": {
      const callback = S.modal?.callback;
      closeModal();
      callback?.();
      break;
    }
    case "choose-sheet": {
      const m = S.modal;
      try {
        applyRows(m.sheets[Number(el.dataset.index)].rows, m.filename, m.kind);
      } catch (e) {
        toast(e.message);
      }
      break;
    }
    case "picker-tab":
      S.modal.tab = el.dataset.tab;
      renderImagePicker();
      break;
    case "pick-product": {
      if (S.modal.mode === "product") {
        const p = S.report.products.find((x) => x.id === el.dataset.id);
        if (p) replaceProduct(p);
      } else {
        const p = catalogImageOptions().find((x) => x.id === el.dataset.id);
        if (p) applyImage(p.image);
      }
      break;
    }
    case "upload-image":
      $("#image-file").click();
      break;
    case "use-image-url": {
      const url = $("#image-url").value.trim();
      try {
        const u = new URL(url);
        if (!["https:", "http:"].includes(u.protocol)) throw new Error();
        $("#url-error").innerHTML =
          '<span class="spinner"></span>Carregando imagem…';
        await applyImage(url);
      } catch {
        $("#url-error").textContent =
          "Cole um link de imagem começando com https:// ou http://.";
      }
      break;
    }
    case "export":
      openExport();
      break;
    case "export-toggle": {
      const id = el.dataset.id;
      if (S.exportSelected.has(id)) S.exportSelected.delete(id);
      else S.exportSelected.add(id);
      renderExport();
      break;
    }
    case "export-toggle-all":
      if (S.exportSelected.size === S.boards.length) S.exportSelected.clear();
      else S.exportSelected = new Set(S.boards.map((b) => b.id));
      renderExport();
      break;
    case "download-export":
      doExport();
      break;
  }
  
}
function applyThemeToBoard(b, t) {
  b.theme = { ...t };
  b.nodes.forEach((n) => {
    if (n.role === "priceBand") n.fill = t.priceColor;
    if (n.role === "ctaBand") n.fill = t.ctaColor;
    if (n.role === "cta") n.fill = t.ctaTextColor || t.textColor;
    if (["name", "offerLegal"].includes(n.role)) n.fill = t.textColor;
    if (["price", "offerHeadline", "offerDiscount"].includes(n.role))
      n.fill = t.priceTextColor || t.textColor;
  });
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el && !el.disabled) {
    e.preventDefault();
    action(el, e);
  }
  if (e.target.classList.contains("modal-backdrop")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (S.modal) closeModal();
    else if (S.workspace !== "paid" && S.view === "editor") selectNode(null);
    return;
  }
  if (S.modal && e.key === "Tab") {
    const list = [
      ...$("#modal-root").querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
      ),
    ].filter((e) => e.offsetParent !== null);
    if (!list.length) return;
    if (e.shiftKey && document.activeElement === list[0]) {
      e.preventDefault();
      list.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
      e.preventDefault();
      list[0].focus();
    }
    return;
  }
  if (S.workspace === "paid") return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (["Enter", " "].includes(e.key) && e.target.matches('[role="checkbox"]')) {
    e.preventDefault();
    action(e.target);
    return;
  }
  if (S.view !== "editor" || S.modal) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    historyGo(e.shiftKey ? "redo" : "undo");
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    historyGo("redo");
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
    e.preventDefault();
    selectAllNodes();
    return;
  }
  if (["Delete", "Backspace"].includes(e.key) && S.selectedNodes.length) {
    e.preventDefault();
    action({ dataset: { action: "delete-node" } });
  }
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
    S.selectedNodes.length
  ) {
    e.preventDefault();
    const nodes = selectedModels();
    if (!nodes.length) return;
    snapshot();
    const d = e.shiftKey ? 10 : 1;
    nodes.forEach((n) => {
      if (e.key === "ArrowUp") n.y -= d;
      if (e.key === "ArrowDown") n.y += d;
      if (e.key === "ArrowLeft") n.x -= d;
      if (e.key === "ArrowRight") n.x += d;
    });
    current().preview = null;
    drawStage();
    renderProperties();
  }
});
document.addEventListener("pointerdown", (e) => {
  if (
    S.view === "editor" &&
    !S.modal &&
    S.selectedNodes.length &&
    e.target.closest("#canvas-area") &&
    !e.target.closest("#fabric-container")
  )
    selectNodes([]);
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "product-query") {
    S.query = el.value;
    S.page = 1;
    updateProducts();
  }
  if (el.id === "picker-query") {
    S.modal.query = el.value;
    updatePickerResults();
  }
  if (el.id === "board-query") {
    S.boardQuery = el.value;
    renderBoardList();
  }
  if (el.id === "project-title") S.title = el.value;
  if (el.hasAttribute("data-image-spacing")) setImageSpacing(el.value);
  if (el.hasAttribute("data-product-scale")) setProductScale(el.value);
  if (el.dataset.mechanic && el.tagName !== "SELECT" && el.type !== "checkbox")
    updateMechanic(el, false);
  if (
    el.dataset.theme ||
    el.dataset.node ||
    el.dataset.role ||
    el.dataset.offer
  )
    updateProperty(el, false);
});
document.addEventListener("change", (e) => {
  const el = e.target;

  if (el.id === "project-file") {
    const file = el.files[0];
    el.value = "";
    if (file) openSavedProject(file);
    return;
  }

  if (el.id === "export-editable") {
    S.includeEditableProject = el.checked;
    return;
  }

  if (el.id === "catalog-file" || el.id === "prices-file") {
    importSheet(
      el.files[0],
      el.id === "catalog-file" ? "catalog" : "prices"
    );
    el.value = "";
  }

  if (el.id === "image-file") {
    const file = el.files[0];
    el.value = "";

    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      return toast("A imagem deve ter até 15 MB.");
    }
    if (!file.type.startsWith("image/")) {
      return toast("Selecione um arquivo de imagem.");
    }

    const reader = new FileReader();
    reader.onload = () => applyImage(reader.result);
    reader.onerror = () => toast("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  }

  if (el.id === "cluster-filter") {
    S.cluster = el.value;
    S.page = 1;
    updateProducts();
  }

  if (el.id === "select-page") {
    const ps = filteredProducts().slice(
      (S.page - 1) * S.pageSize,
      S.page * S.pageSize
    );

    ps.forEach((p) => {
      if (el.checked) {
        S.selected.add(p.id);
      } else {
        S.selected.delete(p.id);
      }
    });

    updateProducts();
  }

  if (el.dataset.background) {
    updateBackground(el.dataset.background, el.value);
  }

  if (el.id === "align-reference") {
    S.alignReference = el.value;
  }

  if (el.id === "export-format") {
    S.exportFormat = el.value;
    renderExport();
  }

  if (el.id === "export-quality") {
    S.exportQuality = Number(el.value);
  }

  if (el.hasAttribute("data-image-spacing")) {
    setImageSpacing(el.value);
  }

  if (el.hasAttribute("data-product-scale")) {
    setProductScale(el.value);
  }

  if (el.dataset.mechanic) {
    updateMechanic(el, true);
  }

  if (
    el.dataset.node ||
    el.dataset.theme ||
    el.dataset.role ||
    el.dataset.offer
  ) {
    updateProperty(el, true);
  }
});
function updateProperty(el, refresh) {
  const b = current();
  if (!b) return;
  const value = el.type === "checkbox" ? el.checked : el.value;
  if (el.dataset.offer) {
    const key = el.dataset.offer,
      v = OfferData.quantity(value),
      take = key === "takeQty" ? v : b.product.takeQty,
      pay = key === "payQty" ? v : b.product.payQty;
    if (!v || take <= pay) {
      if (refresh) {
        toast(
          "Leve deve ser maior que Pague. Use quantidades inteiras positivas.",
        );
        renderProperties();
      }
      return;
    }
    if (b.product[key] === v) return;
    snapshot();
    b.product[key] = v;
    const headline = b.nodes.find((n) => n.role === "offerHeadline");
    if (headline) headline.text = `LEVE ${take}\nPAGUE ${pay}`;
    renderBoardList();
  } else if (el.dataset.node) {
    const n = nodeById();
    if (!n) return;
    const key = el.dataset.node;
    let v = value;
    const nums = [
      "x",
      "y",
      "width",
      "height",
      "rotation",
      "opacity",
      "fontSize",
      "cornerRadius",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
    ];
    if (nums.includes(key)) {
      v = Number(value);
      if (!Number.isFinite(v)) return;
      if (["width", "height", "fontSize"].includes(key))
        v = Math.max(key === "fontSize" ? 8 : 5, Math.min(5000, v));
      if (key === "opacity") v = Math.max(0, Math.min(100, v)) / 100;
      if (key === "cornerRadius") v = Math.max(0, v);
      if (key === "fontWeight" && ![300, 350, 400, 700, 900].includes(v))
        return;
      if (key === "lineHeight") v = Math.max(0.5, Math.min(3, v));
      if (key === "letterSpacing") v = Math.max(-5, Math.min(30, v));
    }
    if (key === "fill" && !/^#[a-f0-9]{6}$/i.test(v)) return;
    if (key === "value") {
      v = parsePrice(value);
      if (v === null) return toast("Informe um preço válido.");
    }
    if (n[key] === v) return;
    snapshot();
    n[key] = v;
    if (key === "fontFamily")
      n.fontWeight =
        v === "Cera Pro"
          ? textWeight(n) >= 700
            ? 900
            : textWeight(n) < 400
              ? 300
              : 400
          : textWeight(n) >= 700
            ? 700
            : textWeight(n) < 400
              ? 350
              : 400;
    if (key === "value" && n.role === "price") {
      updateBoardPrice(b, v);
      renderBoardList();
    }
  } else if (el.dataset.role) {
    const key = el.dataset.role;
    let n = b.nodes.find((n) => n.role === key);
    if (!n) return;
    let v = value;
    if (key === "price") {
      v = parsePrice(value);
      if (v === null) return toast("Informe um preço válido.");
    }
    if ((key === "price" ? n.value : n.text) === v) return;
    snapshot();
    if (key === "price") {
      n.value = v;
      updateBoardPrice(b, v);
      renderBoardList();
    } else n.text = v;
  } else if (el.dataset.theme) {
    const key = el.dataset.theme;
    if (key !== "gradient" && !/^#[a-f0-9]{6}$/i.test(value)) return;
    if (b.theme[key] === value) return;
    snapshot();
    const t = { ...b.theme, [key]: value };
    if (["background", "backgroundEnd"].includes(key)) t.stylePreset = "custom";
    if (
      ["background", "backgroundEnd", "gradient"].includes(key) &&
      t.backgroundMode !== "image"
    )
      t.backgroundMode = "color";
    b.preview = null;
    if (["background", "backgroundEnd", "gradient"].includes(key)) b.theme = t;
    else applyThemeToBoard(b, t);
    $$('[data-background="mode"]').forEach(
      (input) => (input.value = t.backgroundMode || "template"),
    );
    $$('[data-background="preset"]').forEach(
      (input) => (input.value = t.stylePreset || "encarte"),
    );
    $$(`[data-theme="${key}"]`).forEach((x) => {
      if (x !== el) x.value = value;
    });
  }
  drawStage();
  if (refresh) renderProperties();
}
document.addEventListener("dragover", (e) => {
  const zone = e.target.closest("[data-source].source-dropzone");
  if (zone) {
    e.preventDefault();
    zone.classList.add("dragging");
  }
});
document.addEventListener("dragleave", (e) => {
  const zone = e.target.closest(".source-dropzone");
  if (zone && !zone.contains(e.relatedTarget))
    zone.classList.remove("dragging");
});
document.addEventListener("drop", (e) => {
  const zone = e.target.closest(".source-dropzone");
  if (zone) {
    e.preventDefault();
    zone.classList.remove("dragging");
    importSheet(e.dataTransfer.files[0], zone.dataset.source);
  }
});
let resizeTimer;
window.addEventListener("resize", () => {
  if (S.view === "editor") {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawStage(), 150);
  }
});
window.addEventListener("beforeunload", (e) => {
  if (
    S.boards.length ||
    [...brandSessions.values()].some((session) => session.boards.length)
  ) {
    e.preventDefault();
    e.returnValue = "";
  }
});
render();
Promise.allSettled([
  fetch("/assets/image-map.json").then((r) => (r.ok ? r.json() : {})),
  fetch("/assets/catalog.json").then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  }),
  fetch("/assets/prices.json").then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  }),
]).then((results) => {
  if (results[0].status === "fulfilled") S.assetMap = results[0].value;
  if (results[1].status === "fulfilled") S.preloadedCatalog = results[1].value;
  if (results[2].status === "fulfilled") S.preloadedPrices = results[2].value;
  if (S.view === "import") render();
});
