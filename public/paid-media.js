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
    focus: "feed",
    zoomFormat: null,
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
      o = { ...initialOffer(product), upTo: product.upTo === true };
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

  function ensureWorkspaceStyles() {
    if (document.getElementById("pm-workspace-v2-style")) return;
    const style = document.createElement("style");
    style.id = "pm-workspace-v2-style";
    style.textContent = `
      .pm2-workspace{--pm-border:#e3e8ef;--pm-muted:#64748b;max-width:1800px;margin:auto;padding-bottom:24px}
      .pm2-workspace button,.pm2-product-modal button{touch-action:manipulation}
      .pm2-topbar,.pm2-top-actions,.pm2-stagebar,.pm2-format-header,.pm2-inspector-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .pm2-topbar{margin:0 0 20px}.pm2-topbar h1{font-size:26px;margin:0 0 5px}.pm2-topbar p{margin:0;color:var(--pm-muted);font-size:12px}
      .pm2-top-actions{flex-wrap:wrap;justify-content:flex-end}.pm2-top-actions .icon-btn{border:1px solid var(--pm-border);border-radius:9px}
      .pm2-campaign{border:1px solid var(--pm-border);border-radius:12px;background:#fff;margin-bottom:16px}.pm2-campaign>summary{padding:12px 16px;cursor:pointer;font-size:13px;font-weight:600}.pm2-campaign-fields{display:grid;grid-template-columns:1fr 1fr auto;gap:16px;padding:4px 16px 16px;align-items:end}.pm2-campaign-fields .field{margin:0}
      .pm2-packs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}.pm2-packs button{display:flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--pm-border);border-radius:10px;padding:11px 15px;cursor:pointer;color:#334155}.pm2-packs button.active{background:#eff6ff;border-color:var(--brand-primary,#123878);color:var(--brand-primary,#123878)}.pm2-packs small{font-size:11px;color:var(--pm-muted)}
      .pm2-layout{display:grid;grid-template-columns:minmax(0,1fr) 282px;gap:18px;align-items:start}.pm2-main{min-width:0}.pm2-products{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:18px}.pm2-product-slot{display:flex;align-items:center;gap:10px;text-align:left;background:#fff;border:1px solid var(--pm-border);border-radius:12px;padding:10px;min-width:0;cursor:pointer}.pm2-product-slot>img,.pm2-product-slot .thumb{width:44px;height:44px;object-fit:contain;flex-shrink:0}.pm2-product-slot>span{min-width:0;flex:1}.pm2-product-slot b{display:block;font-size:11px;color:var(--pm-muted);margin-bottom:4px}.pm2-product-slot small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;max-width:100%}.pm2-product-slot>svg{width:15px;flex-shrink:0;color:var(--pm-muted)}
      .pm2-stagebar{margin-bottom:12px;font-size:13px}.pm2-stagebar span{font-size:11px;color:var(--pm-muted)}.pm2-boards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}.pm2-boards.single{grid-template-columns:minmax(0,1fr);max-width:850px;margin:auto}.pm2-format{min-width:0;border:1px solid var(--pm-border);border-radius:14px;padding:10px;background:#fff;box-shadow:0 3px 15px #10244b05}.pm2-format.active{border-color:#9bb5dc;box-shadow:0 0 0 2px #1238780b}.pm2-format-header{margin-bottom:10px}.pm2-format-header b{font-size:12px;display:block}.pm2-format-header small{font-size:10px;color:var(--pm-muted)}.pm2-format-header .icon-btn{width:28px;height:28px}.pm2-format .pm-artboard{position:relative;width:100%;overflow:hidden;border-radius:6px;max-width:100%;background:#f1f5f9}.pm2-format .canvas-container{max-width:none}.pm2-format .pm-slot-overlay{border:1px dashed #8fa9cc;border-radius:8px;background:#e9f0fcaa;color:#29456b;position:absolute;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px}.pm2-stagehint{font-size:11px;color:var(--pm-muted);margin:12px 0 0}
      .pm2-workspace .pm-properties{position:sticky;top:14px;width:auto;max-height:calc(100vh - 110px);overflow:auto;border:1px solid var(--pm-border);border-radius:14px;padding:15px;background:#fff}.pm2-inspector-heading{margin-bottom:14px}.pm2-inspector-heading h3{margin:0;font-size:14px}.pm2-workspace .pm-properties .field{margin-bottom:10px}.pm2-workspace .pm-properties details{border-top:1px solid #edf0f5;padding:10px 0;margin:0}.pm2-workspace .pm-properties summary{cursor:pointer;font-weight:600;font-size:12px;padding:4px 0}.pm2-workspace .pm-properties details>div{padding-top:12px}.pm2-workspace .pm-properties .hint{font-size:11px;line-height:1.6}.pm2-selection{padding:12px;background:#f6f8fc;border-radius:10px;margin-bottom:14px}.pm2-selection>b{font-size:12px;display:block;margin-bottom:12px}.pm2-empty-selection{padding:22px 12px;text-align:center;background:#f6f8fc;border-radius:10px;margin-bottom:12px;color:var(--pm-muted);font-size:12px;line-height:1.6}.pm2-empty-selection svg{display:block;width:24px;height:24px;margin:0 auto 10px}.pm2-layers{display:grid;gap:4px;max-height:220px;overflow:auto}.pm2-layers button{display:flex;align-items:center;gap:8px;border:0;border-radius:7px;text-align:left;padding:8px;background:#f8fafc;font-size:11px;cursor:pointer}.pm2-layers button.active{background:#e6eefb;color:#123878}.pm2-layers svg{width:14px;height:14px}.pm2-inspector-format{font-size:12px;margin-bottom:15px}
      .pm2-product-modal{max-width:100%}.pm2-product-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;padding:22px}.pm2-card-column{background:#f3f6fa;border:1px solid #e5eaf1;border-radius:14px;padding:16px;align-self:start;position:sticky;top:0}.pm2-card-column h3{margin:0 0 12px;font-size:13px}.pm2-live-card{width:100%;aspect-ratio:629/377;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 5px 18px #10244b0a}.pm2-card-note{font-size:11px;line-height:1.6;color:#64748b;margin:12px 0 0}.pm2-product-fields{min-width:0}.pm2-product-fields textarea{min-height:80px;resize:vertical}.pm2-image-options{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.pm2-image-options label{display:flex;gap:5px;align-items:center;font-size:12px;cursor:pointer}.pm2-image-options input{accent-color:#123878}.pm2-product-fields fieldset{border:1px solid #e5eaf1;border-radius:10px;padding:12px;margin:16px 0 0}.pm2-product-fields legend{font-size:12px;font-weight:600;padding:0 5px}.pm2-product-error{color:#b91c1c;font-size:12px;min-height:18px;margin-top:10px}.pm2-product-modal .modal-footer{flex-wrap:wrap}.pm2-product-modal .modal-footer .pm2-danger{color:#be123c;margin-right:auto}.pm2-export-options{display:grid;gap:12px}.pm2-export-summary{padding:14px;background:#f5f8fc;border-radius:10px;font-size:12px;line-height:1.7}
      @media(min-width:1450px){.pm2-layout{grid-template-columns:minmax(0,1fr) 300px}.pm2-boards{gap:18px}}
      @media(max-width:1100px){.pm2-layout{grid-template-columns:minmax(0,1fr)}.pm2-workspace .pm-properties{position:static;max-height:none}.pm2-topbar{align-items:flex-start}.pm2-topbar h1{font-size:23px}}
      @media(max-width:700px){.pm2-topbar{flex-direction:column}.pm2-campaign-fields,.pm2-product-body{grid-template-columns:1fr}.pm2-boards{grid-template-columns:1fr}.pm2-format{max-width:440px;width:100%;margin:auto}.pm2-card-column{position:static}.pm2-top-actions{justify-content:flex-start}.pm2-products{grid-template-columns:1fr}.pm2-stagebar{flex-wrap:wrap}}
    `;
    document.head.append(style);
  }

  function syncActiveFormat() {
    for (const element of $$(".pm2-format")) {
      element.classList.toggle("active", element.dataset.format === P.focus);
    }
  }

  function activateFormat(format, selected = null) {
    if (!C.formats[format]) return;
    P.focus = format;
    P.layoutFormat = format;
    P.selected = selected;
    for (const canvas of P.canvases) {
      if (canvas.pmFormat !== format && !canvas.disposed) {
        canvas.pmSyncing = true;
        canvas.discardActiveObject?.();
        canvas.requestRenderAll();
        canvas.pmSyncing = false;
      }
    }
    syncActiveFormat();
    renderProperties();
  }

  function render() {
    ensureWorkspaceStyles();
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
    P.focus = C.formats[P.focus] ? P.focus : Object.keys(C.formats)[0];
    P.layoutFormat = P.focus;
    const p = pack();
    const all = P.packs.reduce((n, item) => n + filled(item), 0);
    const total = P.packs.reduce((n, item) => n + item.count, 0);
        const content = `<div class="pm2-workspace">
      <header class="pm2-topbar">
        <div>
          <h1>Mídia Paga</h1>
          <p>${h(P.title)} · ${all}/${total} produtos selecionados</p>
        </div>

        <div class="pm2-top-actions">
          <button
            class="icon-btn"
            data-pm="undo"
            ${P.history.length && !P.busy ? "" : "disabled"}
            title="Desfazer"
            aria-label="Desfazer"
          >${ico("undo-2")}</button>

          <button
            class="icon-btn"
            data-pm="redo"
            ${P.future.length && !P.busy ? "" : "disabled"}
            title="Refazer"
            aria-label="Refazer"
          >${ico("redo-2")}</button>

          <button
            class="btn small"
            data-pm="sources"
            ${P.busy ? "disabled" : ""}
          >${ico("file-spreadsheet")}Planilhas</button>

          <button
            class="btn primary"
            data-pm="export-options"
            ${P.busy ? "disabled" : ""}
          >${ico("download")}${P.busy ? "Preparando…" : "Exportar"}</button>
        </div>
      </header>

      <details class="pm2-campaign">
        <summary>Campanha e temática</summary>
        <div class="pm2-campaign-fields">
          ${dataField("Nome da campanha", P.title, "data-pm-title", "text")}
          ${campaignThemeSelect()}
          <span class="hint">${Object.keys(C.formats).length * P.packs.length} criativos vinculados</span>
        </div>
      </details>

      <nav class="pm2-packs" aria-label="Conjuntos">
        ${P.packs
          .map(
            (item, i) => `<button
              type="button"
              data-pm="pack"
              data-index="${i}"
              class="${P.active === i ? "active" : ""}"
              aria-current="${P.active === i ? "true" : "false"}"
            ><strong>${h(item.name)}</strong><small>${filled(item)}/${item.count} produtos</small></button>`
          )
          .join("")}
      </nav>

      <div class="pm2-layout">
        <main class="pm2-main">
          <div class="pm2-products">
            ${p.slots
              .map(
                (product, i) => `<button
                  type="button"
                  class="pm2-product-slot"
                  data-pm="slot"
                  data-index="${i}"
                  ${P.busy ? "disabled" : ""}
                >${product ? thumb(product.image) : ico("plus")}<span><b>Produto ${i + 1}</b><small>${product ? h(product.name) : "Selecionar produto"}</small></span>${ico(product ? "pencil" : "plus")}</button>`
              )
              .join("")}
          </div>

          <div class="pm2-stagebar">
            <b>${h(p.name)}</b>

            <div class="pm2-top-actions">
              <button
                class="btn small"
                data-pm="background-quick"
                ${P.busy ? "disabled" : ""}
              >${ico("image")}Fundos</button>

              ${
                P.zoomFormat
                  ? `<button class="btn small" data-pm="overview">${ico("layout-grid")}Ver os três</button>`
                  : ""
              }
            </div>
          </div>

          <div class="pm2-boards ${P.zoomFormat ? "single" : ""}">
            ${Object.entries(C.formats)
              .filter(([f]) => !P.zoomFormat || P.zoomFormat === f)
              .map(
                ([f, c]) => `<article
                  class="pm2-format ${P.focus === f ? "active" : ""}"
                  data-format="${f}"
                >
                  <header class="pm2-format-header">
                    <div><b>${h(c.name)}</b><small>${c.width} × ${c.height}</small></div>

                    <button
                      class="icon-btn"
                      data-pm="focus"
                      data-format="${f}"
                      title="${P.zoomFormat ? "Ver os três formatos" : "Ampliar formato"}"
                      aria-label="${P.zoomFormat ? "Ver os três formatos" : "Ampliar " + h(c.name)}"
                    >${ico(P.zoomFormat ? "minimize-2" : "maximize-2")}</button>
                  </header>

                  <div
                    class="pm-artboard"
                    data-format="${f}"
                    style="aspect-ratio:${c.width}/${c.height}"
                  >
                    <div id="pm-canvas-${f}"></div>
                    ${p.slots
                      .map((product, i) => {
                        if (product) return "";

                        const slot = L.slots(c, p.boards[f], p.count)[i];

                        return `<button
                          class="pm-slot-overlay"
                          data-pm="slot"
                          data-index="${i}"
                          style="left:${slot.x / c.width * 100}%;top:${slot.y / c.height * 100}%;width:${slot.width / c.width * 100}%;height:${slot.height / c.height * 100}%"
                          aria-label="Selecionar produto ${i + 1}"
                        >+ Produto ${i + 1}</button>`;
                      })
                      .join("")}
                  </div>
                </article>`
              )
              .join("")}
          </div>

          <p class="pm2-stagehint">Arraste as imagens diretamente em qualquer formato. Dê dois cliques no produto para editar suas informações.</p>
        </main>

        <aside class="pm-properties" id="pm-properties">${properties()}</aside>
      </div>
    </div>`;

    $("#app").innerHTML = shell(content);
    icons();
    requestAnimationFrame(() => draw());
  }

  function properties() {
    const p = pack(), f = P.focus || P.layoutFormat;
    const b = p.boards[f], n = b?.nodes.find((node) => node.id === P.selected);
    return `<div class="pm2-inspector-heading"><h3>Ajustes</h3>${ico("sliders-horizontal")}</div>
      <label class="field pm2-inspector-format"><span>Formato selecionado</span><select data-pm-active-format>${Object.entries(C.formats).map(([id,c]) => `<option value="${id}" ${id === f ? "selected" : ""}>${h(c.name)}</option>`).join("")}</select></label>
      ${n ? `<section class="pm2-selection"><b>${h(n.label)}</b>${n.type === "text" ? `<label class="field"><span>Texto neste formato</span><textarea data-pm-node="text">${h(n.text)}</textarea></label><div class="field-row">${dataField("Fonte (px)",n.fontSize,'data-pm-node="fontSize" min="5"')}${dataField("Cor",n.fill,'data-pm-node="fill"',"color")}</div>${dataField("Altura de linha",n.lineHeight || 1,'data-pm-node="lineHeight" step="0.05" min="0.5" max="3"')}` : ""}<div class="field-row">${dataField("X",Math.round(n.x),'data-pm-node="x"')}${dataField("Y",Math.round(n.y),'data-pm-node="y"')}</div><div class="field-row">${dataField("Largura",Math.round(n.width),'data-pm-node="width" min="5"')}${dataField("Altura",Math.round(n.height),'data-pm-node="height" min="5"')}</div>${dataField("Rotação",Math.round(n.rotation || 0),'data-pm-node="rotation"')}<button type="button" class="btn small" data-pm="slot" data-index="${n.slot}">${ico("pencil")}Editar produto ${n.slot+1}</button><p class="hint">Posição e estilo mudam somente em ${h(C.formats[f].name)}.</p></section>` : `<div class="pm2-empty-selection">${ico("mouse-pointer-2")}Clique em uma imagem ou texto para ajustar.<br>Os outros formatos mantêm suas posições.</div>`}
      <details><summary>Composição do conjunto</summary><div><label class="field"><span>Quantidade de produtos</span><select data-pm-count>${[1,2,3,4,5,6].map(v => `<option ${v === p.count ? "selected" : ""}>${v}</option>`).join("")}</select></label>${layoutControls()}<button class="btn small" data-pm="reset-format">Restaurar posições</button></div></details>
      <details><summary>Fundo e painel</summary><div>${dataField("Cor do fundo",b.background,'data-pm-bg="background"',"color")}${dataField("Cor do painel",b.panel,'data-pm-bg="panel"',"color")}<label class="toggle-row">Mostrar painel<input type="checkbox" data-pm-bg="panelVisible" ${b.panelVisible !== false ? "checked" : ""}></label><label class="btn small">${ico("image-plus")}Imagem de fundo<input data-pm-file="background" type="file" accept="image/*" hidden></label>${b.image ? '<button class="btn small" data-pm="remove-bg">Remover imagem</button>' : ""}<button class="btn small" data-pm="background-quick">Configurar os três fundos</button><button class="btn small" data-pm="background-all">Aplicar este fundo aos três</button></div></details>
      <details><summary>Camadas (${b.nodes.length})</summary><div class="pm2-layers">${b.nodes.map(x => `<button class="${n === x ? "active" : ""}" data-pm="node" data-id="${x.id}">${ico(x.type === "image" ? "image" : "type")}${h(x.label)}</button>`).join("")}</div></details>`;
  }

  function layoutControls() {
    const f = P.focus || P.layoutFormat, c = C.formats[f];
    const l = L.get(c,pack().boards[f]);
    return `<label class="field"><span>Orientação dos produtos</span><select data-pm-layout="direction"><option value="row" ${l.direction === "row" ? "selected" : ""}>Horizontal</option><option value="column" ${l.direction === "column" ? "selected" : ""}>Vertical</option></select></label><div class="field-row">${dataField("Conjunto X",Math.round(l.x),'data-pm-layout="x"')}${dataField("Conjunto Y",Math.round(l.y),'data-pm-layout="y"')}</div>${dataField("Escala do conjunto (%)",Math.round(l.scale*10)/10,'data-pm-layout="scale" min="10" max="200" step="1"')}<input type="range" min="10" max="200" step="1" value="${l.scale}" data-pm-layout-range aria-label="Escala do conjunto"><button class="btn small" data-pm="layout-center">Centralizar conjunto</button><p class="hint">Ajustes de composição somente em ${h(c.name)}.</p>`;
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
    closeProductPreview();
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
      const scroll = el.scrollTop;
      const open = [...el.querySelectorAll("details")].map(d => d.open);
      el.innerHTML = properties();
      el.querySelectorAll("details").forEach((d,i) => d.open = open[i] || false);
      icons();
      el.scrollTop = scroll;
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
        "mouse:down",
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
        activateFormat(f, e.selected[0]?.modelId);
      });
      st.on("selection:updated", (e) => {
        if (st.pmSyncing) return;
        activateFormat(f, e.selected[0]?.modelId);
      });
      st.on("selection:cleared", () => {
        if (st.pmSyncing) return;
        if (P.focus === f) {
          P.selected = null;
          renderProperties();
        }
      });
      st.on("mouse:dblclick", (e) => {
        const n = b.nodes.find((n) => n.id === e.target?.modelId);
        if (n) openSlotEditor(p,n.slot);
      });
      st.on("mouse:down", (e) => {
        if (P.busy || st.pmSyncing) return;
        if (!e.target?.modelId) activateFormat(f);
      });
      st.on("before:transform", () => {
        P.focus = f;
        P.layoutFormat = f;
        record();
      });
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
      if (P.selected && P.focus === f) {
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
            r = await scene(el, pack(), f, scale, !P.busy, previous);
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
  let productPreviewCanvas = null;
  let productPreviewEpoch = 0;
  function closeProductPreview() {
    productPreviewEpoch++;
    productPreviewCanvas?.dispose();
    productPreviewCanvas = null;
  }
  function readProductImageFile(file) {
    if (!file?.type.startsWith("image/") || file.size > 15 * 1024 * 1024)
      return Promise.reject(Error("Selecione uma imagem de até 15 MB."));
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error("Não foi possível ler a imagem."));
      reader.readAsDataURL(file);
    });
  }
  function checkedImageUrl(value) {
    const url = new URL(value);
    if (!["https:","http:"].includes(url.protocol))
      throw Error("Use uma URL de imagem iniciada por https:// ou http://.");
    return url.href;
  }
  async function drawProductPreview(product, host, epoch) {
    await loadCreativeFonts();
    const slot = {x:0,y:0,width:629,height:377};
    const nodes = slotNodes(product,"feed",slot,0);
    window.PaidMediaText.compact(nodes,slot,measureText,C.textGap);
    const failed = [];
    const objects = (await Promise.all(nodes.map(n => {
      if (n.type !== "text") return sceneNode(n,false,failed);
      const text = textObject(n.text,n);
      text.set("top",0);
      return slotGroup(n,[text],false);
    }))).filter(Boolean);
    if (epoch !== productPreviewEpoch || !host.isConnected) return;
    if (!productPreviewCanvas) {
      const canvas = document.createElement("canvas");
      host.replaceChildren(canvas);
      productPreviewCanvas = new fabric.StaticCanvas(canvas, {
        width: host.clientWidth || 360,
        height: (host.clientWidth || 360)*377/629,
        renderOnAddRemove:false,
        enableRetinaScaling:true,
      });
    }
    const st = productPreviewCanvas;
    const width = host.clientWidth || 360;
    st.setDimensions({width,height:width*377/629});
    st.setViewportTransform([width/629,0,0,width/629,0,0]);
    st.remove(...st.getObjects());
    st.backgroundColor = "#ffffff";
    st.add(...objects);
    st.renderAll();
    return failed;
  }

  function openSlotEditor(p,index) {
    const product = p.slots[index];
    if (!product) return;
    ensureWorkspaceStyles();
    closeProductPreview();
    const offer = { ...initialOffer(product), upTo: product.upTo === true };
    const fields = offer.model === "takePay"
      ? `<div class="field-row">${dataField("Quantidade Leve",offer.takeQty,'name="takeQty" min="2" step="1" required')}${dataField("Quantidade Pague",offer.payQty,'name="payQty" min="1" step="1" required')}</div>`
      : offer.model === "percentage"
        ? `${dataField("Desconto (%)",offer.percentage,'name="percentage" min="0" max="100" step="1" required')}<label class="toggle-row">Mostrar “com até”<input type="checkbox" name="upTo" ${offer.upTo ? "checked" : ""}></label>`
        : dataField("Preço (R$)",offer.price,'name="price" min="0" step="0.01" required');
    S.modal = {type:"paid-slot-editor"};
    openModal(`<div class="pm2-product-modal">
      <header class="modal-header"><div><h2 id="modal-title">Editar produto ${index+1}</h2><p>SKU ${h(product.sku)} · Informações vinculadas aos três formatos.</p></div><button type="button" class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header>
      <form id="pm-slot-editor"><div class="modal-content pm2-product-body">
        <aside class="pm2-card-column"><h3>Prévia do card</h3><div id="pm-product-preview" class="pm2-live-card"></div><p class="pm2-card-note">Prévia do card padrão. Posições e estilos adaptados em cada formato são preservados ao salvar.</p></aside>
        <div class="pm2-product-fields"><label class="field"><span>Nome do produto</span><textarea name="name" maxlength="100" required>${h(product.name)}</textarea></label>${fields}<label class="toggle-row">Mostrar selo Clube K<input type="checkbox" name="showClub" ${offer.showClub ? "checked" : ""}></label>
          <fieldset><legend>Imagem do produto</legend><div class="pm2-image-options"><label><input type="radio" name="imageSource" value="current" checked>Atual</label><label><input type="radio" name="imageSource" value="upload">Arquivo</label><label><input type="radio" name="imageSource" value="url">URL</label></div>
          <div data-pm-image-upload hidden><label class="field"><span>Enviar imagem</span><input type="file" name="image" accept="image/*"></label><p class="hint">PNG, JPG ou WEBP de até 15 MB.</p></div>
          <div data-pm-image-url hidden><label class="field"><span>Link direto da imagem</span><input type="url" name="imageUrl" placeholder="https://site.com/produto.png"></label><p class="hint">O servidor da imagem precisa permitir o carregamento para exportação.</p></div></fieldset>
          <div id="pm-product-error" class="pm2-product-error" role="status" aria-live="polite"></div>
        </div></div><footer class="modal-footer"><button type="button" class="btn pm2-danger" data-pm="clear-slot" data-index="${index}">${ico("trash-2")}Remover</button><button type="button" class="btn" data-pm="replace-slot" data-index="${index}">${ico("replace")}Trocar produto</button><button type="submit" class="btn primary">Salvar alterações</button></footer></form></div>`);
    const form = $("#pm-slot-editor"), host = $("#pm-product-preview"), error = $("#pm-product-error");
    let timer, fileSource = "", fileToken = 0, submitting = false;
    const draft = () => {
      const data = new FormData(form);
      const next = {...product,name:String(data.get("name") || "").trim(),showClub:data.has("showClub")};
      if (offer.model === "takePay") {
        next.takeQty = Number(data.get("takeQty")); next.payQty = Number(data.get("payQty"));
      } else if (offer.model === "percentage") {
        next.percentage = Number(data.get("percentage")); next.upTo = data.has("upTo");
      } else next.price = Number(data.get("price"));
      const source = data.get("imageSource");
      if (source === "upload") {
        if (!fileSource) throw Error("Selecione um arquivo de imagem.");
        next.image = fileSource;
      } else if (source === "url") {
        const value = String(data.get("imageUrl") || "").trim();
        if (!value) throw Error("Informe o link da imagem.");
        try { next.image = checkedImageUrl(value); }
        catch { throw Error("Informe uma URL válida de imagem: https://site.com/imagem.png"); }
      }
      return next;
    };
    const preview = async () => {
      const epoch = ++productPreviewEpoch;
      try {
        const next = draft();
        const failed = await drawProductPreview(next,host,epoch);
        if (epoch === productPreviewEpoch && form.isConnected)
          error.textContent = failed?.length ? "Não foi possível carregar a imagem na prévia." : "";
      } catch (e) {
        if (epoch === productPreviewEpoch && form.isConnected) error.textContent = e.message;
      }
    };
    form.addEventListener("input", () => {
      clearTimeout(timer); timer = setTimeout(preview,180);
    });
    form.addEventListener("change", async (event) => {
      const source = form.elements.imageSource.value;
      form.querySelector("[data-pm-image-upload]").hidden = source !== "upload";
      form.querySelector("[data-pm-image-url]").hidden = source !== "url";
      // Campos de fontes inativas não devem bloquear a validação do formulário.
      form.elements.imageUrl.disabled = source !== "url";
      if (event.target === form.elements.image) {
        const token = ++fileToken;
        try {
          const result = await readProductImageFile(form.elements.image.files[0]);
          if (token !== fileToken || !form.isConnected) return;
          fileSource = result;
        } catch (e) { fileSource = ""; error.textContent = e.message; return; }
      }
      clearTimeout(timer); preview();
    });
    form.elements.imageUrl.disabled = true;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting) return;
      const submit = form.querySelector('[type="submit"]');
      submitting = true; submit.disabled = true; error.textContent = "";
      try {
        const next = draft();
        if (!next.name) throw Error("Informe o nome do produto.");
        if (offer.model === "takePay" && (!Number.isInteger(next.takeQty) || !Number.isInteger(next.payQty) || next.payQty < 1 || next.takeQty <= next.payQty))
          throw Error("Use quantidades inteiras. Leve deve ser maior que Pague.");
        if (offer.model === "percentage" && (!Number.isFinite(next.percentage) || next.percentage < 0 || next.percentage > 100))
          throw Error("Informe uma porcentagem entre 0 e 100.");
        if (offer.model === "price" && (!Number.isFinite(next.price) || next.price < 0))
          throw Error("Informe um preço válido.");
        await loadImage(next.image);
        if (!form.isConnected || p.slots[index] !== product) return;
        assign(p,index,next);
      } catch (e) {
        if (form.isConnected) error.textContent = e.message || "Não foi possível carregar a imagem.";
      } finally { submitting = false; submit.disabled = false; }
    });
    const observer = new MutationObserver(() => {
      if (!form.isConnected) {
        clearTimeout(timer); fileToken++; closeProductPreview(); observer.disconnect();
      }
    });
    observer.observe($("#modal-root"),{childList:true,subtree:true});
    requestAnimationFrame(preview);
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

  function openExportOptions() {
    ensureWorkspaceStyles();
    S.modal = {type:"paid-export"};
    const count = Object.values(GOOGLE_ADS_SIZES).reduce((sum,sizes) => sum+sizes.length,0) + Object.keys(C.formats).length;
    openModal(`<header class="modal-header"><div><h2 id="modal-title">Exportar Mídia Paga</h2><p>Meta ADS e Google ADS em pastas separadas.</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${ico("x")}</button></header><div class="modal-content pm2-export-options"><label class="field"><span>Conjuntos</span><select id="pm-export-scope"><option value="current">${h(pack().name)} · ${count} imagens</option><option value="all">Todos os conjuntos · ${count*P.packs.length} imagens</option></select></label><div class="pm2-export-summary"><b>Meta ADS</b> · Feed, Stories e Horizontal<br><b>Google ADS</b> · Seis tamanhos derivados<br><span>Exemplo: Meta ADS 1 - Feed.png</span></div><p class="hint">Cada pasta reúne todos os conjuntos, sem subpastas de formato ou capa.</p></div><footer class="modal-footer"><button class="btn" data-pm="export-selected" data-destination="queue">Adicionar à fila</button><button class="btn primary" data-pm="export-selected" data-destination="download">${ico("download")}Baixar agora</button></footer>`);
  }

  // Usado pelo exportador central do studio.js para achatar apenas Mídia Paga.
  // Banners Site continua com sua hierarquia atual.
  function queueExportPath(path) {
    const parts = String(path).split("/");
    if (parts[0] !== "Mídia Paga") return null;
    if (parts[1] !== "Meta ADS" && parts[1] !== "Google ADS") return null;
    return `${parts[1]}/${parts.slice(3).join("/")}`;
  }

  async function downloadPaidFiles(files) {
    const zip = new JSZip();
    for (const [,media,,filename,data] of files) zip.file(`${media}/${filename}`,data);
    const blob = await zip.generateAsync({type:"blob",compression:"STORE"});
    download(blob,`${queueSegment(P.title,"Campanha")} - Mídia Paga.zip`);
  }

  async function exportImages(all, destination = "queue") {
    if (P.busy) return;

    const packs = all ? P.packs : [pack()];
    if (packs.some((p) => filled(p) !== p.count)) {
      return toast("Preencha todos os slots dos conjuntos que deseja exportar.");
    }

    closeModal();
    P.busy = true;
    render();

    const pending = [];
    let done = 0;

    try {
      for (const p of packs) {
        const number = P.packs.indexOf(p) + 1;
        // A exportação de Mídia Paga não cria pastas por capa.
        const cluster = "Todos os conjuntos";

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
            pending.push([
              "Mídia Paga",
              "Meta ADS",
              cluster,
              `Meta ADS ${number} - ${c.name}.png`,
              original,
              JSON.stringify(["pack", P.title, p.id, "meta", f]),
            ]);
            done++;

            for (const [width, height] of GOOGLE_ADS_SIZES[f] || []) {
              const sameSize = width === canvas.width && height === canvas.height;
              const blob = sameSize
                ? original
                : await paidExportPng(resizeForGoogleAds(canvas, width, height));

              pending.push([
                "Mídia Paga",
                "Google ADS",
                cluster,
                `Google ADS ${number} - ${width}x${height}.png`,
                blob,
                JSON.stringify(["pack", P.title, p.id, "google", width, height]),
              ]);
              done++;
            }
          } finally {
            await result?.st.dispose();
            host.remove();
          }
        }
      }

      if (destination === "download") {
        await downloadPaidFiles(pending);
        toast(`ZIP preparado com ${done} imagens.`);
      } else {
        for (const entry of pending) enqueueDownload(...entry);
        toast(`${done} imagens adicionadas à fila.`);
      }
    } catch (error) {
      toast("Exportação interrompida: " + error.message);
    } finally {
      P.busy = false;
      render();
    }
  }
  async function action(el) {
    const a = el.dataset.pm;
    if (P.busy) return;
    const p = pack(),
      f = P.focus,
      b = p.boards[f];
    switch (a) {
      case "replace-slot":
        openPicker(Number(el.dataset.index));
        break;
      case "export-options":
        openExportOptions();
        break;
      case "export-selected":
        await exportImages($("#pm-export-scope").value === "all",el.dataset.destination);
        break;
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
      case "slot": {
        const index = Number(el.dataset.index);
        if (p.slots[index]) openSlotEditor(p, index);
        else openPicker(index);
        break;
      }
      case "clear-slot": {
        const index = Number(el.dataset.index);
        if (!p.slots[index]) break;

        record();
        p.slots[index] = null;
        refreshSlot(p, index);
        P.selected = null;

        if (S.modal?.type === "paid-slot-editor") closeModal();

        render();
        break;
      }
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
        P.zoomFormat = P.zoomFormat === el.dataset.format ? null : el.dataset.format;
        P.focus = el.dataset.format;
        P.layoutFormat = P.focus;
        P.selected = null;
        render();
        break;
      case "overview":
        P.zoomFormat = null;
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
          other.panelVisible = b.panelVisible;
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
    if (el.hasAttribute("data-pm-active-format")) {
      activateFormat(el.value);
      draw(el.value);
      return;
    }
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
      pack().boards[P.focus][el.dataset.pmBg] = el.type === "checkbox" ? el.checked : el.value;
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
      draw(P.focus);
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
    queueExportPath,
  };
})();
