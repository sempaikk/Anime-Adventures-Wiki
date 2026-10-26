# Continuidade — Anime Adventures

Última atualização: 26/10/2026 · assistente: Codex.

Este é o registro compartilhado para alternar entre os dois chats. Leia o arquivo, confira o código e observe o site antes de continuar. Atualize-o ao terminar cada ciclo. As instruções mais recentes do responsável prevalecem sobre o histórico.

## Estado vigente — site pausado por tempo indeterminado

- **Decisão explícita do responsável em 26/10/2026:** substituir a interface pública por um fundo desfocado do jogo e o título alternando entre **Em breve** e **Coming soon**. Manter assim **por tempo indeterminado, até o responsável pedir a retomada**. Não há data de lançamento ou autorização para continuar o redesign.
- **Depois desta publicação, os dois chats devem trabalhar somente no bot** `sempaikk/Anime-Adventures`. Não alterar arquivos, configuração, interface ou publicação do site sem novo pedido explícito do responsável. Este estado prevalece sobre todas as autorizações e planos anteriores neste documento e em `docs/REDESIGN.md`.
- A implementação anterior, as fontes, imagens, dados e histórico Git estão arquivados e preservados. Nenhuma exclusão do banco D1, contas ou publicações foi pedida/executada. Preservar também variáveis, segredos, nome do Worker e bindings existentes.
- Publicação agora usa `maintenance/index.html`, `maintenance/style.css`, `scripts/build_coming_soon.mjs` e `worker/coming-soon.mjs`. `npm run build` gera somente a tela de espera, seus arquivos locais/créditos e os documentos legais do bot. Não publica a wiki, trailers, scripts antigos, login ou comunidade. Todas as páginas antigas mostram a espera; APIs ficam indisponíveis (503), sem ler/escrever dados, e o cron anterior está desativado.
- Fundo: captura documentada de Fabled Kingdom, original preservado, desfoque aplicado por CSS. Alternância suave a cada cinco segundos, sem JavaScript. Com movimento reduzido, os dois idiomas ficam estáticos e legíveis.
- Exceção necessária ao funcionamento do bot: `/bot/termos/` e `/bot/privacidade/` continuam disponíveis, com os mesmos arquivos, sem mudanças de conteúdo.
- `build:wiki` e `dev:wiki` preservam a implementação anterior apenas para uma futura retomada **autorizada**. Não os publicar nem restaurar a configuração antiga por iniciativa própria.
- Validação local: 103 testes Node aprovados; build e auditoria dos três documentos publicados sem falhas; Wrangler dry-run aprovado (Worker de 2,49 KiB). Chromium: 14 combinações de resolução/preferência de movimento, troca dos idiomas, páginas antigas, bloqueio da API, ausência de arquivos antigos e documentos legais byte a byte conferidos, sem transbordamento ou erros de navegador. A publicação e sua conferência online ainda estão em andamento; não confundir este registro com confirmação online.
- A mesma restrição está registrada em `AGENTS.md` e `CONTINUIDADE.md` do repositório do bot, enviada à main no commit `da96c3f58cc978856dc5508fb2cb93c7c31b15f3`, para orientar a troca entre os chats. Somente documentação foi alterada no bot; não houve nova implantação ou teste funcional do bot. O próximo trabalho de produto será definido pelas ideias do responsável para o bot.

## Ciclo anterior — redesign autoral (arquivado)

- O responsável autorizou implementar e publicar o novo conceito depois da discussão completa. Todos os pontos acumulados estão rastreados em [docs/REDESIGN.md](docs/REDESIGN.md); ler antes de editar. A ordem de execução conserva as etapas futuras.
- Wiki prioritária na entrada, comunidade integrada; abertura cinematográfica com consulta imediata, identidade própria relacionada às artes do jogo, cenários diferentes por destino, três temas e dois idiomas. Sem emojis e sem redação de fantasia.
- Implementados abertura e composição novas, navegação compartilhada, cenários por destino, ícones, tratamento de leitura, comunidade, catálogo e perfis. Inventário com 24 cenários disponíveis e 14 reservas decorativas distintas em `source/art-direction.json`. Capas enviadas pelos jogadores são preservadas; cartões sem capa própria usam composição gráfica.
- Novos recursos: rascunhos de texto por conta/assunto na aba, consultas recentes locais apagáveis, restauração da quantidade carregada no catálogo, fotos ampliáveis por teclado/clique, metadados de compartilhamento por conteúdo e publicações vinculadas opcionalmente a artigo, com feed relacionado.
- Migração **aditiva e idempotente** `0004_post_topics.sql`: tabela/índice para relacionar posts aos artigos, inicializados pelo Worker. Post e associação são gravados juntos. Testes conferem reversão em falha, limite existente, privacidade e reaplicação sobre dados antigos. Nenhuma dependência, serviço pago, segredo, binding ou alteração no bot.
- **Validação:** 100 testes Node aprovados e auditoria npm com zero vulnerabilidades. Build/localização/auditoria dos 2.062 documentos e Wrangler dry-run aprovados. Chromium: dois ciclos críticos, 225 combinações de tela/tema/largura e 2.744 renderizações das 1.372 rotas, todas HTTP 200, sem transbordamento ou erros JavaScript nessa varredura. Novos fluxos incluem rascunhos por identidade, publicação por artigo, ampliação de fotos e navegação com movimento.
- **Acervo:** 1.106 hashes brutos conferidos; números preservados nos 661 pares de artigos e marcadores de etapas iguais nos dois idiomas. Conferência estática sem IDs duplicados, fragmentos ausentes, controles sem nome ou português detectado na interface inglesa analisada.
- O último ajuste trata cancelamentos das transições nativas. Os corpos dos 2.062 documentos e os módulos JavaScript coincidem byte a byte com os usados na varredura completa; os ajustes finais estão no script do cabeçalho, seus hashes e na regra CSS de preferência das transições. Os fluxos completos passaram também na última compilação, incluindo movimento ativado/desativado e preferência de movimento reduzido, sem erros não tratados.
- **Código enviado à main:** `33c6c4de21c1f454f787de8b8ab1402eaf778a65`, confirmado por `git ls-remote`. [Verify wiki](https://github.com/sempaikk/Anime-Adventures-Wiki/actions/runs/40347174193) concluído com **success**, incluindo instalação, auditoria, 100 testes, build, auditoria dos documentos e Wrangler dry-run.
- **Publicação confirmada:** `fc8f2776e7ecf70f538a6128d79bcfd408733d4e`, que inclui o aplicativo de `33c6c4d` e o registro de continuidade. [Workers Builds: www](https://github.com/sempaikk/Anime-Adventures-Wiki/runs/121680499386) e [Verify wiki](https://github.com/sempaikk/Anime-Adventures-Wiki/actions/runs/40348936379) concluíram com **success**. A captura do responsável mostra essa implantação como **Ready**, versão Cloudflare `b3ab5c6c`, com 100% do tráfego. O build anterior aparece como Skipped; a implantação seguinte contém o mesmo redesign.
- **Conferência pública em 26/10/2026 às 13:28 (Brasília):** 12 páginas nos dois idiomas e todos os 37 arquivos de estilos/scripts do build responderam HTTP 200 e coincidiram byte a byte com o artefato validado (49 arquivos). Incluem início, comunidade, perfil, mapa, revisão e artigo de Iron Knight (Arsenal).
- **API de produção conferida sem conteúdo de teste:** sessão habilitada e visitante; feed público e feed por artigo responderam 200; feed de amigos respondeu 401 para visitante; artigo inválido respondeu 400. Nenhuma conta, sessão ou publicação sintética foi criada em produção.
- **Ocorrência anterior resolvida:** os checks da Cloudflare ainda apareciam em fila na conferência anterior; a tentativa de reexecução pela API retornou 403 por limitação da credencial. Posteriormente, a integração Git publicou `fc8f277` e os arquivos públicos confirmaram o resultado. Essa limitação da API não representa falha atual da publicação.
- Próximo passo: avaliação do responsável no site oficial e conferência humana do login Discord. Este novo registro altera apenas a documentação; as verificações online acima se referem à implantação `fc8f277`.
- Login humano pelo Discord, Safari/Firefox e aparelhos físicos não foram conferidos nesta sessão. As verificações com contas são locais e isoladas; não há fixtures em produção.
- IA continua como etapa própria: fontes selecionadas, coleta programada, comparação, revisão, histórico e cotas gratuitas ainda precisam ser configurados antes da ativação. Nenhum modelo ou serviço pago foi contratado.

## Ciclo anterior — correções da auditoria

- O responsável autorizou executar os 34 pontos e continuar publicando diretamente no site oficial.
- **Redação obrigatória:** português brasileiro e inglês dos Estados Unidos naturais, claros e profissionais. Sem gírias, fantasia ou chamadas exageradas, inclusive em títulos, descrições, avisos e erros. O futurismo vem do visual e das interações.
- Relação dos pontos e soluções: [docs/quality-review.md](docs/quality-review.md).
- Corrigidos alinhamentos, largura do rodapé, cartões, escala de leitura, ícone, textos, localização dos controles/dados, etapas dos personagens, endereços da comparação, menus, recuperação de falhas, fotos na moderação, ordenação de uploads e foco acessível.
- Favoritos/importações e comentários de artigos agora conferem capacidade na própria inserção. Nenhuma migração, dependência, binding pago ou mudança no bot foi adicionada.
- Regressões persistidas em `tests/quality.test.mjs`, `tests/accounts.test.mjs` e `tests/browser/quality.py`; servidor local isolado em `tests/helpers/browser-server.mjs`.
- **Validação deste ciclo:** 95 testes Node aprovados; build, localização e auditoria de 2.062 documentos sem falhas/avisos; Wrangler dry-run aprovado. Dois ciclos dos fluxos críticos e 225 combinações de tela/tema/largura passaram em Chromium. Varredura de 1.372 rotas em 390/1.680 pixels: 2.744 respostas 200, sem falhas, transbordamento ou erros JavaScript. Verificação adicional sem IDs duplicados, âncoras ausentes, controles sem nome ou textos portugueses detectados na interface inglesa analisada.
- **Preservação do acervo:** 1.106 hashes de fontes brutas conferidos; nenhuma diferença numérica entre os 661 pares de artigos; marcadores de etapas coincidem nos dois idiomas.
- **Código publicado:** `6155c230e0f0d44af61aa492195dfdfeae9eb23c`, enviado à main e confirmado por `git ls-remote`. GitHub Actions [Verify wiki](https://github.com/sempaikk/Anime-Adventures-Wiki/actions/runs/40309292739) e [Workers Builds: www](https://github.com/sempaikk/Anime-Adventures-Wiki/runs/121528108342) concluíram com **success**.
- **Conferência online em 26/10/2026 às 07:45 (Brasília):** 12 páginas públicas nos dois idiomas e todos os 36 arquivos de estilos/scripts do build responderam HTTP 200 e coincidiram byte a byte com o artefato validado. Incluem início, comunidade, perfil, mapa, revisão e o artigo de Iron Knight (Arsenal). `/api/session` indicou autenticação habilitada e visitante; o feed público respondeu 200, e o feed de amigos respondeu 401 para visitante, como esperado. Nenhum dado de teste foi criado em produção.
- Este registro de publicação é uma atualização de documentação; as verificações acima correspondem ao código do aplicativo em `6155c23`. Próximo passo: avaliação do responsável no site oficial e conferência humana do login Discord.
- O login humano pelo Discord, outros motores de navegador e aparelhos físicos continuam sem validação nesta sessão. Não prometer ausência absoluta de problemas.

## Projetos e publicação

- Site: `sempaikk/Anime-Adventures-Wiki`, site oficial do projeto em **https://www.adventureswiki.workers.dev**.
- Bot: `sempaikk/Anime-Adventures`. O código do bot não foi alterado nesta entrega.
- Hospedagem do site: Cloudflare Workers **Free**, Worker **www**, integração Git existente com a branch **main**.
- O responsável decidiu avaliar as mudanças diretamente no site oficial e ir ajustando. Ele autorizou a publicação desta entrega; não é necessário insistir em capturas locais antes de enviar esta versão.
- Banco existente: D1 `adventures-wiki`, binding `DB`. Preservar nome do Worker, integração Git, banco e variáveis/segredos existentes. O `keep_vars` permanece ativo.
- Os chats não sincronizam arquivos nem memória automaticamente. Antes de editar, conferir `git status`, buscar `origin/main` e incorporar o trabalho publicado pelo outro chat sem sobrescrever mudanças pendentes.

## Direção e escopo definidos pelo responsável

- Uma **wiki e comunidade de Anime Adventures**, integradas na experiência.
- Futurismo como identidade de composição, tipografia, luz, movimento e navegação. A referência de Vanguards serviu para discutir acabamento e organização; seu conceito de "sistema" não deve ser copiado.
- Usar artes, mapas, personagens e ícones documentados do próprio Anime Adventures, mantendo origem e créditos. Não existe personagem protagonista ou mascote único para representar o site.
- **Sem emojis na interface.** Usar vetores nas ações e ícones do jogo quando fizerem sentido. Isso não autoriza modificar o texto escrito pelos jogadores ou reescrever dados das fontes.
- Qualidade de vida: pesquisa, filtros, atalhos, fichas rápidas, comparação, favoritos, boa leitura e uso confortável no celular, com efeitos e transições coerentes.
- Manter os idiomas pt-BR/en-US, os temas Adventures/Escuro/Claro e as preferências de movimento. Sons são opcionais e começam desligados para novas pessoas.
- Comunidade: login Discord, perfis, feed cronológico Todos/Amigos, publicações com texto e uma foto opcional, comentários e amizades por solicitação/aceite.
- Fora desta etapa: vídeos em publicações, chat global, mensagens privadas e ponte com o bot. Curtidas não foram confirmadas e não entraram nesta entrega. Os trailers já arquivados não foram apagados.
- Custo zero é requisito. Não presumir contratação de R2, Cloudflare Images ou qualquer serviço pago. Se houver uma limitação concreta, explicar e propor alternativas; não retirar funcionalidades silenciosamente.

## O que foi implementado nesta entrega

- Nova abertura com vários personagens, cenário real do jogo, pesquisa, atalhos e publicações da comunidade.
- Nova composição visual compartilhada por artigos, catálogo, comunidade e perfis, com luz, profundidade, transições e controles vetoriais.
- Substituição de emojis dos controles, inclusive nas setas de seleção e mensagens de interação. Conteúdo da wiki e artes originais foram preservados.
- Publicações com texto/foto, edição e exclusão pelo autor, comentários, feed de amigos e publicações nos perfis.
- Solicitação, aceite, recusa/cancelamento e remoção de amizade.
- Denúncias de publicações e revisão pelo responsável já configurado, com opção de manter ou remover. Nenhum novo administrador foi definido.
- Controle de autoria e privacidade no servidor. Retirar a publicação de um perfil oculta seus posts; fotos usadas somente nesses posts deixam de ser públicas. Favoritos exigem autorização separada para exibição.
- Migração aditiva `0003_social.sql`, gerada com `0002_community.sql` no prebuild. O Worker inicializa o esquema idempotentemente; a migração base de contas continua sendo requisito.
- Cota de uploads conferida atomicamente para impedir que envios simultâneos ultrapassem o limite.
- Correção da tradução dos atributos de campos de texto, preservando o conteúdo autoral, inclusive depois de editar uma publicação que começou apenas com foto.
- Ajustes de cabeçalho, alvos de clique, restauração de foco, nomes acessíveis, movimento reduzido e falha no carregamento de avatares.

## Limites atuais da comunidade

- Uma foto por publicação, reduzida no navegador para até **180.000 bytes** e 1.600 pixels. O servidor aceita PNG/WebP estático e valida dimensões de até 2.400 pixels.
- Orçamento de fotos **compartilhado de 200 MB** para perfis, comentários e posts. Até 30 uploads por conta em 24 horas. Isso é uma decisão inicial da aplicação, não armazenamento ilimitado da Cloudflare.
- Até oito comentários de artigos por cinco minutos/conta. Até 10 posts e 30 comentários em posts por hora/conta; até 30 solicitações de amizade e 20 denúncias por dia UTC/conta. Cancelar pedidos ou apagar conteúdo não renova cotas.
- Listas paginadas, consultas com índices e nenhuma atualização automática contínua do feed. Nenhum binding pago novo foi adicionado.
- Quando as fotos atingem o orçamento, texto continua disponível enquanto houver capacidade de Workers/D1. Esgotar cotas da própria plataforma pode interromper a API; não há upgrade automático nesta implementação.

## Arquivos principais

| Área | Arquivos |
| --- | --- |
| Layout e navegação | `src/layouts/Layout.astro`, `src/components/Icon.astro`, `src/lib/icons.ts` |
| Abertura e visual | `src/components/WikiHome.astro`, `src/styles/future.css`, `src/scripts/future.ts` |
| Feed e perfis | `src/components/CommunityFeed.astro`, `src/pages/comunidade/index.astro`, `src/scripts/social.ts`, `src/scripts/profiles.ts` |
| API e dados sociais | `worker/social.mjs`, `worker/community.mjs`, `migrations/0003_social.sql` |
| Limpeza e esquema | `worker/maintenance.mjs`, `scripts/prepare_content.mjs`, `worker/community-schema.mjs` |
| Idiomas | `source/translations/future-en-US.json`, `scripts/localize_build.mjs`, `src/scripts/i18n.ts` |
| Testes sociais | `tests/social.test.mjs`, `tests/helpers/community.mjs` |
| Descrição detalhada | `docs/community-release.md`; `docs/design.md` também contém decisões históricas já substituídas |

## Validação já feita

- Node 24 e Python 3.12 disponíveis; instalação pelo lockfile, sem novas dependências.
- **86 testes automatizados da wiki aprovados**, incluindo 11 casos novos da API social com SQLite real.
- Auditoria npm: **zero vulnerabilidades** reportadas na preparação da publicação.
- Build completo, localização e auditoria de **2.062 documentos**, sem falhas ou avisos.
- Wrangler `deploy --dry-run` aprovado. Tamanho do Worker preparado: aproximadamente 127 KiB, 31 KiB compactado.
- Migrações D1 **locais** aplicadas; repetição confirmou ausência de novas migrações pendentes.
- Chromium: 60 combinações das cinco telas principais, três temas e quatro larguras, sem transbordamento horizontal após as transições.
- Fluxos exercitados com Worker compilado e sessões locais isoladas: ficha rápida, pesquisa, post com foto, comentário, edição/exclusão, solicitação/aceite de amizade, feed de amigos, perfil e visitante.
- Inglês, preservação de texto autoral, movimento reduzido, som desligado inicialmente e botão de conta acessível no celular conferidos. Nenhum erro JavaScript não tratado nos fluxos validados.
- Os 677 testes do bot passaram durante a configuração inicial do ambiente; isso não representa uma nova validação de produção nem uma alteração no bot nesta entrega.

## Registro da primeira publicação

- Base da wiki antes desta entrega: `86699de60983d19305d2cdbf7e1246a9abe690ff`. Conferir o histórico Git para os commits posteriores; não presumir que essa base continua sendo a ponta de `main`.
- **Código enviado ao GitHub/main:** `6ed06b17159c1ba0c6744b0d9fa86acf87a08807`. O envio foi confirmado por `git ls-remote`. A integração Git existente da Cloudflare deve construir/publicar essa versão.
- **Publicação online confirmada em 26/10/2026:** o site respondeu HTTP 200 com a nova abertura (`future-hero`), a nova comunidade (`data-social-feed`) e o artigo de Iron Knight (Arsenal). O CSS e os módulos consultados responderam HTTP 200.
- A API de produção respondeu `/api/session` com `enabled: true, user: null`; `/api/community/posts?feed=all` respondeu HTTP 200 com lista vazia e `next: null`; o feed de amigos respondeu HTTP 401 para visitante, como esperado. Nenhum post de teste foi criado em produção.
- O GitHub Actions **Verify wiki** do commit `1005b742b0467c5960dcd8f5f0026b05ae6f09a0` concluiu com **success**: https://github.com/sempaikk/Anime-Adventures-Wiki/actions/runs/40271657344 . Esse commit registra a continuidade e mantém o mesmo código do aplicativo de `6ed06b1`.
- O bloqueio de rede inicial foi resolvido: o domínio do site e a API do GitHub estão acessíveis. A credencial disponível permite consultar os checks do repositório, mas a listagem de GitHub Deployments retornou `Resource not accessible by integration` (HTTP 403); isso é uma limitação de permissão dessa API, não prova de falha da publicação. O resultado foi conferido diretamente pelo site público.
- Uma nova autorização humana pelo Discord não foi executada. Não afirmar que OAuth de produção passou apenas porque os testes isolados passaram. Verificar `/api/session` no site e solicitar uma conferência humana quando necessário.
- Nenhuma conta, sessão ou publicação sintética deve ir para o banco de produção. Os exemplos das capturas eram dados de teste em SQLite isolado.
- Os arquivos de imagem e anexos não apareceram no visualizador deste chat. O responsável preferiu seguir pelo site oficial. Não gastar outro ciclo repetindo a mesma forma de entrega de imagens.
- A branch local `codex/revisao-visual-20261026` foi preparada apenas com capturas, mas **não enviada**. Ela não é a entrega do aplicativo e não deve ser usada como base para substituir o código atual.
- O diretório local `docs/revisao-visual/` contém exportações de revisão, está ignorado pelo Git e não faz parte do envio do aplicativo.

## Como retomar no próximo chat

1. Ler este arquivo e `AGENTS.md`; conferir `git status`, `git log` e `origin/main`.
2. Consultar o site oficial, comparar com o código publicado e entender o pedido mais recente do responsável.
3. Trabalhar no checkout existente, preservando mudanças do outro chat e dados do site. Não recriar o projeto nem substituir imagens ou dados por aproximações.
4. Testar os fluxos afetados. `npm run dev` mostra a interface, mas não inclui a API Worker; os fluxos de conta exigem o Worker e configuração adequada ou testes isolados.
5. Atualizar este resumo e o histórico abaixo com o que realmente foi feito, testes, commits, publicação, limitações e próximo passo. Nunca registrar valores de segredos.

## Histórico resumido

| Data | Ciclo | Resultado |
| --- | --- | --- |
| 26/10/2026 | Pausa por tempo indeterminado | A pedido do responsável, substituir o site por fundo desfocado e Em breve / Coming soon. Preservar dados e histórico; manter documentos legais do bot. Depois desta entrega, somente o bot pode ser alterado, até nova autorização explícita para o site. |
| 26/10/2026 | Configuração do ambiente | Python/Node, dependências, testes do bot/wiki, build e instruções reutilizáveis preparados. |
| 26/10/2026 | Primeira versão da wiki/comunidade | Novo visual, posts com foto/texto, comentários, amizades, proteção de dados e 86 testes; código enviado à main em `6ed06b1`, site novo conferido em produção e CI de `1005b74` aprovado. OAuth humano e avaliação visual do responsável continuam como próximos passos. |
| 26/10/2026 | Continuidade entre chats | Criados este registro e `AGENTS.md`, publicados na main a pedido do responsável. Cada assistente deve ler e atualizar ao encerrar o ciclo. |
| 26/10/2026 | Correções dos 34 pontos da auditoria | Layout, redação, idiomas, navegação, interação social, acessibilidade e concorrência corrigidos em `6155c23`. 95 testes, 225 combinações visuais e 2.744 renderizações de rotas aprovados; CI e Cloudflare aprovados; 48 arquivos públicos coincidem com o build validado. OAuth humano permanece sem conferência. |
| 26/10/2026 | Redesign autoral | Nova composição, cenários distintos, recuperação de texto e navegação, fotos ampliáveis e posts relacionados à wiki. Requisitos em `docs/REDESIGN.md`; 100 testes Node e verificações de navegador aprovados. Código `33c6c4d` publicado pela implantação de `fc8f277`, com CI/Cloudflare aprovados e 49 arquivos públicos idênticos ao build validado. OAuth humano segue sem conferência. |
