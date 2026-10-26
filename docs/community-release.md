# Proposta: wiki e comunidade de Anime Adventures

Esta direção será avaliada e ajustada pelo responsável diretamente no site, conforme sua decisão de publicar a primeira versão. Futurismo, artes documentadas do jogo e ferramentas de consulta formam uma identidade própria; a referência de Vanguards não é um modelo a copiar. Diferentes personagens compartilham a abertura, sem mascote ou protagonista único.

## Experiência

- Início com personagens, cenários reais, pesquisa, atalhos da wiki e publicações da comunidade. As fichas rápidas continuam acessíveis pelos retratos.
- Artigos com leitura preservada, infobox, índice, comparação, favoritos e comentários.
- Feed cronológico Todos/Amigos, publicações com até 2.000 caracteres e uma foto opcional, edição/exclusão pelo autor e comentários de até 1.000 caracteres.
- Perfis com publicações, contribuições e favoritos autorizados. Amizades exigem solicitação e aceite; pedidos podem ser recusados/cancelados e amizades podem ser removidas.
- Denúncias de publicações com revisão pelo responsável já configurado, que pode manter ou remover o conteúdo.
- Temas Adventures, Escuro e Claro, pt-BR/en-US, controles de teclado, movimento reduzido e som opcional. Textos dos jogadores nunca são traduzidos.
- Ícones vetoriais nos controles; ícones originais do jogo nas categorias. Nenhum emoji é usado como ícone de interface.

Vídeos de participantes, chat global, mensagens privadas, ponte com o bot e curtidas não fazem parte desta proposta. O arquivo de trailers existente não foi removido.

## Cloudflare Free

Nenhuma dependência, serviço pago, R2, Images ou binding de cobrança foi adicionado. O código usa Workers e o D1 já configurado. O armazenamento de mídia tem orçamento inicial compartilhado de 200 MB; imagens são comprimidas no navegador e limitadas no servidor a 180.000 bytes. Texto continua disponível quando o armazenamento de fotos se esgota, enquanto houver capacidade de Workers/D1. Esgotar cotas da plataforma pode interromper a API; não existe upgrade automático nesta implementação.

O limite de fotos é um compromisso desta primeira entrega. Não oferece armazenamento ilimitado nem preservação de fotografias em resolução original. Há até 30 uploads por conta em 24 horas; solicitações de amizade e denúncias têm limites de 30 e 20 por conta/dia UTC, respectivamente. Publicações e comentários têm limites por hora. Cancelamentos e exclusões não renovam cotas.

## Dados e acesso

A leitura da wiki permanece independente do login. A comunidade usa a identidade Discord existente e exige perfil publicado para escrever. Somente publicações de perfis publicados entram no feed; retirar a publicação do perfil também retira suas publicações do acesso público. Fotos usadas somente nessas publicações também deixam de ser públicas. Favoritos só aparecem se autorizados separadamente. Excluir a conta remove os registros sociais por integridade referencial.

O prebuild gera `worker/community-schema.mjs` a partir de `0002_community.sql` e `0003_social.sql`. A inicialização aplica o esquema aditivo idempotentemente. A base de contas `0001_accounts.sql` e a configuração OAuth continuam sendo requisitos do ambiente de publicação. Não executar migrações remotas ou publicar durante a revisão local.

## Desenvolvimento e revisão

```sh
npm ci
npm test
ASTRO_TELEMETRY_DISABLED=1 npm run build
node scripts/audit_site.mjs
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply adventures-wiki --local
npx wrangler dev --local
```

`npm run dev` permite revisar a interface, mas não inclui a API Worker. Para conferir contas e publicações, use o Worker após o build com configuração OAuth válida, ou um ambiente de teste isolado com SQLite e sessões sintéticas. Nunca inserir contas ou atividade de teste na produção. Os testes automatizados da API não comprovam uma nova autorização humana pelo Discord.

Conferir início, artigo com upgrades, catálogo, feed e perfil em 320/390/768/1440 px, nos três temas e com movimento reduzido. Verificar ficha rápida, pesquisa, comparação, publicação com foto, edição, comentário, solicitação/aceite/remoção de amizade, denúncias e menus pelo teclado. Avaliar tanto estados vazios quanto contas e conteúdo reais ou explicitamente identificados como teste local.

## Validação desta proposta

- 86 testes automatizados aprovados, incluindo 11 casos novos da API social com SQLite real.
- 60 combinações das cinco telas principais, três temas e quatro larguras conferidas no Chromium, sem transbordamento horizontal após conclusão das transições.
- Fluxos exercitados com o Worker compilado e sessões locais isoladas: ficha rápida, busca, publicação com foto, comentário, edição/exclusão, solicitação/aceite de amizade, feed de amigos e perfil.
- Interface inglesa conferida, incluindo atributos dos campos; texto autoral preservado ao editar uma publicação que começou somente com foto.
- Visitante, movimento reduzido e som desligado por padrão conferidos.
- Build, auditoria de 2.062 documentos sem falhas/avisos, migrações locais repetíveis e empacotamento Wrangler com `--dry-run` aprovados.

Os resultados acima são verificações locais. A confirmação da publicação na Cloudflare, uma autorização OAuth humana e a avaliação visual do responsável são verificações separadas.
