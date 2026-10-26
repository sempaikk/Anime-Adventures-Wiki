# Adventures Wiki

**Site pausado por tempo indeterminado, até o responsável pedir a retomada.** A publicação contém somente um fundo desfocado do jogo e **Em breve / Coming soon**. Após esta entrega, os dois chats trabalham apenas no bot; nenhuma outra alteração no site está autorizada. Consulte [CONTINUIDADE.md](CONTINUIDADE.md). O restante deste README descreve a implementação arquivada.

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

`npm run build` constrói a tela de espera; `npm run dev` e `npm run preview` usam o Worker de espera local. `npm run build:wiki` e `npm run dev:wiki` preservam o aplicativo anterior apenas para uma retomada autorizada; esse aplicativo não é a publicação vigente.

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

A comunidade tem publicações públicas com texto e uma foto opcional, comentários e amizades por solicitação e aceite. O feed tem Todos e Amigos, com ordem cronológica, e os perfis reúnem publicações, contribuições e favoritos autorizados. Ler não exige conta; publicar e comentar exigem login Discord e perfil publicado explicitamente. Retirar a publicação do perfil oculta suas publicações; fotos usadas somente nelas também deixam de ser públicas. Textos dos jogadores são preservados e nunca traduzidos automaticamente.

Esta entrega não inclui vídeos em publicações, chat global, mensagens privadas ou ponte com o bot. O trabalho audiovisual já arquivado permanece separado. O visual utiliza somente artes documentadas de Anime Adventures e ícones vetoriais para controles, sem emojis na interface. Sons da interface são opcionais e começam desligados para novos visitantes.

O destino continua sendo Cloudflare Workers Free com D1, sem R2, Images ou novos bindings pagos. Imagens são reduzidas no navegador para até 180 KB e 1.600 pixels; o servidor valida PNG/WebP estático e dimensões de até 2.400 pixels. O orçamento compartilhado de fotos de perfil, comentários e publicações é de 200 MB, com até 30 uploads por conta/dia. A reserva é conferida atomicamente no banco. Esgotar fotos preserva publicações de texto; esgotar cotas do próprio Workers/D1 pode indisponibilizar a API. Este orçamento inicial não é uma promessa de armazenamento ilimitado.

São permitidas até dez publicações e trinta comentários em publicações por hora/conta. Há até trinta solicitações de amizade e vinte denúncias por dia UTC/conta. Excluir conteúdo ou cancelar pedidos não renova essas cotas. Paginação, índices e ausência de consulta automática contínua limitam consumo. A manutenção diária retém anexos de publicações ativas, inclusive ocultas pela moderação, e remove fotos abandonadas depois de um dia.

`migrations/0003_social.sql` é aditiva e entra em `worker/community-schema.mjs` no prebuild, junto de `0002_community.sql`. O Worker aplica o esquema idempotentemente ao iniciar a comunidade. A migração base `0001_accounts.sql` e a configuração OAuth continuam sendo pré-requisitos da conta. O mesmo responsável definido em `COMMUNITY_ADMIN_IDS` pode revisar denúncias no feed e manter ou remover publicações; nenhuma nova conta recebe permissão administrativa.

Os testes usam SQLite real e contas isoladas para verificar publicações, autoria, imagens, privacidade, amizades, denúncias, cotas e exclusão da conta. A aprovação visual desta proposta e a autorização humana real pelo Discord continuam sendo verificações separadas. Consulte [a proposta e as instruções de revisão](docs/community-release.md).
