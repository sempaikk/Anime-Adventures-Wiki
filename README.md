# Adventures Wiki

Wiki independente de Anime Adventures, com interface em português, artigos no idioma original, temas claro e escuro e artes do próprio jogo.

Site público: https://www.adventureswiki.workers.dev

## Desenvolvimento e verificação

Use Node 24:

```sh
npm ci
npm test
ASTRO_TELEMETRY_DISABLED=1 npm run build
node scripts/audit_site.mjs
npx wrangler deploy --dry-run
```

Para desenvolver a interface: `npm run dev`. Para conferir o site construído junto da API local: `npx wrangler dev --local` após o build.

O GitHub Actions verifica o código e a integridade do conteúdo. A integração Git da Cloudflare publica a branch `main`. O repositório pode permanecer privado; o endereço público da wiki continua acessível. O bot usa outra hospedagem e seus tokens e bancos não fazem parte deste projeto.

## Conteúdo e imagens

A coleção apresenta 661 artigos, com revisões textuais e apresentações preservadas, e um arquivo de 1.106 fontes, incluindo redirecionamentos, categorias, templates e módulos. A conferência de páginas públicas está registrada em `source/coverage-audit.json`. Páginas técnicas sem conteúdo de jogo e uma nova página sem informação enciclopédica utilizável ficam identificadas no arquivo, sem inventar informações para completar lacunas.

O catálogo distingue as formas, os nomes históricos documentados e as páginas atuais. Não atribui a foto de outra evolução para preencher uma ausência. Retratos faltantes são informados ao visitante. A biblioteca separa personagens, itens, modos, mecânicas, guias e tier lists e permite incluir as formas retiradas.

As mídias usadas nos artigos são hospedadas localmente. `source/media-library.json` registra a origem, dimensões e hashes. Animações extensas têm uma prévia estática sem perdas; o visitante pode carregar a animação original sob demanda. Não são utilizadas imagens geradas por IA nem ampliação artificial.

O build utiliza os arquivos presentes no repositório e não consulta a Fandom. `scripts/fetch_rendered.py` retoma a coleta com cache e intervalo entre consultas. `scripts/prepare_content.mjs` prepara o catálogo, os resumos e a busca; `scripts/audit_site.mjs` verifica links, imagens, âncoras e resíduos de marcação em todas as páginas construídas.

Veja [NOTICE.md](NOTICE.md) para créditos e licença dos textos, fontes tipográficas e imagens.

## Conta opcional

A leitura e os favoritos locais funcionam sem conta. A implementação de entrada com Discord e favoritos por conta utiliza um Worker e D1. Só é exibida como disponível depois que banco, migração e credenciais forem configurados na Cloudflare. Não há autenticação simulada na publicação sem essas configurações.

Veja [docs/cloudflare.md](docs/cloudflare.md) para publicar e ativar as contas.
