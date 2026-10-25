# Publicação na Cloudflare

Produção: https://www.adventureswiki.workers.dev

O repositório `sempaikk/Anime-Adventures-Wiki` é privado. O site permanece público na Cloudflare. A hospedagem e os dados do bot continuam separados.

## Integração com GitHub

O Worker `www` deve continuar conectado ao repositório. Ao renomear a aplicação pelo painel, preserve a conexão Git existente e mantenha o nome igual ao campo `name` em `wrangler.jsonc`. Alterar somente o arquivo de configuração pode criar um Worker diferente ou impedir o build, por isso o nome do projeto no painel precisa corresponder antes da publicação. Configuração:

- Build: `npm run build`
- Deploy: `npx wrangler deploy`
- Branch de produção: `main`
- Diretório raiz: raiz do repositório
- Node: `24`, conforme `.node-version`
- Dependências: o lock é conferido no CI também com npm `10.9.2`, usado pela hospedagem. A atualização de segurança do Undici usa uma regra para a versão `7.29.1`, compatível com npm 10 e 11; não a condicione à versão beta do Miniflare.
- Cloudflare Access: desligado para o endereço público

Não configure `SITE_BASE`: a Cloudflare publica na raiz `/`. `wrangler.jsonc` fornece o Worker e os arquivos estáticos em `dist`. Cada push inicia uma publicação. A integração deve conservar acesso ao repositório privado. Não é necessária uma credencial Cloudflare no GitHub Actions.

O endereço Production é o endereço permanente para compartilhar. Preview identifica uma versão para conferência e não substitui o link de produção.

## Ativar contas com Discord

O site funciona sem login. A API informa `enabled: false` enquanto a configuração estiver incompleta. A interface não oferece um login que ainda não pode funcionar.

### Banco D1

1. O banco `adventures-wiki` foi criado; o binding `DB` e o identificador já estão registrados no `wrangler.jsonc`.
2. Aplique `migrations/0001_accounts.sql` no console SQL desse banco. Outra opção, com o Wrangler autenticado na conta correta, é `npx wrangler d1 migrations apply adventures-wiki --remote`.
3. Mantenha o binding no arquivo de configuração para que publicações futuras o preservem.

Formato da configuração (o identificador real já está no arquivo):

```json
"d1_databases": [{
  "binding": "DB",
  "database_name": "adventures-wiki",
  "database_id": "ID-REAL-DO-BANCO",
  "migrations_dir": "migrations"
}]
```

### Discord e segredos

Na aplicação Discord `1561527465657114644`, em OAuth2, autorize exatamente este redirect:

`https://www.adventureswiki.workers.dev/api/auth/callback`

Em Settings → Variables and Secrets do Worker, crie os segredos:

- `DISCORD_CLIENT_SECRET`: Client Secret de OAuth2 da aplicação Discord. Não é o token do bot.
- `SESSION_SECRET`: valor aleatório de pelo menos 32 caracteres, criado por um gerador de senhas seguro.

Cadastre os valores diretamente no painel, como Secret. Não envie segredos em conversa, não adicione ao repositório e não os configure como comando de build. `APP_ORIGIN` e `DISCORD_CLIENT_ID` são valores públicos já fornecidos pelo Wrangler. `keep_vars` preserva variáveis cadastradas no painel.

### Conferência após ativação

Acesse `/conta/`, entre com Discord e confirme um favorito em outro dispositivo. Confira também cancelamento, saída, importação dos favoritos locais e exclusão dos dados do site. Os testes automatizados usam Discord simulado e SQLite temporário; eles não substituem esta confirmação na conta real.

Só é solicitado `identify`: identificação básica, nome de exibição e avatar. Tokens Discord não são persistidos. Sessões do site duram até 30 dias e são armazenadas por hash. Os favoritos pertencem à conta, com limite de 1.000. O visitante pode sair de um dispositivo ou excluir os dados e todas as sessões. Falhas de conexão não devem transformar silenciosamente os favoritos de uma conta em favoritos locais.

## Perfis, comentários e revisão

A comunidade reutiliza o banco `DB`, as sessões e os segredos já configurados. A API aplica apenas os `CREATE TABLE/INDEX IF NOT EXISTS` de `0002_community.sql` na primeira requisição; a migração base de contas continua sendo requisito. `COMMUNITY_ADMIN_IDS` contém o identificador público do responsável pela aplicação Discord, conferido na API da própria aplicação. Alterar essa lista é uma mudança de configuração restrita ao responsável pelo projeto.

Uma conta sem perfil público pode salvar favoritos e consultar a wiki. Para comentar, deve publicar seu perfil em `/conta/#perfil`. `/pessoas/` mostra apenas perfis publicados; `/perfil/<identificador>/` é servido pelo Worker usando a página estática de perfil. Imagens não publicadas só podem ser consultadas pelo autor ou responsável. A área `/revisao/` tem autorização verificada na API, independente de o link aparecer na interface.

Anexos compactos são armazenados no D1 nesta etapa, com limites de tamanho, frequência e orçamento total descritos no README. Não é necessário criar outro serviço para ativar esta entrega. Vídeos não são aceitos.
