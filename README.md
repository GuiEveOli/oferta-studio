# Oferta Studio

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

No painel Design, Tipo de oferta permite alternar Preço, Leve e Pague e Porcentagem. Mostrar selo Clube K é independente do modelo e não altera o preço. Porcentagem permite % OFF ou com até % OFF, com desconto inteiro de 1 a 100. A troca de modelo preserva valores, posições e cores previamente ajustados; desfazer/refazer inclui essas configurações.

Com duas ou três imagens do produto, Espaçamento horizontal (px) e o controle deslizante ajustam a distância entre as imagens, preservando tamanho, rotação e posição vertical. Valores negativos permitem sobreposição. O espaçamento usa o retângulo ajustado da imagem dentro de cada caixa; arquivos com margens transparentes próprias continuam incluindo essas margens.

Verificação adicional: `node scripts/verify-editor.mjs`.

A aba Design organiza as seções em menus expansíveis, com estado de abertura mantido durante a sessão. Em Imagens do produto, Escala do bloco (%) ajusta todas as imagens proporcionalmente pelo centro comum, incluindo a distância entre elas. O controle permite 25% a 250%, mantém a configuração ao trocar de criativo ou quantidade de imagens e participa do histórico de desfazer/refazer.

Durante o redimensionamento de textos, o evento de escala recalcula fonte, largura e quebras de linha no próprio objeto de texto, compensando a escala desigual nos caracteres. O modelo é confirmado ao terminar o gesto, mantendo a prévia em tempo real consistente com o resultado final.
