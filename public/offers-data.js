/* Import rules shared by the browser and regression checks. No price comes from the catalog. */
(function (root) {
  "use strict";
  const clean = (v) => {
    const s = String(v ?? "").trim();
    return /^(null|undefined|nan)$/i.test(s) ? "" : s;
  };
  const normalize = (v) =>
    clean(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ");
  const sku = (v) => {
    const s = clean(v);
    return /^\d+(?:[.,]0+)?$/.test(s)
      ? s.replace(/[.,]0+$/, "").replace(/^0+(?=\d)/, "")
      : s.toUpperCase();
  };
  function parsePrice(v) {
    if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : null;
    let s = clean(v).replace(/R\$/gi, "").replace(/\s/g, "");
    if (!s) return null;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    if (!/^\d+(?:\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const quantity = (v) => {
    const n = parsePrice(v);
    return n !== null && Number.isInteger(n) && n > 0 ? n : null;
  };
  const kind = (v) =>
    ({
      normal: "normal",
      "club koch": "club",
      "mercapromo pague e leve": "takePay",
      "leve e pague": "takePay",
      "pague e leve": "takePay",
    })[normalize(v)] || 'normal';
  const isHeader = (v) =>
    /^(sku|seqproduto|cod_produto|codigo do produto)$/i.test(clean(v));
  const validSku = (v) => !!sku(v) && !isHeader(v);
  function catalogFromProducts(
    products,
    filename = "Catálogo anterior",
    rowCount = products.length,
  ) {
    const entries = new Map();
    let invalid = 0;
    for (const row of products) {
      const id = sku(row.sku),
        name = clean(row.name),
        image = clean(row.image);
      if (!validSku(id) || !name) {
        invalid++;
        continue;
      }
      const p = {
        sku: id,
        name,
        image: /^https?:\/\//i.test(image) ? image : "",
        category: clean(row.category),
      };
      if (!entries.has(id)) entries.set(id, []);
      const list = entries.get(id);
      if (!list.some((q) => q.name === p.name && q.image === p.image))
        list.push(p);
    }
    const catalog = [];
    const ambiguous = [];

    for (const [id, list] of entries) {
    // Reúne todas as imagens disponíveis para esse SKU.
    const images = new Set(
        list.map(p => p.image).filter(Boolean)
    );

    // Usa a primeira ocorrência com imagem.
    // Se nenhuma tiver imagem, usa a primeira ocorrência.
    const primary = list.find(p => p.image) || list[0];

    const maxNameLength = 100;
    const characters = Array.from(primary.name);

    const name = characters.length > maxNameLength
      ? characters.slice(0, maxNameLength - 1).join('').trimEnd() + '…'
      : primary.name;

    catalog.push({
      ...primary,
      name,
      images: [...images],
    });
    }
    return {
      filename,
      rowCount,
      products: catalog,
      invalid,
      ambiguous,
      imageVariants: catalog.filter((p) => p.images.length > 1).length,
      skuCount: catalog.length,
    };
  }
  function parseCatalog(rows, filename) {
    if (rows.some((r) => normalize(r[7]) === "tipo_oferta"))
      throw new Error("Este é o arquivo de preços. Envie-o no segundo campo.");
    if (!rows.some((r) => r.length >= 20))
      throw new Error(
        "A planilha de informações precisa das colunas H (SKU), I (produto) e T (imagem).",
      );
    const start = rows.findIndex(
      (r) =>
        validSku(r[7]) &&
        clean(r[8]) &&
        !/^(produto|nome do produto|descricao)$/i.test(clean(r[8])),
    );
    if (start < 0)
      throw new Error(
        "Não encontrei produtos nas colunas H e I da planilha de informações.",
      );
    return catalogFromProducts(
      rows
        .slice(start)
        .map((r) => ({ sku: r[7], name: r[8], image: r[19], category: r[2] })),
      filename,
      rows.length - start,
    );
  }
  function parsePrices(rows, filename) {
    if (!rows.some((r) => r.length >= 26))
      throw new Error(
        "A planilha de preços precisa ter as colunas H, I, K, N, T, U e Z.",
      );
    const start = rows.findIndex(
      (r) =>
        validSku(r[8]) &&
        clean(r[7]) &&
        !/^(tipo_oferta|tipo de oferta)$/i.test(clean(r[7])),
    );
    if (start < 0)
      throw new Error(
        "Não encontrei ofertas nas colunas H e I da planilha de preços.",
      );
    const offers = rows
      .slice(start)
      .map((r, index) => ({
        sku: sku(r[8]),
        priceDescription: clean(r[9]),
        offerType: clean(r[7]),
        retailPriceRaw: clean(r[10]),
        loyaltyPriceRaw: clean(r[13]),
        retailPrice: parsePrice(r[10]),
        loyaltyPrice: parsePrice(r[13]),
        payQty: quantity(r[19]),
        takeQty: quantity(r[20]),
        cluster: clean(r[25]) || "Sem capa / cluster",
        sourceRow: start + index + 1,
      }))
      .filter((o) => o.sku || o.offerType);
    return { filename, rowCount: offers.length, offers };
  }
  function combine(catalog, prices) {
    if (!catalog || !prices)
      throw new Error("Carregue as duas planilhas para cruzar os produtos.");
    const lookup = new Map(catalog.products.map((p) => [p.sku, p])),
      ambiguous = new Set(catalog.ambiguous),
      seen = new Set(),
      products = [],
      issues = [];
    let duplicates = 0;
    for (const offer of prices.offers) {
      const baseKind = kind(offer.offerType);
      const pendingPrice =
        baseKind !== 'takePay' &&
        clean(
          baseKind === 'club'
            ? offer.loyaltyPriceRaw
            : offer.retailPriceRaw
        ) === '?';

      const k = pendingPrice ? 'percentage' : baseKind;
      const p = lookup.get(offer.sku);
      let reason = "";
      if (!validSku(offer.sku)) reason = "SKU vazio ou inválido";
      else if (!k)
        reason = "Tipo de oferta sem regra: " + (offer.offerType || "vazio");
      else if (ambiguous.has(offer.sku))
        reason = "SKU com informações conflitantes no catálogo";
      else if (!p) reason = "SKU não encontrado na planilha de informações";
      else if (k === "normal" && offer.retailPrice === null)
        reason = "Preço varejo inválido ou ausente (K)";
      else if (k === "club" && offer.loyaltyPrice === null)
        reason = "Preço fidelidade inválido ou ausente (N)";
      else if (
        k === "takePay" &&
        (!offer.payQty || !offer.takeQty || offer.takeQty <= offer.payQty)
      )
        reason =
          "Leve/Pague inválido: U deve ser maior que T, com quantidades inteiras positivas";
      if (reason) {
        issues.push({
          sku: offer.sku,
          type: offer.offerType,
          cluster: offer.cluster,
          row: offer.sourceRow,
          reason,
        });
        continue;
      }
      const showClub =
        baseKind === 'club' ||
        (
          baseKind === 'takePay' &&
          normalize(offer.offerType) === 'mercapromo pague e leve'
        );
      const price =
        k === 'takePay' || k === 'percentage'
          ? null
          : k === 'club'
            ? offer.loyaltyPrice
            : offer.retailPrice;
      const key = JSON.stringify([
        offer.sku,
        offer.cluster,
        k,
        price,
        k === "takePay" ? offer.payQty : null,
        k === "takePay" ? offer.takeQty : null,
        showClub,
      ]);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      products.push({
        ...p,
        ...offer,
        id: "offer-" + products.length,
        offerKind: k,
        price,
        showClub,
        ...(pendingPrice ? { percentage: 0 } : {}),
      });
    }
    return {
      products,
      clusters: [...new Set(prices.offers.map((p) => p.cluster))],
      rowCount: prices.rowCount,
      skuCount: new Set(products.map((p) => p.sku)).size,
      duplicates,
      issues,
      catalogFilename: catalog.filename,
      priceFilename: prices.filename,
      missingImages: products.filter((p) => !p.image).length,
    };
  }
  root.OfferData = {
    clean,
    sku,
    parsePrice,
    quantity,
    kind,
    parseCatalog,
    parsePrices,
    catalogFromProducts,
    combine,
  };
})(typeof window === "undefined" ? globalThis : window);
