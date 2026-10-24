# Adventures Wiki

Wiki independente de Anime Adventures, com interface em português, artigos no idioma original, temas Adventures, Escuro e Claro e artes do próprio jogo.

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

A direção visual e os componentes estão documentados em [docs/design.md](docs/design.md).

## Conteúdo e imagens

A coleção apresenta 661 artigos, com revisões textuais e apresentações preservadas, e um arquivo de 1.106 fontes, incluindo redirecionamentos, categorias, templates e módulos. A conferência de páginas públicas está registrada em `source/coverage-audit.json`. Páginas técnicas sem conteúdo de jogo e uma nova página sem informação enciclopédica utilizável ficam identificadas no arquivo, sem inventar informações para completar lacunas.

O catálogo distingue as formas, os nomes históricos documentados e as páginas atuais. Não atribui a foto de outra evolução para preencher uma ausência. Quando o retrato atual falta, o site usa uma imagem anterior da própria wiki com identidade documentada para a mesma unidade e forma. `source/portrait-recovery.json` registra 11 referências recuperadas, com origem, hash e indicação no artigo. Se não houver uma imagem correta disponível, a ausência continua indicada. A biblioteca separa personagens, itens, modos, mecânicas, guias e tier lists e permite incluir as formas retiradas.

As mídias usadas nos artigos são hospedadas localmente. `source/media-library.json` registra a origem, dimensões e hashes. Animações extensas têm uma prévia estática sem perdas; o visitante pode carregar a animação original sob demanda. Os retratos e as mídias dos artigos preservam as imagens das fontes, sem ampliação artificial. A interface usa exclusivamente imagens editoriais da wiki do jogo, com cenários e retratos em camadas. `source/interface-art.json` documenta as imagens da interface e seus hashes; um teste confere a origem e os arquivos. Os atalhos originais e a revisão da folha de estilos estão registrados em `source/wiki-navigation.json`. Uma ilustração anterior criada com IA permanece arquivada em `source/site-artwork.json`, sem aparecer na interface atual.

O build utiliza os arquivos presentes no repositório e não consulta a Fandom. `scripts/fetch_rendered.py` retoma a coleta com cache e intervalo entre consultas. `scripts/prepare_content.mjs` prepara o catálogo, os resumos e a busca; `scripts/audit_site.mjs` verifica links, imagens, âncoras e resíduos de marcação em todas as páginas construídas.

Veja [NOTICE.md](NOTICE.md) para créditos e licença dos textos, fontes tipográficas e imagens.

## Conta opcional

A leitura e os favoritos locais funcionam sem conta. A implementação de entrada com Discord e favoritos por conta utiliza um Worker e D1. Só é exibida como disponível depois que banco, migração e credenciais forem configurados na Cloudflare. Não há autenticação simulada na publicação sem essas configurações.

Veja [docs/cloudflare.md](docs/cloudflare.md) para publicar e ativar as contas.

## Comunidade

Perfis começam privados; publicação e favoritos públicos são escolhas explícitas. Há diretório de pessoas, páginas públicas de perfil e comentários por artigo, com respostas, imagem estática, edição e exclusão pelo autor. Não há postagens, amigos, mensagens privadas, grupos ou ponte do chat nesta entrega.

A migração aditiva `0002_community.sql` é gerada para `worker/community-schema.mjs` pelo prebuild e aplicada idempotentemente na primeira requisição da comunidade. Não altera os dados de conta existentes. A lista de responsáveis é definida por `COMMUNITY_ADMIN_IDS`; somente essas contas acessam `/revisao/`, moderam comentários e publicam notas com fonte nos artigos.

As imagens enviadas por participantes são distintas das imagens editoriais: o navegador reduz PNG/JPG/WebP para uma imagem estática, com limite de 180 KB e 2.400 pixels por lado validado na API. Inicialmente ficam em BLOB no D1, com até 30 envios por conta/dia e orçamento de 200 MB para anexos. Uploads sem referência são removidos depois de um dia; ao atingir o orçamento, texto continua disponível. Para escala maior, a camada de armazenamento deve migrar para R2. Não há vídeos.

Os testes usam SQLite real e contas isoladas para verificar propriedade, visibilidade, respostas, moderação e exclusão da conta. O fluxo de autorização humana com o Discord precisa ser conferido na conta real; os testes não usam sessões de usuários da produção.
