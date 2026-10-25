# Revisão da interface · 24/10/2026

Esta etapa aplica a direção combinada: cantos arredondados, navegação confortável e arte do jogo. A grade espacial, os marcadores de coordenadas, a varredura e as quatro persianas de transição foram retirados da apresentação. Cenários, seleção de formas, efeitos de interação, controles de movimento, busca, filtros e ferramentas permanecem.

`adventures-ui.css` é a camada de composição e acabamento depois dos estilos existentes. O cabeçalho mantém a trilha de leitura contida. A navegação principal, o menu completo e os atalhos móveis substituem a duplicação da navegação lateral fixa. As páginas continuam com composições próprias para catálogo, artigo, comparação e comunidade.

A coluna do personagem acompanha a rolagem do documento, sem sua antiga rolagem interna. O título da infobox recebe dimensões e espaçamento explícitos. Diálogos longos continuam roláveis, com barras nativas personalizadas e funcionamento normal de teclado, toque e roda do mouse. Os controles usam emojis quando ajudam a identificar uma ação; setas decorativas dos cartões foram reduzidas.

Os retratos preservam todos os arquivos originais. `portrait-framing.css` registra somente suas margens transparentes, calculadas por `python scripts/frame_portraits.py` com Pillow. O enquadramento CSS é limitado aos displays de personagens; capturas dos artigos não são recortadas. Navegadores sem `object-view-box` preservam a imagem inteira.

O som começa habilitado na primeira visita, com volume inicial de 25%, e é preparado na primeira interação válida do navegador. A preferência salva de silêncio prevalece. A preferência de movimento continua respeitando a escolha salva e a redução de movimento do sistema.

O importador agora compara a raridade pela identidade exata em `Module:UnitData/Data`, conferindo o hash da revisão preservada. `source/unit-data-audit.json` registra cobertura, correções e as identidades sem correspondência. Categorias de artigos não substituem os valores disponíveis nesse módulo. Quando a identidade não consta nele, um artigo da mesma revisão pode confirmar a raridade por uma declaração explícita no início do texto para o nome exato daquela forma. As identidades sem correspondência mantêm os dados anteriores, sem supor uma raridade.

A conferência encontrou 498 identidades no módulo e mais 13 confirmadas explicitamente nos artigos: 511 de 555 identidades do arquivo, com 60 correções ou preenchimentos de raridade. As 44 restantes continuam identificadas como pendentes; essa contagem inclui o arquivo histórico. Nenhuma fonte bruta ou arte foi substituída nessa revisão.

Os registros públicos das atualizações do bot deixam de apresentar links para commits. O programa do bot permanece sem alterações. Os termos e a política do bot continuam em `/bot/termos/` e `/bot/privacidade/`.

## Próximas etapas já discutidas

O idioma por país e a interface completa em pt-BR/en-US ainda precisam de implementação própria. A tradução dos artigos deve preservar nomes oficiais, números, fontes e a indicação do idioma original. O estudo audiovisual do jogo e a exploração visual de evoluções e materiais também permanecem como etapas seguintes; esta revisão não anuncia esses recursos como concluídos.

## Validação

- 47 testes automatizados aprovados, incluindo regressões de imagens duplicadas, identidade, fontes, contas e dados de personagens.
- 686 documentos conferidos no Chromium em larguras de 320 e 1440 px: 1.372 combinações, sem transbordamento horizontal, títulos da infobox fora do painel, rolagem interna da coluna do personagem ou erros JavaScript não tratados.
- Mais 168 combinações de páginas principais, com larguras de 320, 390, 768 e 1440 px e temas Adventures, Escuro e Claro, sem falhas de alinhamento ou erros JavaScript.
- 30 verificações de interação: som inicial, ausência de contexto de áudio antes de gesto, início após interação, silêncio persistido, movimento reduzido, seleção de forma, retrato contido, ficha rápida, navegação e imagem única de Traits.
- Fluxo da comunidade conferido com os handlers reais do Worker, SQLite em memória e identidade sintética: perfil, diretório, comentários e respostas. Não representa uma nova autorização OAuth humana nem atividade publicada em produção.
- Auditoria de links e imagens e empacotamento do Worker verificados separadamente. A revisão final dos dados é recompilada antes de publicar; as duas raridades adicionais recebem uma conferência direcionada depois dessa compilação.

## Revisão de 25/10/2026: idiomas e alinhamento

- Interface e artigos com variantes `/pt-br/` e `/en-us/`, seleção manual persistente e padrão por país no Worker. Recursos e APIs não são redirecionados. Conteúdo escrito por usuários não é traduzido.
- Abas com espaço para o foco do teclado; títulos de outras formas com recuo consistente; índice com seta centralizada; seletores com seta e texto alinhados. O cabeçalho troca para navegação compacta até 950 px.
- Fundo de partículas, grade e linhas do mouse removido. Cenários e banners preservados são artes documentadas do jogo. Tipografia varia entre títulos, controles e leitura.
- Leitor estrutural do módulo corrigido para aceitar indentação por espaços e tabulações. Os 555 registros foram conferidos: 549 informam raridade e seis não a informam na fonte. Não se atribuiu raridade aos seis registros auxiliares sem essa informação.
- Valores inválidos de infobox, como `true¥` e `tryue`, são apresentados como informação ausente. Nenhum número foi inferido; as revisões originais permanecem intactas e acessíveis pelos créditos.
- Nenhuma divergência de raridade foi encontrada entre introduções que identificam a forma exata e as raridades conferidas no módulo.

Os artigos em português identificam a tradução automática e oferecem o inglês. O build conserva e valida nomes, números, imagens e estrutura das abas antes de produzir as variantes. A revisão do bot desta etapa está documentada no repositório do bot; os links legais foram acrescentados à ajuda privada e os 677 testes isolados passaram.

Validação visual desta revisão: 2.744 verificações de todas as 1.372 variantes de idioma em 320 e 1440 px; mais 336 combinações de 14 páginas principais, dois idiomas, quatro larguras e três temas. Nenhum transbordamento horizontal, título fora da ficha ou erro de JavaScript foi encontrado. Estados de abas, seletores, menus, teclado e cabeçalho também foram conferidos de 320 a 1440 px. Conta, diretório, perfil, comentário e resposta em inglês passaram com os handlers reais do Worker e banco SQLite isolado; nomes com emoji e textos autorais coincidentes com rótulos da interface permaneceram intactos.

Conferência final: 59 testes de conteúdo, idiomas, estrutura e APIs aprovados; 2.058 documentos, 176.351 referências internas e 47.832 ocorrências de imagens conferidos, sem recurso ausente ou aviso. O glossário foi ampliado com os nomes dos modos, dos mapas registrados nas imagens e dos 12 traits da revisão coletada. Mais 28 verificações das páginas afetadas passaram em 320 e 1440 px. O Worker local confirmou preferências de idioma, perfis, recursos, APIs e páginas 404 localizadas; as páginas legais originais continuaram respondendo 200. Os fluxos de conta e comentários em inglês e o foco visível das abas/cartões passaram novamente na versão final.

## Revisão de movimento contínuo e organização — 25/10/2026

- Cenário fixo com nove mapas da biblioteca da wiki ao longo de toda a página, deslocamento lento e troca gradual. A pausa fica salva no navegador. O primeiro mapa permanece visível sem JavaScript; economia de dados e movimento desligado impedem a rotação automática.
- Personagem em foco com movimento de repouso, resposta suave ao mouse e transição entre retratos. Cliques rápidos mantêm nome, raridade, atributos, artigo, ficha rápida e comparação associados à mesma forma. Retratos e artes fora da tela deixam de animar.
- Números decorativos removidos dos personagens, miniaturas, atalhos e espaços de comparação. Os cartões mostram o posicionamento existente na fonte. Custos, contagens reais e estatísticas permanecem preservados.
- Atalho superior de Tier lists, botão Explorar personagens, marcador decorativo do cenário e títulos repetidos retirados. O acesso a Tier lists em Conteúdos do jogo continua levando ao artigo correspondente.
- Emojis alinhados na navegação, ficha rápida, comparação e atalhos. Links de texto mantêm sua seta próxima do rótulo. Caixas de seleção deixam de ocupar o espaço vazio dos filtros. Os cartões da abertura passam a dimensionar as linhas da grade pelo conteúdo, sem cobrir a seção seguinte.
- Tipografia dos títulos padronizada entre linhas, sem contorno ou brilho excessivo. O tema Claro conserva contraste escuro na abertura do jogo.

Validação: 60 testes automatizados aprovados; 2.744 verificações das variantes dos documentos em 320 e 1440 px; mais 336 combinações das páginas principais, dois idiomas, quatro larguras e três temas, sem transbordamento horizontal, título de ficha fora do painel ou erro JavaScript. As interações específicas passaram em pt-BR/en-US e 390/1440 px: movimento após a entrada, estabilidade dos controles, seleção rápida, ficha rápida, comparação, menu e clique fora da caixa de seleção. Movimento reduzido, preferência desligada, pausa salva, economia de dados e fundo sem JavaScript foram conferidos separadamente. Os 13 ícones do jogo e o foco do menu passaram em 14 casos; o artigo único e a troca de destino passaram em quatro casos.

O fluxo da comunidade em inglês passou com os handlers reais do Worker, SQLite em memória e identidade isolada, preservando textos autorais. Isso não representa uma nova autorização humana do Discord. O repositório do bot não foi alterado. A auditoria do build verificou 2.059 documentos, 174.289 referências e 49.872 ocorrências de imagens, sem falha ou aviso.

Conferência final de contraste e composição: mais 12 casos da abertura nos dois idiomas, três temas e duas larguras, sem erros. No tema Claro, título e descrição mantêm contraste de pelo menos 4,5:1 mesmo considerando branco como o fundo mais luminoso sob o painel. O empacotamento do Worker com `wrangler deploy --dry-run` também passou.

## Interações repetidas e efeitos da interface — 25/10/2026

- Entradas voltam a acontecer ao sair e retornar às seções, incluindo os blocos de leitura. A reativação aguarda a animação anterior terminar, sem reiniciar continuamente na borda da janela.
- Menus, controles, abas, campos, avisos, carregamento e exibição de conteúdo recebem respostas ao uso. Indicadores de seleção acompanham as abas da wiki e dos perfis. Os menus de aparência e idioma têm transição de entrada e saída; a troca de tema usa a transição nativa quando disponível.
- Catálogo e biblioteca reorganizam os cartões com movimento interrompível. Filtros rápidos preservam a última seleção. Cópias temporárias ficam inertes, sem IDs e fora da árvore de acessibilidade, e são removidas ao terminar.
- A ficha apresenta o retrato do personagem a partir do cartão, com escala uniforme, enquadramento da imagem original e carregamento confirmado antes da transição. Atributos entram em sequência; raridade orienta a iluminação. No celular, as três ações ficam distribuídas sem cortar texto.
- Abrir, fechar, favoritar, comparar, filtrar e confirmar têm sons próprios sintetizados. A preferência de silêncio, o volume, o gesto inicial obrigatório e a suspensão em aba oculta são preservados. O teclado pode concluir as entradas para deixar o foco imediatamente visível.
- As abas públicas de atualizações do site e do bot permanecem vazias. Nenhum trailer foi criado nesta etapa e o código do bot não foi alterado.

Validação final no Chromium: 2.744 verificações das páginas localizadas em 320/1440 px e mais 336 combinações das páginas principais em dois idiomas, três temas e quatro larguras, sem transbordamento horizontal, título fora da ficha ou erro JavaScript. Os fluxos de movimento foram exercitados em pt-BR/en-US e 390/1440 px: retorno às seções sem recarregar, filtros e menus rápidos, reabertura de fichas, favoritos, comparação, pesquisa, abas, etapas e históricos vazios. Três casos adicionais conferiram efeitos desligados, movimento reduzido e silêncio salvo. Seis estados de ficha e teclado passaram nos três temas; mudanças sucessivas e rápidas de tema também passaram.

A instrumentação de áudio confirmou ausência de AudioContext antes do gesto, um contexto após a interação e saída de áudio real dos osciladores. O retrato foi inspecionado durante a transição: escala uniforme e remoção da imagem temporária ao concluir. A comunidade em inglês passou novamente com handlers reais do Worker, SQLite em memória e identidade isolada, sem publicar dados de teste. O build validou nomes, números, imagens e estrutura dos 656 artigos traduzidos; a auditoria conferiu 2.059 documentos, 174.289 referências e 49.872 ocorrências de imagens, sem falhas ou avisos.
