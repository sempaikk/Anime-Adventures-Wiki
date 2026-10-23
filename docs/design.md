# Direção visual: Adventures Wiki

A interface usa a identidade de Anime Adventures e organiza a consulta por categoria. A página inicial contém uma apresentação curta, busca e atalhos; personagens, guias, notícias e estatísticas aparecem quando o visitante abre a área correspondente. Publicações sociais, chat no site e assistência por IA são etapas futuras, sem contadores ou interações simuladas.

## Linguagem e quantidade de informação

Títulos identificam a seção: Personagens, Biblioteca, Favoritos, Atualizações. Botões descrevem a ação: Jogar, Entrar com Discord, Salvar. Evitar slogans, metáforas de aventura e chamadas promocionais. A interface é em português direto e os artigos mantêm o idioma original.

Menus gerais usam texto. Atalhos de conteúdo do jogo ficam em um grupo próprio, com arte correspondente em todas as linhas. A página inicial não exibe um feed de guias, personagens e anúncios. Catálogos mostram doze resultados por vez. Artigos com várias seções permitem abrir os detalhes e preservam todos os dados e âncoras.

## Referências e fontes

- Instagram: descoberta visual e navegação familiar — https://about.instagram.com/features
- Reddit: conversas e conteúdo por assunto — https://redditinc.com/
- Steam Community: informação e comunidade ligadas a um jogo — https://steamcommunity.com/app/570
- Artes e dados públicos do jogo fornecidos pelo proprietário: Roblox, Gomu e convite público do Discord. Origem, limites de verificação e hashes estão em `source/official-links.json`.

O servidor Discord não foi acessado como membro; só foram lidos os metadados públicos do convite. A página do YouTube não pôde ser lida neste ambiente; o link fornecido foi mantido, sem importar vídeos ou inventar anúncios.

## Temas

Adventures é o padrão para novas preferências: superfícies azuladas, profundidade violeta e destaques ciano, rosa, verde e dourado. A direção vem das artes reais do jogo, incluindo o banner de Summon. Escuro reduz a iluminação; Claro mantém a identidade em superfícies claras. Preferências já salvas são respeitadas.

O seletor apresenta os três temas e mantém a preferência entre páginas e abas. As cores das artes originais não são alteradas. Cores de raridade servem à orientação; o nome textual permanece presente.

## Componentes

- Cabeçalho com busca, conta e temas; navegação lateral no computador e navegação inferior no celular.
- Atalhos por categoria com arte correspondente, nome, foco visível e área inteira clicável.
- Página inicial com descrição curta, busca, seis categorias e acesso ao comparador, aos favoritos e aos canais do jogo.
- Cartão de unidade com nome, retrato confirmado, raridade, acesso à ficha e ficha rápida independente.
- Ficha rápida com dados disponíveis, ligação à página completa e favoritos. Formas sem artigo têm uma chave de favorito própria, preservando as chaves antigas dos artigos.
- Ficha de personagem com resumo, seções, informações adicionais da fonte e seletor dos upgrades documentados. Os valores originais, níveis e bônus permanecem no documento; não há interpolação de estatísticas.
- Áreas funcionais com os canais do jogo e convite permanente do bot. A página não declara afiliação oficial do projeto.

## Movimento e acesso

A iluminação reage ao ponteiro. A navegação usa transições nativas entre documentos onde há suporte, com movimentos diferentes para avançar, voltar e abrir artigos. Links e histórico continuam nativos; nenhum temporizador atrasa a navegação. Fichas têm entrada e saída próprias, seções abrem suavemente e cartões são apresentados ao entrar na área visível. Não há laço contínuo de animação em JavaScript. Movimento reduzido é respeitado, e navegadores sem suporte continuam com navegação normal. Busca, temas, fichas e controles funcionam pelo teclado. Conteúdo e controles se reorganizam em 320, 390, 768 e 1440 pixels. Imagens ausentes são informadas, sem gerar retratos ou atribuir a arte de outra forma.

## Conta

A página de conta é encontrável mesmo antes de sua ativação e explica a disponibilidade. A entrada e a sincronização reais dependem do banco e dos segredos configurados na Cloudflare. Leitura, busca e favoritos locais funcionam sem conta.


## Ferramentas de consulta

O catálogo mantém a busca visível e recolhe os filtros secundários. Raridade, posicionamento, custo e arquivo histórico podem ser combinados; a URL acompanha a busca e pode ser compartilhada. Campos inválidos ou ausentes nunca viram custo zero e ficam por último na ordenação por custo.

O comparador aceita até três formas exatas do catálogo, com seleção pelo cartão, ficha rápida ou página completa. Apresenta os custos, etapas e tipos disponíveis na revisão de cada artigo, sem preencher lacunas ou estimar força. Nomes anteriores e fontes ficam na mesma tabela. A seleção permanece neste navegador e pode ser transportada pelo link, sem depender de conta. A tabela rola dentro de sua própria área no celular.

Favoritos têm busca, filtro, ordenação e remoção direta. A lista preserva as chaves antigas dos artigos e as formas sem artigo. Mudanças são atualizadas entre abas; falhas da conta continuam explícitas e não deslocam dados para uma coleção local sem aviso.

## Ilustração do site

A página inicial usa uma ilustração original criada com IA, separada dos retratos e dos dados do jogo. Ela é decorativa, não documenta um local ou personagem oficial. A origem e o hash estão em `source/site-artwork.json`; a página Sobre informa sua criação. O original é preservado em `src/assets` e o build publica versões WebP responsivas. Retratos de unidades, ícones e mídias de artigos continuam ligados às fontes verificadas.
