/* PRESETS DO OFERTA STUDIO — ÚNICO ARQUIVO DE CALIBRAÇÃO.
 * 1. brands: cores, fontes, logos e disponibilidade de cada bandeira.
 * 2. banners.shared: formatos, posições e imagens comuns aos Banners Site.
 * 3. banners.byBrand: sobrescritas por bandeira (mesmas chaves do shared).
 *    Ex.: komprao: {layouts: {mini: {price: {y: 130}}}}.
 * 4. paidMedia: formatos, conjuntos, packFormats e geometria dos cards.
 * 5. imageLayouts: seis composições; slots são [x,y,largura,altura] de 0 a 1.
 * Coordenadas de painéis e elementos: pixels reais da exportação.
 * Configurações entram em novos criativos ou ao restaurar posições.
 */
window.OFERTA_PRESETS = {
 brands: {
  superkoch: {
    label: 'SuperKoch', primary: '#123878', primaryHover: '#0b285b',
    icon: '/assets/ui-superkoch.svg', logo: '/assets/logo-superkoch.png', workspaces: ['site','paid'],
  },
  komprao: {
    label: 'Komprão', primary: '#E4002B', primaryHover: '#b60022',
    icon: '/assets/ui-komprao.svg', logo: '/assets/logo-komprao.png', typography: {fontWeight: 900, lineHeight: 0.8}, workspaces: ['site'],
    creative: {
      background: '#E4002B', backgroundEnd: '#E4002B', gradient: false,
      fontFamily: 'Cera Pro', priceTextColor: '#E4002B',
      priceColor: '#FDD000', ctaColor: '#FDD000',
      ctaTextColor: '#E4002B', textColor: '#ffffff',
      priceShape: '/assets/komprao-price-shape.svg',
    },
    styles: [{id:'encarte', label:'Encarte', background:'#E4002B', backgroundEnd:'#E4002B'}],
  },
},
 styles: [
  { id: 'encarte', label: 'Encarte', background: '#0753dc', backgroundEnd: '#073381' },
  { id: 'weekend', label: 'Final de Semana', background: '#0092de', backgroundEnd: '#0039d5' },
],
 banners: {
 shared: {
    "backgroundPanels": {"panoramic": {"x": -40, "y": 0, "width": 920, "height": 720, "radius": 40, "outsideColor": "#f6f7f8"}},
    "imageComposition": {"padding": 24, "paddingRatio": 0.08},
    "formats": {
      "vertical": {"id": "vertical", "name": "Oferta vertical", "width": 720, "height": 1281, "preview": "/assets/preset.jpg"},
      "panoramic": {"id": "panoramic", "name": "Panorâmico", "width": 1512, "height": 720, "preview": "/assets/preset-panoramic.png"},
      "mini": {"id": "mini", "name": "Mini", "width": 720, "height": 288, "preview": "/assets/preset-mini.png"}
    },
    "layouts": {
      "vertical": {
        "name": {"x": 40, "y": 125, "width": 640, "height": 170, "fontSize": 56},
        "priceBand": {"x": 0, "y": 319, "width": 710, "height": 211},
        "price": {"x": 0, "y": 330, "width": 720, "height": 220, "fontSize": 218},
        "offerHeadline": {"x": 0, "y": 330, "width": 720, "height": 169, "fontSize": 100},
        "offerDiscount": {"x": 0, "y": 325, "width": 720, "height": 220, "fontSize": 218},
        "clubBadge": {"x": 142, "y": 511, "width": 436, "height": 53},
        "ctaBand": {"x": 96, "y": 1102, "width": 528, "height": 100},
        "cta": {"x": 116, "y": 1119, "width": 488, "height": 69, "fontSize": 60},
        "offerLegal": {"x": 30, "y": 1220, "width": 660, "height": 40, "fontSize": 26}
      },
      "panoramic": {
        "name": {"x": 45, "y": 40, "width": 775, "height": 185, "fontSize": 65},
        "priceBand": {"x": 0, "y": 251, "width": 833, "height": 249},
        "price": {"x": 0, "y": 267, "width": 844, "height": 253, "fontSize": 300},
        "offerHeadline": {"x": 0, "y": 260, "width": 844, "height": 133, "fontSize": 110},
        "offerDiscount": {"x": 0, "y": 257, "width": 828, "height": 273, "fontSize": 280},
        "clubBadge": {"x": 167, "y": 476, "width": 508, "height": 62},
        "ctaBand": {"x": 178, "y": 555, "width": 472, "height": 91},
        "cta": {"x": 198, "y": 568, "width": 432, "height": 64, "fontSize": 57},
        "offerLegal": {"x": 0, "y": 666, "width": 829, "height": 32, "fontSize": 23}
      },
      "mini": {
        "name": {"x": 45, "y": 39, "width": 330, "height": 72, "fontSize": 29},
        "priceBand": {"x": 0, "y": 119, "width": 376, "height": 113},
        "price": {"x": 0, "y": 125, "width": 369, "height": 103, "fontSize": 111},
        "offerHeadline": {"x": 25, "y": 125, "width": 325, "height": 83, "fontSize": 46},
        "offerDiscount": {"x": 0, "y": 125, "width": 369, "height": 103, "fontSize": 105},
        "clubBadge": {"x": 46, "y": 214, "width": 268, "height": 33},
        "ctaBand": {"x": 458, "y": 118, "width": 236, "height": 55},
        "cta": {"x": 474, "y": 130, "width": 204, "height": 35, "fontSize": 29},
        "offerLegal": {"x": 14, "y": 264, "width": 380, "height": 18, "fontSize": 11}
      }
    },
    "productImages": {
      "vertical": {
        "byCount": {
          "1": [
            {"x": 30, "y": 606, "width": 660, "height": 435}
          ],
          "2": [
            {"x": 36, "y": 620, "width": 360, "height": 420},
            {"x": 324, "y": 620, "width": 360, "height": 420}
          ],
          "3": [
            {"x": 22, "y": 640, "width": 265, "height": 390},
            {"x": 228, "y": 600, "width": 265, "height": 430},
            {"x": 434, "y": 640, "width": 265, "height": 390}
          ]
        }
      },
      "panoramic": {
        "area": {"x": 835, "y": 60, "width": 660, "height": 560},
        "overlapStep": 0.7,
        "stagger": 0.05
      },
      "mini": {
        "area": {"x": 402, "y": 8, "width": 310, "height": 278},
        "overlapStep": 0.7,
        "stagger": 0.05
      }
    }
  },
 // Mude somente o campo desejado; os demais herdam de shared.
 byBrand: {
   superkoch: {layouts: {}, productImages: {}},
   komprao: {
    layouts: {
      vertical: {
        priceBand: { y:330 },
      },
    }, 
    productImages: {}
  },
 },
 },
 paidMedia: {
  // Quantidade inicial de produtos por conjunto. Cada um gera os três formatos.
  packs: [
    { id: 'pack-1', name: 'Conjunto 1', count: 2 },
    { id: 'pack-2', name: 'Conjunto 2', count: 3 },
    { id: 'pack-3', name: 'Conjunto 3', count: 2 },
  ],
  formats: {
    feed: {
      id: 'feed', name: 'Feed', width: 1080, height: 1080,
      panel: { x: 19, y: 389, width: 1029, height: 364 },
      direction: 'row', radius: 50,
    },
    stories: {
      id: 'stories', name: 'Stories', width: 1080, height: 1920,
      panel: { x: 19, y: 791, width: 1029, height: 364 },
      direction: 'row', radius: 50,
    },
    landscape: {
      id: 'landscape', name: 'Horizontal', width: 1200, height: 628,
      panel: { x: 619, y: 18, width: 502, height: 592 },
      direction: 'column', radius: 50,
    },
  },
  // CALIBRAÇÃO POR CONJUNTO: sobrescreve somente os formatos listados.
  // Coordenadas em pixels da exportação, sem considerar o zoom do editor.
  // Conjunto 2: três produtos empilhados no painel à direita, conforme referências.
  packFormats: {
    'pack-2': {
      feed: {
        panel: { x: 510, y: 98, width: 516, height: 888 },
        direction: 'column', radius: 42, panelColor: '#ffffff',
      },
      stories: {
        panel: { x: 496, y: 514, width: 552, height: 946 },
        direction: 'column', radius: 42, panelColor: '#ffffff',
      },
      landscape: {
        panel: { x: 832, y: 18, width: 319, height: 582 },
      },
    },
  },
  // Único ponto de resolução dos padrões: geral → conjunto → formato.
  getFormat(formatId, packId) {
    const base = this.formats[formatId], override = this.packFormats[packId]?.[formatId] || {};
    return { ...base, ...override, panel: { ...base.panel, ...override.panel } };
  },
  colors: {
    background: '#ffffff', panel: '#d9d9d9', name: '#080808',
    price: '#ff0000', legal: '#10244b', divider: '#999999',
  },
  textGap: 8, // Distância entre nome, oferta, selo e legal. Referência 629 × 377.
  badgeAspectRatio: 436 / 54,
  card: {
    // x/width são frações da largura do slot; y/height da altura do slot.
    image: { x: 0.055, y: 0.16, width: 0.39, height: 0.69 },
    name:  { x: 0.53, y: 0.16, width: 0.43, height: 0.37, fontSize: 32 },
    price: { x: 0.53, y: 0.54, width: 0.43, height: 0.19, fontSize: 46 },
    badge: { x: 0.53, y: 0.76, width: 0.43, height: 0.09 },
    legal: { x: 0.53, y: 0.87, width: 0.43, height: 0.10, fontSize: 11 },
  },
  // Divide o painel em slots iguais. Para layouts especiais, edite esta função.
  getSlots(format, count) {
    const { x, y, width, height } = format.panel;
    return Array.from({ length: count }, (_, index) =>
      format.direction === 'row'
        ? { x: x + width * index / count, y, width: width / count, height }
        : { x, y: y + height * index / count, width, height: height / count }
    );
  },
},
 imageLayouts: [
    {
      "id": "row",
      "label": "Lado a lado",
      "slots": {
        "2": [
          [
            0.0,
            0.03,
            0.5,
            0.94
          ],
          [
            0.5,
            0.03,
            0.5,
            0.94
          ]
        ],
        "3": [
          [
            0.0,
            0.03,
            0.3333333333333333,
            0.94
          ],
          [
            0.3333333333333333,
            0.03,
            0.3333333333333333,
            0.94
          ],
          [
            0.6666666666666666,
            0.03,
            0.3333333333333333,
            0.94
          ]
        ]
      }
    },
    {
      "id": "stack",
      "label": "Empilhadas",
      "slots": {
        "2": [
          [
            0.03,
            0.0,
            0.94,
            0.5
          ],
          [
            0.03,
            0.5,
            0.94,
            0.5
          ]
        ],
        "3": [
          [
            0.03,
            0.0,
            0.94,
            0.3333333333333333
          ],
          [
            0.03,
            0.3333333333333333,
            0.94,
            0.3333333333333333
          ],
          [
            0.03,
            0.6666666666666666,
            0.94,
            0.3333333333333333
          ]
        ]
      }
    },
    {
      "id": "diagonalUp",
      "label": "Diagonal crescente",
      "slots": {
        "2": [
          [
            0.0,
            0.42,
            0.58,
            0.58
          ],
          [
            0.42,
            0.0,
            0.58,
            0.58
          ]
        ],
        "3": [
          [
            0.0,
            0.42,
            0.58,
            0.58
          ],
          [
            0.21,
            0.21,
            0.58,
            0.58
          ],
          [
            0.42,
            0.0,
            0.58,
            0.58
          ]
        ]
      }
    },
    {
      "id": "diagonalDown",
      "label": "Diagonal decrescente",
      "slots": {
        "2": [
          [
            0.0,
            0.0,
            0.58,
            0.58
          ],
          [
            0.42,
            0.42,
            0.58,
            0.58
          ]
        ],
        "3": [
          [
            0.0,
            0.0,
            0.58,
            0.58
          ],
          [
            0.21,
            0.21,
            0.58,
            0.58
          ],
          [
            0.42,
            0.42,
            0.58,
            0.58
          ]
        ]
      }
    },
    {
      "id": "spotlight",
      "label": "Centro em destaque",
      "slots": {
        "2": [
          [
            0,
            0.28,
            0.48,
            0.72
          ],
          [
            0.38,
            0,
            0.62,
            1
          ]
        ],
        "3": [
          [
            0,
            0.3,
            0.34,
            0.7
          ],
          [
            0.25,
            0,
            0.5,
            1
          ],
          [
            0.66,
            0.3,
            0.34,
            0.7
          ]
        ]
      }
    },
    {
      "id": "staggered",
      "label": "Alternadas",
      "slots": {
        "2": [
          [
            0,
            0,
            0.55,
            0.7
          ],
          [
            0.45,
            0.3,
            0.55,
            0.7
          ]
        ],
        "3": [
          [
            0,
            0,
            0.36,
            0.7
          ],
          [
            0.32,
            0.3,
            0.36,
            0.7
          ],
          [
            0.64,
            0,
            0.36,
            0.7
          ]
        ]
      }
    }
  ]
};
// Resolução e aliases de compatibilidade. Os valores editáveis ficam acima.
window.resolveBannerPresets = function(brand='superkoch') {
 const merge=(base,patch)=>{const out={...base};for(const [key,value] of Object.entries(patch||{}))out[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(base?.[key]||{},value):value;return out};
 return merge(window.OFERTA_PRESETS.banners.shared,window.OFERTA_PRESETS.banners.byBrand[brand]);
};
window.OFFER_BRANDS=window.OFERTA_PRESETS.brands;
window.OFFER_STYLE_PRESETS=window.OFERTA_PRESETS.styles;
window.BANNER_TEMPLATE_PRESETS=window.OFERTA_PRESETS.banners.shared;
window.PAID_MEDIA_PRESETS=window.OFERTA_PRESETS.paidMedia;
