# Continuidade — Anime Adventures

Última atualização: 26/10/2026 · assistente: Codex.

Este é o registro compartilhado para alternar entre os dois chats. Leia o arquivo, confira o código e observe o site antes de continuar. Atualize-o ao terminar cada ciclo. As instruções mais recentes do responsável prevalecem sobre o histórico.

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
- Até 10 posts e 30 comentários em posts por hora/conta; até 30 solicitações de amizade e 20 denúncias por dia UTC/conta. Cancelar pedidos ou apagar conteúdo não renova cotas.
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

## Estado e pendências desta publicação

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
| 26/10/2026 | Configuração do ambiente | Python/Node, dependências, testes do bot/wiki, build e instruções reutilizáveis preparados. |
| 26/10/2026 | Primeira versão da wiki/comunidade | Novo visual, posts com foto/texto, comentários, amizades, proteção de dados e 86 testes; código enviado à main em `6ed06b1`, site novo conferido em produção e CI de `1005b74` aprovado. OAuth humano e avaliação visual do responsável continuam como próximos passos. |
| 26/10/2026 | Continuidade entre chats | Criados este registro e `AGENTS.md`, publicados na main a pedido do responsável. Cada assistente deve ler e atualizar ao encerrar o ciclo. |
