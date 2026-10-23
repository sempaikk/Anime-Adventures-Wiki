# Direção visual: Adventures Wiki

A interface combina descoberta de conteúdo, identidade de Anime Adventures e consulta enciclopédica. A coleção atual de artigos e formas é a base real da experiência; publicações sociais, chat no site e IA são etapas futuras, sem contadores ou interações simuladas na interface publicada.

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
- Descobertas da wiki identificadas como guias ou seleção editorial. Não representam postagens de jogadores ou avaliações de popularidade.
- Cartão de unidade com nome, retrato confirmado, raridade, acesso à ficha e ficha rápida independente.
- Ficha rápida com dados disponíveis, ligação à página completa e favoritos. Formas sem artigo têm uma chave de favorito própria, preservando as chaves antigas dos artigos.
- Ficha de personagem com resumo, seções, informações adicionais da fonte e seletor dos upgrades documentados. Os valores originais, níveis e bônus permanecem no documento; não há interpolação de estatísticas.
- Áreas funcionais com os canais do jogo e convite permanente do bot. A página não declara afiliação oficial do projeto.

## Movimento e acesso

A iluminação e o movimento reagem à interação, sem laço contínuo de animação em JavaScript. Movimento reduzido é respeitado. Busca, temas, fichas e controles funcionam pelo teclado. Conteúdo e controles se reorganizam em 320, 390, 768 e 1440 pixels. Imagens ausentes são informadas, sem gerar ou atribuir a arte de outra forma.

## Conta

A página de conta é encontrável mesmo antes de sua ativação e explica a disponibilidade. A entrada e a sincronização reais dependem do banco e dos segredos configurados na Cloudflare. Leitura, busca e favoritos locais funcionam sem conta.
