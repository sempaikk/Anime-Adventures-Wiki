# Adventures Archive

Wiki independente de Anime Adventures. Interface em português, artigos no
idioma original, estrutura monocromática com temas claro/escuro e artes do jogo.

```bash
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

Node 24. O resultado em `dist` é estático: não usa token do bot, banco de
produção ou chave de IA. Tema e favoritos ficam apenas no navegador.

## Conteúdo

O snapshot textual contém 661 artigos e 1.105 fontes (incluindo um mapa suplementar, artigos, redirecionamentos,
categorias, templates e módulos). Isso não significa 1.104 personagens. A
coleta original não abrange discussões, páginas pessoais ou todas as revisões
históricas. As apresentações dos artigos são importadas gradualmente e fixadas
na revisão do texto. Artigos pendentes oferecem o código original; a importação
parcial não é apresentada como concluída. Fontes vazias e dados ausentes não são
preenchidos por suposição.

`scripts/fetch_rendered.py` retoma a importação, cacheia respostas e limita as
consultas públicas a uma a cada quatro segundos. `scripts/import_snapshot.py`
reconstrói metadados e copia artes a partir da coleta de pesquisa e do checkout
do bot, nos caminhos documentados pelo próprio script. O build publicado usa
apenas os arquivos já presentes no projeto e não consulta a Fandom.

Veja [NOTICE.md](NOTICE.md) para atribuição e licença dos textos e das imagens.

## Prévia

O workflow publica em GitHub Pages. `SITE_BASE=/Anime-Adventures-Wiki/` adapta
os links e arquivos ao endereço do projeto. Atualizações podem ser vistas ao
recarregar a página depois da publicação. Esta é uma prévia em desenvolvimento,
com conteúdo e apresentação ainda sendo conferidos.
