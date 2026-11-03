# Oferta Studio

**Arquivo único de presets:** `public/presets.js` reúne Banners Site, Mídia Paga, SuperKoch, Komprão e composições de imagens. Veja exemplos e instruções em [GUIA-DE-TEMPLATES.md](GUIA-DE-TEMPLATES.md).

Diagramador de ofertas em português. A aplicação importa Excel/CSV, mantém as alterações na sessão da aba e gera criativos editáveis de 720 × 1281 px com Fabric.js 6.9.0.

## Fluxo

1. Carregue separadamente as planilhas de informações e de preços, ou use os arquivos já disponibilizados na tela inicial.
2. Cruze as fontes pelo SKU e confira o resumo das pendências.
3. Escolha o preset vertical, filtre por capa/cluster e selecione as ofertas.
4. Edite cada prancheta e exporte PNG, JPG ou WEBP; lotes são reunidos em ZIP.

Informações: H = SKU, I = nome, T = URL da imagem. Preços: I = SKU, H = tipo, K = preço varejo, N = preço fidelidade, T = quantidade Pague, U = quantidade Leve, Z = capa/cluster. O preço do catálogo é sempre ignorado.

- Normal: K, sem selo.
- Club Koch: N e selo Clube K; N ausente não usa K como substituto.
- MercaPromo Pague e Leve: LEVE U / PAGUE T, selo e texto legal editável da referência. Não mostra preço monetário.

SKUs sem correspondência, nomes conflitantes, preços/quantidades inválidos e tipos de oferta ainda sem regra são listados como pendências e excluídos da diagramação. Linhas idênticas entre lojas são agrupadas, mantendo separadas ofertas com valores ou capas diferentes. Múltiplas imagens de um SKU com o mesmo nome ficam disponíveis no seletor; a primeira é a imagem inicial.

O selo está em `public/assets/clube-k.png`. Novas URLs públicas passam por `/api/image`, com validação de host, formato, tamanho e redirecionamentos. As edições e arquivos importados pelo visitante permanecem no navegador, durante a sessão; recarregar encerra essa sessão. Trocar criativo ou formato mantém os ajustes; cruzar fontes alteradas pede confirmação antes de reiniciar os criativos.

## Desenvolvimento

Interface em `public/studio.html`, `public/studio.css` e `public/studio.js`; regras de importação compartilhadas com os testes em `public/offers-data.js`. O projeto usa o starter Vinext com a integração Sites.

Validação: `node scripts/verify-import.mjs` e `node scripts/verify-selection.mjs`.

Para atualizar as duas fontes disponibilizadas na tela inicial: `node scripts/prepare-offer-sources.mjs <catalog.xlsx> <prices.xlsx>`. A fonte atual de informações é a anterior; ela corresponde a 18 SKUs da nova campanha. Os registros faltantes aparecem no resumo para carregamento de catálogo completo.

## Seleção e organização

Use Shift + clique ou arraste a partir de uma área vazia da prancheta para selecionar vários elementos. As caixas no painel Camadas e o botão Selecionar todos também permitem compor a seleção. Clique na área externa à prancheta ou pressione Esc para desmarcar.

Com vários elementos selecionados, o painel Design oferece seis alinhamentos relativos à seleção ou à prancheta, distribuição de espaçamento horizontal/vertical (três ou mais elementos), ordem de camadas, duplicação e exclusão. Arraste, redimensione, rotacione ou use as setas para transformar a seleção em conjunto. As operações entram no histórico do criativo. Elementos ocultos ou bloqueados não participam.

Validação das operações: `node scripts/verify-selection.mjs`. A área de edição tem uma linha de grid limitada à altura disponível; o zoom de ajuste desconta o padding real para evitar crescimento cumulativo da prancheta.

## Controles do diagramador

A prévia usa pelo menos 2 pixels internos por pixel de tela, respeitando telas com densidade maior. A exportação mantém 720 × 1281 px. Textos e grupos do criativo são desenhados sem cache bitmap, e os pesos de fonte usados são carregados antes da renderização.

No painel Design, Tipo de oferta permite alternar Preço, Pague e Leve e Porcentagem. Mostrar selo Clube K é independente do modelo e não altera o preço. Porcentagem permite % OFF ou com até % OFF, com desconto inteiro de 1 a 100. A troca de modelo preserva valores, posições e cores previamente ajustados; desfazer/refazer inclui essas configurações.

Com duas ou três imagens do produto, Espaçamento horizontal (px) e o controle deslizante ajustam a distância entre as imagens, preservando tamanho, rotação e posição vertical. Valores negativos permitem sobreposição. O espaçamento usa o retângulo ajustado da imagem dentro de cada caixa; arquivos com margens transparentes próprias continuam incluindo essas margens.

Verificação adicional: `node scripts/verify-editor.mjs`.

A aba Design organiza as seções em menus expansíveis, com estado de abertura mantido durante a sessão. Em Imagens do produto, Escala do bloco (%) ajusta todas as imagens proporcionalmente pelo centro comum, incluindo a distância entre elas. O controle permite 25% a 250%, mantém a configuração ao trocar de criativo ou quantidade de imagens e participa do histórico de desfazer/refazer.

Durante o redimensionamento de textos, o evento de escala recalcula fonte, largura e quebras de linha no próprio objeto de texto, compensando a escala desigual nos caracteres. O modelo é confirmado ao terminar o gesto, mantendo a prévia em tempo real consistente com o resultado final.

## Presets de cores e menus

Edite `public/presets.js` para alterar ou adicionar presets de cores. Cada item usa `id` único, `label`, `background` e `backgroundEnd`. O menu e as amostras de cor são gerados a partir dessa lista. Encarte mantém as cores originais; Final de Semana usa #0092de e #0039d5. O checkbox de degradê, a imagem e seu ajuste permanecem independentes do preset. Alterações manuais de cor são identificadas como Personalizado.

Os dropdowns animados compartilhados ficam em `public/dropdowns.js` e usam as classes `.pretty-select` de `public/studio.css`. Mantêm o select original como fonte dos eventos de mudança e oferecem setas, Home/End, Enter, Escape, Tab e busca digitada. A animação respeita a preferência de movimento reduzido.

## Nome da campanha e Pague e Leve

O nome inicial da campanha vem do nome da planilha de preços e mecânicas. Por exemplo, `Relatório_Importação_(sem_segmento)_-_Acordos_Comerciais_Cluster-20217-29-10-2026-16_14.xlsx` gera `Campanha 20217`. O número depois de `Cluster-` tem prioridade; datas e horários não viram identificadores. Sem número reconhecível, o nome fica `Campanha`. O campo continua editável durante a sessão.

Os tipos `Pague e Leve` e `Leve e Pague` são equivalentes. O nome principal exibido é `Pague e Leve`. A mecânica usa U como Leve e T como Pague, com validação de inteiros positivos e U maior que T, e inclui o texto legal. Seu selo Clube K inicia desligado. `MercaPromo Pague e Leve` mantém o selo ligado. Ofertas com e sem selo não são agrupadas como duplicadas.


## Workspace Mídia Paga

A navegação possui Banners Site (fluxo anterior) e Mídia Paga. A Mídia Paga mantém suas próprias fontes importadas, título, conjuntos e histórico durante a sessão. Pode reutilizar as fontes disponibilizadas ou as fontes carregadas em Banners Site, sem alterar os criativos desse workspace.

- Conjunto 1: 2 produtos; Conjunto 2: 3 produtos; Conjunto 3: 2 produtos.
- Cada conjunto gera Feed (1080 × 1080), Stories (1080 × 1920) e Horizontal (1200 × 628): nove PNGs no total.
- Clique no slot da prévia ou no card de slot para selecionar uma oferta por SKU/nome e capa. A seleção se repete nos três formatos do conjunto.
- Editar formato abre uma prancheta com elementos arrastáveis/redimensionáveis, camadas e campos de posição, dimensões, cor e texto. Esses ajustes são exclusivos do formato. Informações vinculadas altera nome, preço/quantidades e selo nos três formatos, preservando suas posições.
- Os cards seguem a quarta referência: imagem à esquerda, nome e oferta à direita; selo condicionado à oferta. Pague e Leve inclui o texto legal. Não há preço antigo riscado por padrão.
- Fundos permitem cor ou imagem por formato e aplicação aos três formatos do conjunto.
- Exportar conjunto gera três imagens; Exportar 9 imagens gera um ZIP organizado por conjunto, com dimensões e SKUs no nome. O ZIP só é gerado com todos os slots preenchidos e imagens carregadas. O link Baixar novamente permanece na sessão após a geração.

### Onde editar posições e quantidade de produtos

`public/presets.js` é a configuração central. `OFERTA_PRESETS.paidMedia.packs[].count` define o número inicial de slots por conjunto; `formats` define dimensões, painel `{x, y, width, height}`, arredondamento e direção; `card` define posição e tamanho de imagem, nome, oferta, selo e legal em proporções do slot. Os campos `x`, `y`, `width`, `height` e `fontSize` são nomeados; a fonte usa uma referência de card de 629 × 377. `getSlots(format,count)` calcula os slots e pode ser substituído por coordenadas fixas.

O editor também permite alterar a quantidade de produtos do conjunto entre 1 e 6, reorganizando os três formatos. Reduções pedem confirmação e podem ser desfeitas. Alterações no arquivo de configuração valem em uma nova sessão; não deslocam silenciosamente os elementos já editados.

Implementação independente: `public/paid-media.js`; aparência: `public/paid-media.css`. Teste: `node scripts/verify-paid-media.mjs`.

### Orientação, posição, escala e fundos rápidos

Em Configurações do conjunto → Posição e escala do conjunto, escolha o formato, a orientação Horizontal/Vertical, X/Y em pixels reais e escala de 10% a 200%. A transformação inclui imagens, nomes, ofertas, selos, texto legal, painel e divisórias. A escala usa o canto superior esquerdo como origem; Centralizar na prancheta centraliza o bloco inteiro. Trocar orientação reorganiza os slots e ajusta inicialmente o painel para caber na prancheta. Cada formato mantém seus próprios valores e os ajustes entram no histórico.

A geometria fica isolada em `public/paid-media-layout.js` (`get`, `frame`, `slots`, `apply`), usando os presets de `public/presets.js`. Os modelos dos nós são transformados junto com o painel, de modo que seleção de slots, edição individual e exportação compartilham as mesmas posições. Substituições de produto preservam os ajustes e posicionam selos/legais novos na geometria atual.

Fundos do conjunto abre um popup com as três prévias do conjunto atual. Cada formato oferece cor, envio/troca/remoção de imagem, exibição do painel e cor do painel. A imagem preenche a prancheta com recorte proporcional (cover). As edições ficam em um rascunho até Aplicar fundos; Cancelar, fechar ou Esc descarta o rascunho. Aplicar altera somente os fundos do conjunto atual, com um passo de desfazer. Os canvases do popup são descartados ao fechar.

### Textos compactos e atualização sem piscadas

Na Mídia Paga, o nome usa Cocogoose Pro Semilight (peso 350, `public/assets/fonts/cocogoose-pro-semilight.ttf`); a mecânica usa `LEVE X\nPAGUE Y`. `public/paid-media-text.js` mede os textos com a fonte carregada e ajusta a caixa ao conteúdo, mantendo a largura máxima para quebra de linhas. Nome, oferta, selo e texto legal seguem um fluxo vertical com espaço definido por `textGap` em `public/presets.js`. Um nome de uma linha aproxima a oferta e o selo; nomes maiores deslocam os itens seguintes. Deslocamentos manuais são preservados em `flowOffsetY`.

Os controles de posição/escala mantêm os canvases existentes. O conteúdo anterior continua visível enquanto os novos objetos são preparados; a troca ocorre em uma única pintura, somente no formato alterado. Campos sem mudança de valor não geram renderização nem histórico. As caixas dos controles também permanecem montadas durante a edição.


O bloco completo de informações (nome, oferta, selo e texto legal) é centralizado verticalmente no slot, junto à imagem. A imagem também usa o centro do painel do produto. O espaçamento entre os itens continua compacto e é recalculado conforme a altura real do nome. O centro permanece estável ao alternar nomes curtos/longos, selos e mecânicas, inclusive na exportação.

## Bandeiras: SuperKoch e Komprão

O seletor acima de Workspace inicia em SuperKoch. A interface usa azul escuro para SuperKoch e vermelho para Komprão. SuperKoch mantém Banners Site e Mídia Paga; Komprão disponibiliza somente Banners Site. As planilhas, seleção, campanha, criativos, ajustes e histórico de Banners Site são mantidos separadamente por bandeira durante a sessão. Trocar bandeira não modifica os criativos existentes da outra bandeira. Recarregar a página encerra as duas sessões.

Configuração: `public/presets.js`. As logos enviadas aparecem abaixo do switch e são definidas pela propriedade `logo`. O switch desliza com degradê azul/vermelho, enquanto a paleta da interface interpola em 650 ms; respeita a preferência de movimento reduzido. No Komprão, os três formatos usam fundo `#E4002B`, botão `#FDD000` e texto do botão vermelho. A forma do preço usa o SVG fornecido (`public/assets/komprao-price-shape.svg`) em amarelo `#FDD000`, com preço e mecânicas em vermelho `#E4002B`. O campo **Texto do preço** permite personalizar essa cor separadamente. Os textos Komprão usam Cera Pro: Black como peso padrão em todos os textos, com altura de linha 0,8. Esses padrões também valem para textos novos e são editáveis em `OFERTA_PRESETS.brands.komprao.typography` (`public/presets.js`). As três fontes ficam em `public/assets/fonts/cera-pro-*.ttf`. O campo **Faixa de preço** ou a cor do elemento selecionado personaliza o preenchimento do vetor; a geometria permanece vetorial na prévia e na exportação. As posições continuam em `public/presets.js`.

A paleta da interface fica em `public/brand-ui.css`; as propriedades primárias são aplicadas pelo perfil de bandeira e as tonalidades de apoio usam variáveis CSS. As cores da interface não recolorem imagens, fontes ou criativos. Verificação: `node scripts/verify-brands.mjs`.
