/* Workspace independente. Dados dos produtos são compartilhados entre os formatos
 * do conjunto; os nós e fundos de cada formato são independentes. */
"use strict";
window.PaidMedia = (() => {
  const C = window.PAID_MEDIA_PRESETS,
    L = window.PaidMediaLayout;
  function createPack(p) {
    return {
      ...p,
      slots: Array(p.count).fill(null),
      boards: Object.fromEntries(
        Object.keys(C.formats).map((f) => [
          f,
          {
            presetPack: p.id,
            nodes: [],
            background: C.colors.background,
            panel: C.getFormat(f, p.id).panelColor || C.colors.panel,
            panelVisible: false,
            image: "",
          },
        ]),
      ),
    };
  }
  const P = {
    report: null,
    catalog: null,
    prices: null,
    title: "Campanha",
    importing: true,
    active: 0,
    focus: null,
    layoutFormat: "feed",
    backgroundDraft: null,
    backgroundCanvases: [],
    backgroundEpoch: 0,
    selected: null,
    busy: false,
    query: "",
    cluster: "",
    page: 1,
    slot: 0,
    download: null,
    canvases: [],
    epoch: 0,
    history: [],
    future: [],
    packs: C.packs.map(createPack),
  };
  const pack = () => P.packs[P.active];
  const dataField = (label, value, attr, type = "number") =>
    `<label class="field"><span>${label}</span><input type="${type}" value="${h(value)}" ${attr}></label>`;
  function dispose() {
    P.epoch++;
    P.canvases.splice(0).forEach((c) => c.dispose());
  }
  function record() {
    P.history.push(JSON.stringify(P.packs));
    if (P.history.length > 60) P.history.shift();
    P.future = [];
  }
  function undo(redo = false) {
    const from = redo ? P.future : P.history,
      to = redo ? P.history : P.future;
    if (!from.length) return;
    to.push(JSON.stringify(P.packs));
    P.packs = JSON.parse(from.pop());
    P.selected = null;
    render();
  }
  function slotNodes(product, format, slot, index) {
    if (!product) return [];
    const cfg = C.card,
      scale = Math.min(slot.width / 629, slot.height / 377),
      o = initialOffer(product);
    const node = (role, type, text) => {
      const r = cfg[role];
      return {
        id: `slot-${index}-${role}`,
        slot: index,
        role: role === "name" ? "name" : role,
        label: `Slot ${index + 1} · ${role === "image" ? "Imagem" : role === "name" ? "Nome" : role === "price" ? "Oferta" : role === "badge" ? "Selo" : "Texto legal"}`,
        type,
        x: slot.x + r.x * slot.width,
        y: slot.y + r.y * slot.height,
        width: r.width * slot.width,
        height: r.height * slot.height,
        fontSize: (r.fontSize || 32) * scale,
        fontWeight: role === "name" ? 350 : role === "price" ? 700 : 400,
        fontFamily: "Cocogoose Pro",
        lineHeight: 1,
        fill: C.colors[
          role === "price" ? "price" : role === "legal" ? "legal" : "name"
        ],
        text,
        rotation: 0,
        opacity: 1,
      };
    };
    const img = node("image", "image");
    img.src = product.image;
    const title = node("name", "text", product.name);
    const price = node("price", "text", offerLabel(product, o));
    if (o.model === "takePay") {
      price.text = `LEVE ${o.takeQty}\nPAGUE ${o.payQty}`;
      price.fontSize = 30 * scale;
    }
    const nodes = [img, title, price];
    if (o.showClub) {
      const badge = node("badge", "image");
      badge.src = "/assets/clube-k.png";
      badge.height = Math.min(
        badge.width / C.badgeAspectRatio,
        slot.height * 0.14,
      );
      badge.width = badge.height * C.badgeAspectRatio;
      nodes.push(badge);
    }
    if (o.model === "takePay") nodes.push(node("legal", "text", OFFER_LEGAL));
    nodes.forEach((n) => {
      if (n.type === "text") {
        n.wrapWidth = n.width;
        n.maxTextHeight = n.height;
      }
    });
    return nodes;
  }
  function refreshSlot(p, index, preserve = true) {
    for (const [f, b] of Object.entries(p.boards)) {
      const old = new Map(
        b.nodes.filter((n) => n.slot === index).map((n) => [n.role, n]),
      );
      const nodes = slotNodes(
        p.slots[index],
        f,
        L.slots(C.formats[f], b, p.count)[index],
        index,
      ).map((n) => {
        const prev = old.get(n.role);
        return preserve && prev
          ? { ...prev, text: n.text, src: n.src, slot: index }
          : n;
      });
      b.nodes = b.nodes.filter((n) => n.slot !== index).concat(nodes);
    }
  }
  function assign(p, index, product) {
    record();
    p.slots[index] = JSON.parse(JSON.stringify(product));
    refreshSlot(p, index);
    P.selected = null;
    closeModal();
    render();
    toast(`Slot ${index + 1} atualizado nos três formatos.`);
  }
  function importContent() {
    return `<div class="page-heading"><div><div class="eyebrow">MÍDIA PAGA · TRÊS FORMATOS VINCULADOS</div><h1>Mais produtos.<br>Uma campanha completa.</h1><p>Três conjuntos de 2, 3 e 2 produtos, em Feed, Stories e Horizontal.<br>Escolha cada produto uma vez. Exporte as nove imagens juntas.</p></div>${P.report ? '<button class="btn" data-pm="back-editor">Voltar ao editor</button>' : ""}</div><div class="sources-grid">${["catalog", "prices"].map((key, i) => `<section class="source-card"><div class="card-title">${i + 1} · ${key === "catalog" ? "Informações dos produtos" : "Preços e mecânicas"}</div><div class="source-dropzone"><strong>${h(P[key]?.filename || "Selecione uma planilha")}</strong><p>${key === "catalog" ? "H: SKU · I: Produto · T: Imagem" : "H: Tipo · I: SKU · K/N: Preço · T/U: Quantidades · Z: Capa"}</p><label class="btn small">${ico("upload")}Selecionar arquivo<input type="file" accept=".xlsx,.xls,.csv,.tsv" data-pm-file="${key}" hidden></label></div><button class="source-previous" data-pm="previous" data-kind="${key}">Usar ${key === "catalog" ? "informações anteriores" : "preços enviados"}</button>${(key === "catalog" ? S.catalogSource : S.priceSource) ? `<button class="source-previous" data-pm="site-source" data-kind="${key}">Usar planilha de Banners Site</button>` : ""}</section>`).join("")}</div><div class="import-next"><p>As planilhas e os ajustes deste workspace são independentes de Banners Site.</p><button class="btn primary" data-pm="combine" ${!P.catalog || !P.prices || P.busy ? "disabled" : ""}>${P.busy ? "Carregando…" : "Cruzar planilhas e montar conjuntos"}${ico("arrow-right")}</button></div>${P.report ? `<p>${P.report.products.length} ofertas disponíveis · ${P.report.issues.length} pendências excluídas.</p>` : ""}`;
  }
  function filled(p) {
    return p.slots.filter(Boolean).length;
  }

  const THEME_BACKGROUND_FILES = {
    feed: "feed.webp",
    stories: "stories.webp",
    landscape: "horizontal.webp",
  };

  function campaignThemeImage(theme, packId, format) {
    const filename =
      theme.files?.[packId]?.[format] ?? THEME_BACKGROUND_FILES[format];

    return `${theme.folder}/${packId}/${filename}`;
  }

  function campaignThemeSelect() {
  const formats = Object.keys(C.formats);
  const themes = Object.entries(C.themes || {});
  const activeId = themes.find(([, theme]) =>
    P.packs.every((p) =>
      formats.every(
        (f) => p.boards[f].image === campaignThemeImage(theme, p.id, f),
      ),
    ),
  )?.[0];

  const options = themes.map(([id, theme]) =>
    `<option value="${h(id)}" ${id === activeId ? "selected" : ""}>
      ${h(theme.label)}
    </option>`,
  ).join("");

  return `<label class="field">
    <span>Temática da campanha</span>
    <select data-pm-theme aria-label="Temática da campanha"
      ${P.busy ? "disabled" : ""}>
      <option value="" disabled ${!activeId ? "selected" : ""}>
        Escolher temática
      </option>
      ${options}
    </select>
  </label>`;
}

  function applyCampaignTheme(id) {
    if (!Object.hasOwn(C.themes || {}, id)) return;

    const theme = C.themes[id];
    const formats = Object.keys(C.formats);

    record();

    for (const p of P.packs) {
      for (const f of formats) {
        p.boards[f].image = campaignThemeImage(theme, p.id, f);
      }
    }

    render();
    toast(`Temática ${theme.label} aplicada a todos os conjuntos.`);
  }

  function render() {
    if (!supportsPaid()) {
      S.workspace = "site";
      window.PaidMedia.dispose();
      window.renderBannerWorkspace();
      return;
    }
    dispose();
    if (P.importing) {
      $("#app").innerHTML = shell(importContent());
      icons();
      return;
    }
    const p = pack(),
      all = P.packs.reduce((n, p) => n + filled(p), 0),
      total = P.packs.reduce((n, p) => n + p.count, 0);
    const content = `<div class="pm-heading"><div><div class="eyebrow">MÍDIA PAGA</div><h1>Uma seleção. Três formatos.</h1><p>Escolha os slots e adapte cada formato do seu jeito.</p></div><div class="pm-heading-actions"><button class="btn small" data-pm="sources">${ico("file-spreadsheet")}Planilhas</button><button class="btn primary" data-pm="export-all" ${P.busy ? "disabled" : ""}>${ico("download")}${P.busy ? "Exportando…" : "Exportar Meta e Google Ads"}</button></div></div><div class="pm-campaign">${dataField("Nome da campanha", P.title, "data-pm-title", "text")}${campaignThemeSelect()}<span>${all}/${total} produtos · ${Object.keys(C.formats).length * P.packs.length} criativos</span><button class="icon-btn" data-pm="undo" ${P.history.length ? "" : "disabled"} title="Desfazer">${ico("undo-2")}</button><button class="icon-btn" data-pm="redo" ${P.future.length ? "" : "disabled"} title="Refazer">${ico("redo-2")}</button></div>${P.download ? `<div class="pm-download-ready" role="status"><span>${ico("circle-check")}ZIP pronto para baixar.</span><a class="btn small" id="pm-download-ready" href="${h(P.download.url)}" download="${h(P.download.name)}">${ico("download")}Baixar novamente</a></div>` : ""}<div class="pm-pack-tabs">${P.packs.map((p, i) => `<button data-pm="pack" data-index="${i}" class="${P.active === i ? "active" : ""}"><strong>${h(p.name)}</strong><small>${filled(p)}/${p.count} produtos · 3 formatos</small></button>`).join("")}</div><div class="pm-layout"><div class="pm-main"><div class="pm-slots">${p.slots.map((product, i) => `<button class="pm-slot ${product ? "filled" : ""}" data-pm="slot" data-index="${i}">${product ? thumb(product.image) : ico("plus")}<span><b>Slot ${i + 1}</b><small>${product ? h(product.name) : "Clique para selecionar"}</small>${product ? `<small>SKU ${h(product.sku)} · ${h(offerLabel(product))}</small>` : ""}</span>${ico("replace")}</button>`).join("")}</div><div class="pm-preview-toolbar"><b>${h(p.name)} · ${P.focus ? C.formats[P.focus].name : "Todos os formatos"}</b><div><button class="btn small" data-pm="background-quick">${ico("image")}Fundos do conjunto</button><button class="btn small" data-pm="overview">${ico("layout-grid")}Ver os 3</button><button class="btn small" data-pm="export-pack" ${P.busy ? "disabled" : ""}>Exportar conjunto</button></div></div><div class="pm-previews ${P.focus ? "single" : ""}">${Object.entries(
      C.formats,
    )
      .filter(([f]) => !P.focus || P.focus === f)
      .map(
        ([f, c]) =>
          `<article class="pm-preview"><header><span><b>${c.name}</b><small>${c.width} × ${c.height} px</small></span><button class="btn small" data-pm="focus" data-format="${f}">${ico("sliders-horizontal")}${P.focus ? "Ajustando" : "Editar formato"}</button></header><div class="pm-artboard" data-format="${f}" style="aspect-ratio:${c.width}/${c.height}"><div id="pm-canvas-${f}"></div>${
            !P.focus
              ? p.slots
                  .map((product, i) => {
                    const s = L.slots(c, p.boards[f], p.count)[i];
                    return `<button class="pm-slot-overlay ${product ? "has-product" : ""}" data-pm="slot" data-index="${i}" style="left:${(s.x / c.width) * 100}%;top:${(s.y / c.height) * 100}%;width:${(s.width / c.width) * 100}%;height:${(s.height / c.height) * 100}%" aria-label="${product ? "Trocar" : "Selecionar"} produto do slot ${i + 1} em ${c.name}"><b>+ Slot ${i + 1}</b><span>Clique para ${product ? "alterar" : "selecionar"}</span></button>`;
                  })
                  .join("")
              : ""
          }</div></article>`,
      )
      .join(
        "",
      )}</div><p class="hint pm-hint">${P.focus ? "Arraste ou redimensione os elementos. Os ajustes visuais ficam somente neste formato. Use os slots acima para trocar o produto nos três." : "Clique em um slot da prancheta para escolher o produto nos três formatos. Use Editar formato para adaptar posições, textos e imagens."}</p></div><aside class="pm-properties" id="pm-properties">${properties()}</aside></div>`;
    $("#app").innerHTML = shell(content);
    icons();
    requestAnimationFrame(draw);
  }
  function properties() {
    const p = pack(),
      f = P.focus,
      b = p.boards[f],
      n = b?.nodes.find((n) => n.id === P.selected);
    return `<h3>${f ? "Adaptação · " + C.formats[f].name : "Configurações do conjunto"}</h3><p class="hint">${f ? "Alterações de layout são independentes." : "Os produtos são vinculados nos três formatos."}</p><label class="field"><span>Produtos neste conjunto</span><select data-pm-count>${[1, 2, 3, 4, 5, 6].map((v) => `<option ${v === p.count ? "selected" : ""}>${v}</option>`).join("")}</select></label>${layoutControls()}${f ? `<details open><summary>Fundo e painel</summary><div>${dataField("Cor do fundo", b.background, 'data-pm-bg="background"', "color")}${dataField("Cor do painel", b.panel, 'data-pm-bg="panel"', "color")}<label class="btn small">${ico("image-plus")}Imagem de fundo<input data-pm-file="background" type="file" accept="image/*" hidden></label>${b.image ? '<button class="btn small" data-pm="remove-bg">Remover imagem</button>' : ""}<button class="btn small" data-pm="background-all">Aplicar fundo aos 3</button></div></details><details open><summary>Elementos do formato</summary><div class="pm-layers">${b.nodes.map((x) => `<button class="${n === x ? "active" : ""}" data-pm="node" data-id="${x.id}">${ico(x.type === "image" ? "image" : "type")}${h(x.label)}</button>`).join("")}</div></details>${n ? `<details open><summary>${h(n.label)}</summary><div>${n.type === "text" ? `<label class="field"><span>Texto neste formato</span><textarea data-pm-node="text">${h(n.text)}</textarea></label>${dataField("Tamanho da fonte", n.fontSize, 'data-pm-node="fontSize"')}${dataField("Cor", n.fill, 'data-pm-node="fill"', "color")}${dataField("Altura de linha", n.lineHeight || 1, 'data-pm-node="lineHeight" step="0.05" min="0.5" max="3"')}` : ""}<div class="field-row">${dataField("X", Math.round(n.x), 'data-pm-node="x"')}${dataField("Y", Math.round(n.y), 'data-pm-node="y"')}</div><div class="field-row">${dataField("Largura", Math.round(n.width), 'data-pm-node="width" min="5"')}${dataField("Altura", Math.round(n.height), 'data-pm-node="height" min="5"')}</div>${dataField("Rotação", Math.round(n.rotation || 0), 'data-pm-node="rotation"')}</div></details>` : '<p class="hint">Selecione um elemento para ajustar.</p>'}<button class="btn small" data-pm="reset-format">Restaurar posições deste formato</button>` : '<p class="hint">Escolha “Editar formato” na prévia para ajustar os elementos individualmente.</p>'}<details><summary>Informações vinculadas</summary><div><p class="hint">Nome, oferta e selo são atualizados nos três formatos. Posições e cores permanecem.</p>${p.slots.map((product, i) => (product ? `<div class="pm-product-settings"><b>Slot ${i + 1} · ${h(product.sku)}</b><label class="field"><span>Nome</span><input value="${h(product.name)}" data-pm-product="name" data-index="${i}"></label>${product.offerKind === "takePay" ? `${dataField("Quantidade Leve", product.takeQty, `data-pm-product="takeQty" data-index="${i}" min="2"`)}${dataField("Quantidade Pague", product.payQty, `data-pm-product="payQty" data-index="${i}" min="1"`)}` : dataField("Preço", product.price, `data-pm-product="price" data-index="${i}" min="0" step="0.01"`)}<label class="toggle-row">Selo Clube K<input type="checkbox" data-pm-product="showClub" data-index="${i}" ${product.showClub ? "checked" : ""}></label><button class="btn small" data-pm="clear-slot" data-index="${i}">Esvaziar slot</button></div>` : "")).join("")}</div></details>`;
  }
  function layoutControls() {
    const f = P.focus || P.layoutFormat,
      c = C.formats[f],
      l = L.get(c, pack().boards[f]);
    return `<details open><summary>Posição e escala do conjunto</summary><div>${
      !P.focus
        ? `<label class="field"><span>Formato para ajustar</span><select data-pm-layout-format>${Object.entries(
            C.formats,
          )
            .map(
              ([id, c]) =>
                `<option value="${id}" ${id === f ? "selected" : ""}>${c.name}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }<label class="field"><span>Orientação dos produtos</span><select data-pm-layout="direction" aria-label="Orientação dos produtos"><option value="row" ${l.direction === "row" ? "selected" : ""}>Horizontal · lado a lado</option><option value="column" ${l.direction === "column" ? "selected" : ""}>Vertical · empilhados</option></select></label><div class="field-row">${dataField("Posição X (px)", Math.round(l.x), 'data-pm-layout="x"')}${dataField("Posição Y (px)", Math.round(l.y), 'data-pm-layout="y"')}</div>${dataField("Escala do conjunto (%)", Math.round(l.scale * 10) / 10, 'data-pm-layout="scale" min="10" max="200" step="1"')}<input type="range" min="10" max="200" step="1" value="${l.scale}" data-pm-layout-range aria-label="Ajustar escala do conjunto"><button class="btn small" data-pm="layout-center">Centralizar na prancheta</button><p class="hint">Move e dimensiona todos os elementos juntos. Aplica somente em ${c.name}. A orientação reorganiza o painel e os slots.</p><button class="btn small" data-pm="background-quick">${ico("image")}Fundos do conjunto</button></div></details>`;
  }
  function syncOverlays() {
    for (const el of $$(".pm-slot-overlay")) {
      const f = el.closest(".pm-artboard").dataset.format,
        c = C.formats[f],
        s = L.slots(c, pack().boards[f], pack().count)[
          Number(el.dataset.index)
        ];
      if (s)
        Object.assign(el.style, {
          left: (s.x / c.width) * 100 + "%",
          top: (s.y / c.height) * 100 + "%",
          width: (s.width / c.width) * 100 + "%",
          height: (s.height / c.height) * 100 + "%",
        });
    }
  }
  function syncLayoutControls() {
    const f = P.focus || P.layoutFormat,
      l = L.get(C.formats[f], pack().boards[f]);
    for (const el of $$("[data-pm-layout]")) {
      if (el !== document.activeElement) el.value = l[el.dataset.pmLayout];
    }
    $$("[data-pm-layout-range]").forEach((el) => {
      if (el !== document.activeElement) el.value = l.scale;
    });
    window.refreshDropdowns?.();
  }
  document.addEventListener("focusin", (e) => {
    if (
      e.target.dataset.pmLayout ||
      e.target.hasAttribute("data-pm-layout-range")
    )
      rangeEditing = false;
  });
  let rangeEditing = false;
  function updateLayout(el, live = false) {
    const f = P.focus || P.layoutFormat,
      b = pack().boards[f],
      key = el.hasAttribute("data-pm-layout-range")
        ? "scale"
        : el.dataset.pmLayout,
      value = key === "direction" ? el.value : Number(el.value);
    if (
      key !== "direction" &&
      (!Number.isFinite(value) ||
        (key === "scale" && (value < 10 || value > 200)))
    ) {
      if (!live) renderProperties();
      return;
    }
    if (L.get(C.formats[f], b)[key] === value) {
      if (!live) rangeEditing = false;
      return;
    }
    if (!rangeEditing) record();
    if (live) rangeEditing = true;
    L.apply(C.formats[f], b, pack().count, { [key]: value });
    P.selected = null;
    syncOverlays();
    draw(f);
    syncLayoutControls();
    if (live) {
      $$('[data-pm-layout="scale"],[data-pm-layout-range]').forEach((e) => {
        if (e !== el) e.value = L.get(C.formats[f], b).scale;
      });
    } else {
      rangeEditing = false;
      syncLayoutControls();
    }
  }
  document.addEventListener("input", (e) => {
    if (P.busy) return;
    const el = e.target;
    if (
      el.hasAttribute("data-pm-layout-range") ||
      (el.dataset.pmLayout && el.tagName === "INPUT" && el.value !== "")
    )
      updateLayout(el, true);
    if (el.dataset.pmDraftBg && P.backgroundDraft) {
      P.backgroundDraft.boards[el.dataset.format][el.dataset.pmDraftBg] =
        el.type === "checkbox" ? el.checked : el.value;
      drawBackgrounds();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.hasAttribute("data-pm-layout-range")) {
      rangeEditing = false;
      syncLayoutControls();
    }
  });
  const BG_KEYS = ["background", "panel", "image", "panelVisible"];
  function closeBackgrounds() {
    P.backgroundEpoch++;
    P.backgroundCanvases.splice(0).forEach((c) => c.dispose());
    P.backgroundDraft = null;
  }
  function openBackgrounds() {
    closeBackgrounds();
    const p = pack();
    P.backgroundDraft = {
      index: P.active,
      boards: Object.fromEntries(
        Object.entries(p.boards).map(([f, b]) => [f, { ...b }]),
      ),
    };
    renderBackgrounds();
  }
  function renderBackgrounds() {
    const d = P.backgroundDraft;
    if (!d) return;
    S.modal = { type: "paid-backgrounds" };
    openModal(
      `<header class="modal-header"><div><h2 id="modal-title">Fundos · ${h(P.packs[d.index].name)}</h2><p>Escolha uma cor ou imagem para cada formato. Confira as três prévias antes de aplicar.</p></div><button class="icon-btn" data-pm="background-cancel" aria-label="Fechar fundos">${ico("x")}</button></header><div class="modal-content pm-bg-grid">${Object.entries(
        C.formats,
      )
        .map(([f, c]) => {
          const b = d.boards[f];
          return `<section class="pm-bg-card"><h3>${c.name}<small>${c.width} × ${c.height} px</small></h3><div class="pm-bg-stage" style="aspect-ratio:${c.width}/${c.height}"><div id="pm-bg-canvas-${f}"></div></div>${dataField("Cor do fundo · " + c.name, b.background, `data-pm-draft-bg="background" data-format="${f}"`, "color")}<label class="btn small">${ico("image-plus")}${b.image ? "Trocar imagem" : "Selecionar imagem"}<input type="file" data-pm-draft-file data-format="${f}" aria-label="Imagem de fundo · ${c.name}" accept="image/*" hidden></label>${b.image ? `<button class="btn small" data-pm="background-remove-draft" data-format="${f}">Remover imagem · ${c.name}</button>` : ""}<label class="toggle-row">Mostrar painel · ${c.name}<input type="checkbox" data-pm-draft-bg="panelVisible" data-format="${f}" ${b.panelVisible !== false ? "checked" : ""}></label>${dataField("Cor do painel · " + c.name, b.panel, `data-pm-draft-bg="panel" data-format="${f}"`, "color")}<p class="hint">${b.image ? "A imagem preenche o fundo. Remova para mostrar a cor." : "A cor preenche toda a prancheta."}</p></section>`;
        })
        .join(
          "",
        )}</div><footer class="modal-footer"><p class="hint">Somente o conjunto atual será alterado.</p><button class="btn" data-pm="background-cancel">Cancelar</button><button class="btn primary" data-pm="background-apply">Aplicar fundos</button></footer>`,
    );
    requestAnimationFrame(drawBackgrounds);
  }
  async function drawBackgrounds() {
    const epoch = ++P.backgroundEpoch,
      d = P.backgroundDraft;
    if (!d) return;
    P.backgroundCanvases.splice(0).forEach((c) => c.dispose());
    const p = { ...P.packs[d.index], boards: d.boards };
    for (const [f, c] of Object.entries(C.formats)) {
      const host = $("#pm-bg-canvas-" + f);
      if (!host) continue;
      let r;
      try {
        r = await scene(host, p, f, host.parentElement.clientWidth / c.width);
        if (epoch !== P.backgroundEpoch || d !== P.backgroundDraft) {
          r.st.dispose();
          return;
        }
        P.backgroundCanvases.push(r.st);
        if (r.failed.length) toast("Não carregou: " + r.failed.join(", "));
      } catch (e) {
        r?.st.dispose();
        if (epoch === P.backgroundEpoch) toast(e.message);
      }
    }
  }
  async function readBackgroundDraft(file, f) {
    const d = P.backgroundDraft;
    if (!d || !file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024)
      return toast("Selecione uma imagem de até 15 MB.");
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await loadImage(data);
      if (P.backgroundDraft !== d) return;
      d.boards[f].image = data;
      renderBackgrounds();
    } catch {
      toast("Não foi possível carregar a imagem de fundo.");
    }
  }
  function applyBackgrounds() {
    const d = P.backgroundDraft;
    if (!d) return;
    record();
    for (const f of Object.keys(C.formats))
      for (const key of BG_KEYS)
        P.packs[d.index].boards[f][key] = d.boards[f][key];
    closeModal();
    render();
    toast("Fundos aplicados aos três formatos do conjunto.");
  }

  function measureText(n, maxHeight) {
    const text = textObject(n.text, { ...n, width: n.wrapWidth || n.width });
    while (text.fontSize > 8 && text.height > maxHeight) {
      text.set({ fontSize: Math.max(8, text.fontSize - 1) });
      text.initDimensions();
    }
    return {
      width: Math.min(
        n.wrapWidth || n.width,
        Math.max(1, text.calcTextWidth() + 1),
      ),
      height: text.height,
      fontSize: text.fontSize,
    };
  }
  function compactBoard(p, f) {
    const b = p.boards[f],
      slots = L.slots(C.formats[f], b, p.count);
    slots.forEach((slot, i) =>
      window.PaidMediaText.compact(
        b.nodes.filter((n) => n.slot === i),
        slot,
        measureText,
        C.textGap,
      ),
    );
  }
  function updateNodeGeometry(n, key, value) {
    if (key === "y" && ["price", "badge", "legal"].includes(n.role))
      n.flowOffsetY = (n.flowOffsetY || 0) + value - n.y;
    if (key === "width" && n.type === "text") n.wrapWidth = value;
    if (key === "height" && n.type === "text") n.maxTextHeight = value;
    n[key] = value;
  }
  function renderProperties() {
    const el = $("#pm-properties");
    if (el) {
      el.innerHTML = properties();
      icons();
    }
  }
  async function scene(
    host,
    p,
    f,
    scale,
    interactive = false,
    existing = null,
  ) {
    const c = C.getFormat(f, p.id),
      b = p.boards[f];
    let st = existing;
    if (!st) {
      const canvas = document.createElement("canvas");
      host.replaceChildren(canvas);
      const Canvas = interactive
        ? class extends fabric.Canvas {
            getRetinaScaling() {
              return Math.max(2, super.getRetinaScaling());
            }
          }
        : fabric.StaticCanvas;
      st = new Canvas(canvas, {
        width: c.width * scale,
        height: c.height * scale,
        enableRetinaScaling: interactive,
        renderOnAddRemove: false,
        preserveObjectStacking: true,
        selection: false,
      });
      st.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    }
    const failed = [],
      objects = [];
    await loadCreativeFonts();
    compactBoard(p, f);
    if (b.image) {
      try {
        const img = await loadImage(b.image),
          s = Math.max(
            c.width / img.naturalWidth,
            c.height / img.naturalHeight,
          );
        objects.push(
          new fabric.FabricImage(img, {
            left: (c.width - img.naturalWidth * s) / 2,
            top: (c.height - img.naturalHeight * s) / 2,
            scaleX: s,
            scaleY: s,
            selectable: false,
            evented: false,
          }),
        );
      } catch {
        failed.push("Imagem de fundo");
      }
    }
    const frame = L.frame(c, b),
      { x, y, width: w, height: ht } = frame;
    if (b.panelVisible !== false)
      objects.push(
        new fabric.Rect({
          left: x,
          top: y,
          width: w,
          height: ht,
          rx: (c.radius * L.get(c, b).scale) / 100,
          ry: (c.radius * L.get(c, b).scale) / 100,
          fill: b.panel,
          selectable: false,
          evented: false,
        }),
      );
    const slots = L.slots(c, b, p.count);
    if (b.panelVisible !== false)
      slots.slice(1).forEach((s) => {
        const pts =
          frame.direction === "row"
            ? [s.x, y + ht * 0.15, s.x, y + ht * 0.85]
            : [x + w * 0.26, s.y, x + w * 0.74, s.y];
        objects.push(
          new fabric.Line(pts, {
            stroke: C.colors.divider,
            strokeWidth: 1,
            selectable: false,
            evented: false,
          }),
        );
      });
    objects.push(
      ...(
        await Promise.all(
          b.nodes.map((n) => {
            if (n.type !== "text") return sceneNode(n, interactive, failed);
            const text = textObject(n.text, n);
            text.set("top", 0);
            return slotGroup(n, [text], interactive);
          }),
        )
      ).filter(Boolean),
    );
    if (st.disposed || st.destroyed || !host.isConnected) return { st, failed };
    // Preserve the visible frame until every replacement object is ready.
    st.pmSyncing = true;
    if (interactive) {
      for (const event of [
        "selection:created",
        "selection:updated",
        "selection:cleared",
        "mouse:dblclick",
        "before:transform",
        "object:scaling",
        "object:modified",
      ])
        st.off(event);
      st.discardActiveObject();
    }
    if (
      st.getWidth() !== c.width * scale ||
      st.getHeight() !== c.height * scale
    )
      st.setDimensions({ width: c.width * scale, height: c.height * scale });
    st.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    st.remove(...st.getObjects());
    st.backgroundColor = b.background;
    st.add(...objects);
    if (interactive) {
      st.on("selection:created", (e) => {
        if (st.pmSyncing) return;
        P.selected = e.selected[0]?.modelId;
        renderProperties();
      });
      st.on("selection:updated", (e) => {
        if (st.pmSyncing) return;
        P.selected = e.selected[0]?.modelId;
        renderProperties();
      });
      st.on("selection:cleared", () => {
        if (st.pmSyncing) return;
        P.selected = null;
        renderProperties();
      });
      st.on("mouse:dblclick", (e) => {
        const n = b.nodes.find((n) => n.id === e.target?.modelId);
        if (n) openPicker(n.slot);
      });
      st.on("before:transform", () => record());
      st.on("object:scaling", (e) => {
        const n = b.nodes.find((n) => n.id === e.target.modelId);
        if (n?.type === "text") previewTextResize(e.target, n);
      });
      st.on("object:modified", (e) => {
        const o = e.target,
          n = b.nodes.find((n) => n.id === o.modelId);
        if (!n) return;
        const resized = n.type === "text" ? previewTextResize(o, n) : null;
        updateNodeGeometry(n, "y", o.top);
        n.x = o.left;
        updateNodeGeometry(
          n,
          "width",
          Math.max(5, n.width * Math.abs(o.scaleX)),
        );
        updateNodeGeometry(
          n,
          "height",
          Math.max(5, n.height * Math.abs(o.scaleY)),
        );
        n.rotation = o.angle;
        if (resized) n.fontSize = resized.fontSize;
        queueMicrotask(() => draw(f));
        renderProperties();
      });
      if (P.selected) {
        const object = st.getObjects().find((o) => o.modelId === P.selected);
        if (object) st.setActiveObject(object);
      }
    }
    st.pmSyncing = false;
    st.renderAll();
    return { st, failed };
  }
  let drawing = false;
  const pendingFormats = new Set();
  async function draw(target) {
    (typeof target === "string" ? [target] : Object.keys(C.formats)).forEach(
      (f) => pendingFormats.add(f),
    );
    if (drawing) return;
    drawing = true;
    try {
      while (pendingFormats.size) {
        const formats = [...pendingFormats];
        pendingFormats.clear();
        const epoch = P.epoch;
        for (const f of formats) {
          const el = $("#pm-canvas-" + f);
          if (!el) continue;
          const previous = P.canvases.find(
            (c) => c.pmFormat === f && !c.disposed,
          );
          let r;
          try {
            const scale = el.parentElement.clientWidth / C.formats[f].width;
            r = await scene(el, pack(), f, scale, !!P.focus, previous);
            if (epoch !== P.epoch) {
              if (!previous) r.st.dispose();
              break;
            }
            if (!previous) {
              r.st.pmFormat = f;
              P.canvases.push(r.st);
            }
            if (r.failed.length) toast("Não carregou: " + r.failed.join(", "));
          } catch (e) {
            if (r && !previous) r.st.dispose();
            if (epoch === P.epoch) toast(e.message);
          }
        }
      }
    } finally {
      drawing = false;
    }
  }
  function pickerRows() {
    const results = (P.report?.products || []).filter(
      (p) =>
        (!P.cluster || p.cluster === P.cluster) &&
        (!P.query || norm(p.name + " " + p.sku).includes(norm(P.query))),
    );
    const pages = Math.max(1, Math.ceil(results.length / 20));
    P.page = Math.min(P.page, pages);
    $("#pm-picker-results").innerHTML =
      results
        .slice((P.page - 1) * 20, P.page * 20)
        .map(
          (p) =>
            `<button class="pm-picker-row" data-pm="choose" data-id="${h(p.id)}">${thumb(p.image)}<span><b>${h(p.name)}</b><small>SKU ${h(p.sku)} · ${h(p.cluster)}</small><small>${h(offerTypeLabel(p))}</small></span><strong>${h(offerLabel(p))}</strong>${ico("plus")}</button>`,
        )
        .join("") || '<p class="empty">Nenhum produto encontrado.</p>';
    $("#pm-picker-pages").innerHTML =
      `<span>${results.length} ofertas · ${P.page}/${pages}</span><button class="btn small" data-pm="prev-page" ${P.page === 1 ? "disabled" : ""}>Anterior</button><button class="btn small" data-pm="next-page" ${P.page === pages ? "disabled" : ""}>Próxima</button>`;
    icons();
  }

  
  function openPicker(index) {
    P.slot = index;
    P.query = "";
    P.page = 1;
    S.modal = { type: "paid-picker" };
    openModal(
      `<header class="modal-header"><div><h2 id="modal-title">Produto do slot ${index + 1}</h2><p>Será aplicado a Feed, Stories e Horizontal deste conjunto.</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><div class="modal-content"><label class="search">${ico("search")}<input data-pm-query placeholder="Buscar por nome ou SKU" aria-label="Buscar produto para o slot"></label><label class="field"><span>Capa / cluster</span><select data-pm-cluster><option value="">Todas as capas</option>${P.report.clusters.map((c) => `<option ${P.cluster === c ? "selected" : ""}>${h(c)}</option>`).join("")}</select></label><div id="pm-picker-results"></div><div id="pm-picker-pages" class="pm-picker-pages"></div></div>`,
    );
    pickerRows();
  }
  async function readFile(file, kind) {
    if (!file) return;
    if (file.size > (kind === "background" ? 15 : 25) * 1024 * 1024)
      return toast("Arquivo acima do limite.");
    try {
      if (kind === "background") {
        if (!file.type.startsWith("image/")) throw Error("Escolha uma imagem.");
        const data = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        record();
        pack().boards[P.focus].image = data;
        render();
        return;
      }
      if (!/\.(xlsx?|csv|tsv)$/i.test(file.name))
        throw Error("Escolha Excel ou CSV.");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          defval: "",
        }),
      })).filter((s) =>
        s.rows.some((r) => r.length >= (kind === "catalog" ? 20 : 26)),
      );
      if (!sheets.length)
        throw Error("Não foi encontrada uma aba com as colunas necessárias.");
      if (sheets.length > 1) {
        S.modal = { type: "paid-sheet" };
        openModal(
          `<header class="modal-header"><h2 id="modal-title">Escolha a aba</h2><button data-action="close-modal" class="icon-btn">${ico("x")}</button></header><div class="modal-content">${sheets.map((s, i) => `<button class="btn" data-pm-sheet="${i}">${h(s.name)}</button>`).join("")}</div>`,
        );
        const modal = $("#modal-root");
        modal.querySelectorAll("[data-pm-sheet]").forEach(
          (btn) =>
            (btn.onclick = () => {
              applyRows(
                sheets[Number(btn.dataset.pmSheet)].rows,
                file.name,
                kind,
              );
              closeModal();
            }),
        );
        return;
      }
      applyRows(sheets[0].rows, file.name, kind);
    } catch (e) {
      toast(e.message || "Não foi possível ler o arquivo.");
    }
  }
  function applyRows(rows, name, kind) {
    const data =
      kind === "catalog"
        ? OfferData.parseCatalog(rows, name)
        : OfferData.parsePrices(rows, name);
    if (!(kind === "catalog" ? data.products.length : data.offers.length))
      return toast("A planilha não contém registros válidos.");
    P[kind] = data;
    render();
    toast("Planilha carregada em Mídia Paga.");
  }
  async function combine() {
    if (!P.catalog || !P.prices) return;
    const result = OfferData.combine(P.catalog, P.prices);
    if (!result.products.length)
      return toast("Nenhuma oferta válida. Confira SKU, tipo e quantidades.");
    const apply = () => {
      P.report = result;
      P.title = campaignTitle(result.priceFilename);
      P.importing = false;
      P.packs = C.packs.map(createPack);
      P.active = 0;
      P.history = [];
      P.future = [];
      render();
      toast(
        `${result.products.length} ofertas disponíveis · ${result.issues.length} pendências excluídas.`,
      );
    };
    if (P.report && P.packs.some((p) => filled(p)))
      openConfirm(
        "Substituir ofertas da Mídia Paga?",
        "O novo cruzamento reinicia os conjuntos deste workspace. Banners Site será mantido.",
        apply,
      );
    else apply();
  }
  const GOOGLE_ADS_SIZES = {
    feed: [[1080, 1080], [1200, 1200]],
    stories: [[1080, 1350], [600, 750]],
    landscape: [[1200, 628], [600, 314]],
  };

  function resizeForGoogleAds(source, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    // Preenche o destino mantendo a proporção e centralizando o recorte.
    const scale = Math.max(width / source.width, height / source.height);
    const cropWidth = width / scale;
    const cropHeight = height / scale;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      source,
      (source.width - cropWidth) / 2,
      (source.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height,
    );

    return canvas;
  }

  async function paidExportPng(canvas) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) throw new Error("Não foi possível gerar a imagem.");
    return blob;
  }

  async function exportImages(all) {
    if (P.busy) return;

    const packs = all ? P.packs : [pack()];
    if (packs.some((p) => filled(p) !== p.count)) {
      return toast("Preencha todos os slots dos conjuntos que deseja exportar.");
    }

    P.busy = true;
    render();

    const zip = new JSZip();
    const meta = zip.folder("Meta ADS");
    const google = zip.folder("Google ADS");
    let done = 0;
    let ready = false;

    try {
      for (const p of packs) {
        const number = P.packs.indexOf(p) + 1;

        for (const [f, c] of Object.entries(C.formats)) {
          const host = document.createElement("div");
          host.style.cssText = "position:fixed;left:-10000px;top:0";
          document.body.append(host);
          let result;

          try {
            result = await scene(host, p, f, 1);
            if (result.failed.length) {
              throw new Error("Não carregou: " + result.failed.join(", "));
            }

            const canvas = result.st.toCanvasElement(1);
            if (canvas.width !== c.width || canvas.height !== c.height) {
              throw new Error("Dimensões de exportação incorretas.");
            }

            const original = await paidExportPng(canvas);
            meta.file(`Meta ADS - ${c.name} - ${number}.png`, original);
            done++;

            for (const [width, height] of GOOGLE_ADS_SIZES[f] || []) {
              const sameSize = width === canvas.width && height === canvas.height;
              const blob = sameSize
                ? original
                : await paidExportPng(resizeForGoogleAds(canvas, width, height));

              google.file(`Google ADS ${number} - ${width}x${height}.png`, blob);
              done++;
            }
          } finally {
            await result?.st.dispose();
            host.remove();
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      if (P.download) URL.revokeObjectURL(P.download.url);

      const title = P.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
      P.download = {
        url: URL.createObjectURL(blob),
        name: `${title} - Mídia Paga${all ? "" : " - " + packs[0].name}.zip`,
      };

      ready = true;
      toast(`${done} imagens exportadas.`);
    } catch (error) {
      toast("Exportação interrompida: " + error.message);
    } finally {
      P.busy = false;
      render();
      if (ready) $("#pm-download-ready")?.click();
    }
  }
  async function action(el) {
    const a = el.dataset.pm;
    if (P.busy) return;
    const p = pack(),
      f = P.focus,
      b = p.boards[f];
    switch (a) {
      case "background-quick":
        openBackgrounds();
        break;
      case "background-cancel":
        closeModal();
        break;
      case "background-apply":
        applyBackgrounds();
        break;
      case "background-remove-draft":
        if (P.backgroundDraft) {
          P.backgroundDraft.boards[el.dataset.format].image = "";
          renderBackgrounds();
        }
        break;
      case "layout-center": {
        const format = P.focus || P.layoutFormat,
          c = C.formats[format],
          board = p.boards[format],
          r = L.frame(c, board);
        record();
        L.apply(c, board, p.count, {
          x: (c.width - r.width) / 2,
          y: (c.height - r.height) / 2,
        });
        P.selected = null;
        syncOverlays();
        draw(format);
        syncLayoutControls();
        break;
      }
      case "back-editor":
        P.importing = false;
        render();
        break;
      case "sources":
        P.importing = true;
        render();
        break;
      case "previous": {
        const k = el.dataset.kind;
        const data = k === "catalog" ? S.preloadedCatalog : S.preloadedPrices;
        if (data) {
          P[k] = data;
          render();
        } else toast("As fontes anteriores ainda estão carregando.");
        break;
      }
      case "site-source":
        P[el.dataset.kind] =
          el.dataset.kind === "catalog" ? S.catalogSource : S.priceSource;
        render();
        break;
      case "combine":
        combine();
        break;
      case "pack":
        P.active = Number(el.dataset.index);
        P.selected = null;
        render();
        break;
      case "slot":
        openPicker(Number(el.dataset.index));
        break;
      case "choose": {
        const product = P.report.products.find((p) => p.id === el.dataset.id);
        if (product) assign(p, P.slot, product);
        break;
      }
      case "prev-page":
        P.page--;
        pickerRows();
        break;
      case "next-page":
        P.page++;
        pickerRows();
        break;
      case "focus":
        P.focus = el.dataset.format;
        P.layoutFormat = P.focus;
        P.selected = null;
        render();
        break;
      case "overview":
        P.focus = null;
        P.selected = null;
        render();
        break;
      case "node":
        P.selected = el.dataset.id;
        draw();
        renderProperties();
        break;
      case "undo":
        undo();
        break;
      case "redo":
        undo(true);
        break;
      case "clear-slot":
        record();
        p.slots[el.dataset.index] = null;
        refreshSlot(p, Number(el.dataset.index));
        render();
        break;
      case "reset-format":
        openConfirm(
          "Restaurar posições?",
          "Somente o layout deste formato será restaurado.",
          () => {
            record();
            delete b.layout;
            b.nodes = p.slots.flatMap((product, i) =>
              slotNodes(product, f, L.slots(C.formats[f], b, p.count)[i], i),
            );
            P.selected = null;
            render();
          },
        );
        break;
      case "remove-bg":
        record();
        b.image = "";
        render();
        break;
      case "background-all":
        record();
        Object.values(p.boards).forEach((other) => {
          other.background = b.background;
          other.panel = b.panel;
          other.image = b.image;
        });
        render();
        break;
      case "export-all":
        exportImages(true);
        break;
      case "export-pack":
        exportImages(false);
        break;
    }
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-pm]");
    if (!el || el.disabled) return;
    e.preventDefault();
    action(el);
  });
  document.addEventListener("input", (e) => {
    if (e.target.hasAttribute("data-pm-query")) {
      P.query = e.target.value;
      P.page = 1;
      pickerRows();
    }
    if (e.target.hasAttribute("data-pm-title")) P.title = e.target.value;
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (P.busy) return;
    if (el.hasAttribute("data-pm-theme")) {
      applyCampaignTheme(el.value);
      return;
    }
    if (el.hasAttribute("data-pm-layout-format")) {
      P.layoutFormat = el.value;
      renderProperties();
      return;
    }
    if (el.dataset.pmLayout) {
      updateLayout(el);
      return;
    }
    if (el.dataset.pmDraftBg) {
      const d = P.backgroundDraft;
      if (d) {
        d.boards[el.dataset.format][el.dataset.pmDraftBg] =
          el.type === "checkbox" ? el.checked : el.value;
        drawBackgrounds();
      }
      return;
    }
    if (el.hasAttribute("data-pm-draft-file")) {
      readBackgroundDraft(el.files[0], el.dataset.format);
      el.value = "";
      return;
    }
    if (el.dataset.pmFile) {
      readFile(el.files[0], el.dataset.pmFile);
      el.value = "";
    }
    if (el.hasAttribute("data-pm-cluster")) {
      P.cluster = el.value;
      P.page = 1;
      pickerRows();
    }
    if (el.hasAttribute("data-pm-count")) {
      const count = Number(el.value),
        p = pack();
      const apply = () => {
        record();
        p.count = count;
        p.slots = Array.from({ length: count }, (_, i) => p.slots[i] || null);
        for (const [f, b] of Object.entries(p.boards))
          b.nodes = p.slots.flatMap((product, i) =>
            slotNodes(product, f, L.slots(C.formats[f], b, count)[i], i),
          );
        P.selected = null;
        render();
      };
      if (count < p.count)
        openConfirm(
          "Reduzir os slots?",
          "Os slots excedentes serão removidos. As posições serão reorganizadas.",
          apply,
        );
      else apply();
    }
    if (el.dataset.pmBg) {
      record();
      pack().boards[P.focus][el.dataset.pmBg] = el.value;
      draw();
    }
    if (el.dataset.pmNode) {
      const n = pack().boards[P.focus]?.nodes.find((n) => n.id === P.selected);
      if (!n) return;
      let v = el.value;
      const key = el.dataset.pmNode;
      if (!["text", "fill"].includes(key)) {
        v = Number(v);
        if (
          !Number.isFinite(v) ||
          (["width", "height", "fontSize"].includes(key) && v < 5)
        )
          return;
      }
      record();
      updateNodeGeometry(n, key, v);
      draw();
    }
    if (el.dataset.pmProduct) {
      const i = Number(el.dataset.index),
        p = pack(),
        product = p.slots[i],
        key = el.dataset.pmProduct;
      let value = el.type === "checkbox" ? el.checked : el.value;
      if (["price", "takeQty", "payQty"].includes(key)) {
        value = Number(value);
        if (!Number.isFinite(value) || value < 0) return;
        if (
          key !== "price" &&
          (!Number.isInteger(value) ||
            value < 1 ||
            (key === "takeQty" ? value : product.takeQty) <=
              (key === "payQty" ? value : product.payQty))
        ) {
          toast(
            "Leve deve ser maior que Pague, com quantidades inteiras positivas.",
          );
          renderProperties();
          return;
        }
      }
      record();
      product[key] = value;
      refreshSlot(p, i);
      render();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (
      S.workspace !== "paid" ||
      P.importing ||
      S.modal ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
    )
      return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo(e.shiftKey);
    }
    if (e.key === "Escape") {
      P.selected = null;
      P.canvases.forEach((c) => {
        c.discardActiveObject?.();
        c.requestRenderAll();
      });
      renderProperties();
    }
  });
  let resize;
  window.addEventListener("resize", () => {
    if (S.workspace === "paid" && !P.importing) {
      clearTimeout(resize);
      resize = setTimeout(draw, 150);
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (P.packs.some((p) => filled(p))) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return {
    render,
    dispose,
    slotNodes,
    refreshSlot,
    assign,
    state: P,
    closeBackgrounds,
  };
})();
