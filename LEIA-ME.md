# Oferta Studio — código-fonte completo

Este pacote contém a versão publicada em 30/10/2026, incluindo os seis layouts de posicionamento das imagens.

## Como executar

1. Extraia o ZIP e abra a pasta `oferta-studio` no terminal ou no VS Code.
2. Use Node.js 22.13.0 ou superior, conforme `package.json`.
3. Instale o gerenciador e as dependências:

```bash
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

4. Abra o endereço mostrado no terminal (por padrão, http://localhost:5173).

Para gerar a versão de produção:

```bash
pnpm build
pnpm start
```

O comando `start` usa o ambiente local do Cloudflare Wrangler. O projeto inclui uma rota de servidor para carregar imagens externas: abrir somente o HTML diretamente não substitui a execução completa.

## Arquivos principais

- `public/studio.html`: estrutura da interface.
- `public/studio.js`: editor Fabric, templates, controles e exportação.
- `public/studio.css`: estilos e fontes.
- `public/offers-data.js`: leitura e cruzamento das informações dos produtos com os preços.
- `public/assets/`: imagens, selo Clube K, fontes Cocogoose e dados pré-carregados.
- `public/vendor/`: bibliotecas utilizadas pela interface.
- `app/api/image/route.ts`: carregamento de imagens externas.
- `scripts/verify-*.mjs`: verificações automatizadas.

## Recursos incluídos

- Vertical 720 × 1281, Panorâmico 1512 × 720 e Mini 720 × 288.
- Duas planilhas cruzadas por SKU e filtro por capa/cluster.
- Mecânicas Preço, Leve e Pague e Porcentagem, com selo Clube K independente e checkbox “com até”.
- Fontes Cocogoose, controles de tipografia, seleção múltipla, alinhamento e distribuição.
- Uma, duas ou três imagens, seis composições, escala e espaçamento do bloco.
- Histórico por criativo e exportação PNG/JPG/WEBP, com ZIP para lotes.
- Nome das imagens exportadas: “Formato Número - SKU”.

## Para enviar ao GitHub

Crie um repositório na sua conta e envie o conteúdo da pasta `oferta-studio`, incluindo os arquivos de configuração. O pacote não inclui a pasta `.git`, dependências instaladas nem cache de compilação. A configuração `.openai/hosting.json` identifica o site atual no ChatGPT; ela não contém credenciais e não cria publicação automática no seu GitHub.

## Dados e sessão

Os arquivos JSON em `public/assets/` incluem os catálogos e preços pré-carregados atualmente no site. Caso você pretenda tornar o repositório público, pode substituí-los antes de publicar.

As edições dos criativos ficam na sessão do navegador. O pacote contém o aplicativo e os presets; ajustes feitos em uma aba aberta do navegador não são transferidos para este ZIP.

As fontes e imagens fornecidas foram mantidas no pacote. Acompanhe suas respectivas permissões de uso ao redistribuí-las.

O README original do projeto também está incluído; para iniciar esta versão, siga este arquivo LEIA-ME.
