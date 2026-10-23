# Publicação na Cloudflare

O site público pode usar um repositório privado. O bot continua na hospedagem atual e não recebe a carga do site.

## Conectar o GitHub

No painel Cloudflare, abra **Create app**, conecte o GitHub e selecione somente `Anime-Adventures-Wiki`.

Configure:

- Project name: `anime-adventures-wiki`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`
- Root directory: a raiz do repositório
- Node: `24` (o arquivo `.node-version` já fornece essa preferência)
- Cloudflare Access: desligado, pois a wiki é pública

Não configure `SITE_BASE`: na Cloudflare o site usa `/`. O prefixo do GitHub Pages só é aplicado pelo workflow específico do GitHub.

`wrangler.jsonc` fornece a pasta de publicação `dist` e o Worker. Cada push na branch principal inicia uma nova publicação pela integração Git. Não é necessário fornecer uma chave da Cloudflare ao GitHub Actions.

Depois do primeiro sucesso, copie o endereço `https://anime-adventures-wiki.<seu-subdominio>.workers.dev`. Confira a página inicial, um artigo, busca e favoritos. Só então altere a visibilidade do repositório do site para privado. A integração da Cloudflare deve continuar autorizada a esse repositório privado.

## Contas

A publicação inicial funciona sem login. A API de sessão indica explicitamente que contas ainda não estão habilitadas. Não há tela de login de demonstração nem sincronização simulada. A ativação depende de banco e credenciais OAuth do Discord configurados apenas no ambiente da Cloudflare.

As credenciais do bot e os bancos dele não fazem parte deste projeto. Nunca coloque um Client Secret no código, no GitHub, no campo de build ou em uma conversa.
