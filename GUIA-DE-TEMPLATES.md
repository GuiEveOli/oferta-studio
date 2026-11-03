# Calibrar os templates do Oferta Studio

Todos os presets editáveis ficam em **`public/presets.js`**. O editor, as prévias, os fundos e a exportação usam esse mesmo arquivo.

| Seção em `OFERTA_PRESETS` | O que ajustar |
| --- | --- |
| `brands.superkoch` / `brands.komprao` | Cores, fontes, logos e módulos disponíveis |
| `banners.shared.formats` | Dimensões e nomes dos formatos de Banners Site |
| `banners.shared.layouts` | Posições, tamanhos e fontes dos elementos |
| `banners.shared.productImages` | Áreas e posições das imagens por quantidade |
| `banners.shared.backgroundPanels` | Painel de fundo do Panorâmico |
| `banners.byBrand.superkoch` / `banners.byBrand.komprao` | Ajustes exclusivos de cada bandeira |
| `paidMedia.formats` | Painéis padrão de Feed, Stories e Horizontal |
| `paidMedia.packs` | Quantidade inicial de produtos por conjunto |
| `paidMedia.packFormats` | Posições exclusivas de um conjunto e formato |
| `paidMedia.card` / `paidMedia.textGap` | Imagem, nome, preço, selo e espaçamentos dos cards |
| `imageLayouts` | Seis composições de 2 ou 3 imagens |
| `styles` | Estilos de cor Encarte e Final de Semana |

## Banners Site

Em `banners.shared.layouts`, escolha `vertical`, `panoramic` ou `mini`, depois o elemento:

```js
price: { x: 0, y: 267, width: 844, height: 253, fontSize: 300 }
```

Os campos usam pixels reais da exportação. `x` e `y` medem a distância do canto superior esquerdo. O zoom não altera essas medidas.

| Elemento | Chave |
| --- | --- |
| Nome | `name` |
| Forma do preço | `priceBand` |
| Preço | `price` |
| Leve/Pague | `offerHeadline` |
| Porcentagem | `offerDiscount` |
| Selo Clube K | `clubBadge` |
| Botão e texto | `ctaBand` / `cta` |
| Texto legal | `offerLegal` |

### Ajustar apenas uma bandeira

O padrão compartilhado evita repetir coordenadas. Em `banners.byBrand`, sobrescreva somente o que mudar:

```js
komprao: {
  layouts: {
    mini: { price: { y: 130, fontSize: 115 } },
    panoramic: { name: { x: 50 } },
  },
  productImages: {
    mini: { area: { x: 410 } },
  },
},
```

Os outros campos herdam de `shared`. Esse exemplo altera somente Komprão; SuperKoch mantém suas posições. Os arrays, como `byCount`, são substituídos integralmente.

## Mídia Paga

`paidMedia.packs` controla os conjuntos 1, 2 e 3, com 2, 3 e 2 produtos. Cada conjunto gera Feed 1080×1080, Stories 1080×1920 e Horizontal 1200×628. Mídia Paga permanece disponível somente em SuperKoch.

`paidMedia.formats` contém os painéis base. `paidMedia.packFormats['pack-2']` sobrescreve Feed e Stories do Conjunto 2:

```js
feed: {
  panel: { x: 510, y: 98, width: 516, height: 888 },
  direction: 'column', radius: 42, panelColor: '#ffffff',
},
stories: {
  panel: { x: 496, y: 514, width: 552, height: 946 },
  direction: 'column', radius: 42, panelColor: '#ffffff',
},
```

`column` empilha os produtos; `row` coloca lado a lado. Altere X/Y para mover o conjunto e largura/altura para redimensioná-lo. Os slots e separadores acompanham o painel. Para calibrar outro conjunto, adicione `pack-1` ou `pack-3`. Formatos ausentes herdam de `paidMedia.formats`.

Os campos de `paidMedia.card` usam frações do slot entre 0 e 1. As fontes usam um card de referência 629×377. Imagem e informações compartilham o centro vertical: o nome, preço, selo e texto legal formam um fluxo compacto. Ajuste `textGap` para aproximar ou afastar as informações. A lógica de cálculo permanece em `paid-media-layout.js` e `paid-media-text.js`; as medidas editáveis ficam no arquivo único.

## Composições de imagens

Em `imageLayouts`, cada composição tem `id`, `label` e `slots[2]` / `slots[3]`. Cada slot contém `[x, y, largura, altura]` em frações da área de imagens. Para mudar a margem da composição, use `banners.shared.imageComposition`.

## Aplicar e conferir

1. Edite `public/presets.js`, preservando vírgulas e chaves.
2. Recarregue a aplicação e crie novos criativos, ou use Restaurar layout/posições. Exporte antes os trabalhos da sessão: recarregar encerra a sessão atual.
3. Confira os formatos e publique uma nova versão para atualizar o site hospedado.

Na Mídia Paga, Restaurar posições remove os ajustes manuais de layout daquele formato, mantendo os produtos e o fundo escolhido.

```bash
node scripts/verify-unified-presets.mjs
node scripts/verify-formats.mjs
node scripts/verify-paid-media.mjs
```

Para executar localmente, use Node.js 22.13 ou superior e pnpm 11.25.0, execute `pnpm install` e `pnpm dev` e abra `/studio` no endereço indicado.
