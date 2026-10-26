> Direção vigente: [wiki e comunidade futurista](community-release.md). Esta proposta substitui as decisões históricas abaixo sobre emojis, ausência de postagens e amizades e sons ativados por padrão. A referência de Vanguards orienta estudo de acabamento; a identidade é própria de Anime Adventures. Não há personagem protagonista, vídeos de participantes, chat global ou ponte com o bot nesta etapa.

> Direção atual: consultar [a revisão da interface de 24/10/2026](interface-review.md). As seções abaixo documentam também decisões históricas, incluindo a grade espacial posteriormente retirada.

# Direção visual e estrutura

O site combina consulta de wiki e participação da comunidade, com uma interface própria inspirada nos cenários coloridos do jogo. A página inicial abre com uma cena interativa de personagens, arte real da wiki, grade em perspectiva e acesso a personagens, biblioteca e comunidade. Não imita o shell da Fandom nem uma rede social existente.

## Identidade

Azul profundo, ciano, violeta e verde formam o tema Adventures. Escuro reduz a iluminação; Claro usa superfícies claras e mantém contraste nos textos. Cenários de nave, cidade noturna e dungeon se alternam automaticamente na entrada, com dissolução e um controle para pausar. A marca aparece no cabeçalho, com textos funcionais no destaque e sem repetir o nome do jogo nas molduras. Imagens decorativas se dissolvem no fundo, enquanto retratos e seus avisos ficam contidos nos cartões. Controles de fechar e setas usam vetores ou traços geométricos centrados, independentes da fonte. As imagens editoriais são exclusivamente da wiki, sem geração por IA, redesenho de personagem ou artes externas. Origem e hashes estão em `source/interface-art.json`, `source/media-library.json` e `source/original-images.json`.

Inter serve à leitura e Oxanium aos títulos. Navegação usa palavras; símbolos são restritos a ações como busca, fechar, tema e indicação de destino. Não há emojis genéricos representando personagens ou categorias.

## Organização

- Cabeçalho compacto: marca, personagens, wiki, comunidade, busca, tema, conta e menu completo.
- Início: apresentação do jogo e entradas claras. Categorias adicionais e informações históricas se abrem por escolha do visitante.
- Catálogo: filtros, comparação, ficha rápida e acesso aos artigos. Retratos ausentes usam primeiro uma referência anterior documentada da mesma forma na wiki; a ausência é indicada quando essa referência também não está disponível.
- Artigo: título, fontes, conteúdo preservado, infobox, índice, estatísticas e comentários em uma seção própria. A leitura não é substituída por um feed.
- Comunidade: diretório de perfis publicados e pesquisa por pessoa.
- Perfil: capa, avatar, nome, identificador, biografia, campos opcionais, contribuições reais e favoritos somente se autorizados pelo titular.
- Conta: sincronização de favoritos, publicação explícita do perfil, controle de dados e saída.
- Revisão: sugestões de correção e denúncias. Somente o responsável configurado pode moderar ou publicar notas com fonte.

Perfis não têm postagens, amigos, grupos ou mensagens. Esses recursos e a ponte de chat com Discord ficam para futuras entregas, sem controles que finjam funcionar agora.

## Movimento e desempenho

Links e histórico continuam nativos. A navegação interna aguarda uma saída curta antes de carregar o destino; entrada e retorno têm animações próprias e restauram o estado ao voltar pelo navegador. Botões respondem ao clique; cartões têm bordas luminosas em movimento, iluminação e profundidade ao ponteiro; elementos abaixo da primeira tela entram ao serem alcançados. Campos, painéis, diálogos e abas seguem o mesmo tratamento. Cenários nos cabeçalhos, partículas e luzes em movimento dão continuidade ao visual nas páginas internas. A cena inicial usa WebGL carregado sob demanda em dispositivos compatíveis, aplicando apenas um efeito de lente à imagem original; a imagem estática permanece como alternativa.

Movimento reduzido desliga animações, paralaxe, rotação e WebGL por padrão. O visitante pode alterar essa escolha em Aparência → Animações e efeitos; a preferência fica salva no dispositivo. Toque não depende de hover. O efeito WebGL renderiza em resposta a eventos; as partículas usam poucos pontos, limitam a resolução e renderizam no máximo 30 vezes por segundo. Efeitos param na aba oculta, e a rotação também para fora da primeira seção ou com economia de dados. A API de comentários só é consultada quando a seção se aproxima da tela. Busca, filtros, abas, menu e diálogos têm controles de teclado.

## Conteúdo e participação

Não inventar estatísticas, retratos, atualização do jogo ou atividade da comunidade. Os artigos preservam a revisão e os créditos da fonte. Notas de revisão do site aparecem separadas, com data e fonte consultada. Comentários não alteram o conteúdo enciclopédico diretamente.

Imagens fornecidas por participantes pertencem aos seus perfis e comentários; não são artes editoriais. A interface comprime os envios e o servidor verifica tamanho, formato, propriedade e visibilidade. Vídeos não são aceitos. Perfis e favoritos são privados até escolha explícita do titular.

## Validação

Conferir a apresentação em computador e celular, nos três temas e com movimento reduzido. Exercitar no navegador publicação e retirada de perfil, edição, anexos, respostas, denúncias, revisão e exclusão. Os testes usam contas e banco isolados; o consentimento humano real do Discord continua sendo conferido na produção pelo titular.

## Revisão de navegação e leitura · 24/10/2026

O cabeçalho usa fundo opaco. O progresso ocupa uma trilha independente de 2 px, com `overflow: hidden` e `contain: strict`; somente o preenchimento interno é escalado. A sombra da versão anterior ampliava visualmente a barra na primeira rolagem. O progresso é recalculado após retorno pelo histórico e mudanças na altura do documento, incluindo filtros e comentários.

`command.css` reúne a composição da abertura e os novos componentes: busca com fallback GET para a Biblioteca, ficha de destaque separada da área de texto, ícones de categorias documentados em `wiki-navigation.json`, atalhos móveis e ferramentas de leitura. A abertura mantém os cenários reais e a rotação com pausa. A navegação não depende do hover. O índice acompanha a seção alcançada, os links continuam usando os IDs da fonte e a cópia oferece um campo selecionável quando a permissão da área de transferência não está disponível.

Referências consultadas: navegação agrupada por jogo, guias e comunidade em [Warframe](https://www.warframe.com/en) e organização de personagens, mapas e conteúdo em [Marvel Rivals](https://www.marvelrivals.com/). Essas referências orientam a hierarquia; nenhum recurso editorial desses sites foi importado. As artes continuam exclusivamente na biblioteca já documentada da wiki.

## Cena, navegação e som · 24/10/2026

A nova abertura substitui o painel anterior por uma cena de consulta com seis personagens da fonte. A seleção muda retrato, nome, raridade, posicionamento, custo, ficha rápida, artigo e comparação juntos. Setas e miniaturas funcionam por toque, mouse e teclado. O tratamento gráfico combina perspectiva, linhas de enquadramento, varredura e uma grade WebGL; os cenários originais mantêm rotação e pausa.

`nexus.css` substitui `command.css`. A linguagem se estende à navegação lateral, aos catálogos, aos artigos e aos painéis da comunidade. A navegação entre documentos usa quatro painéis de luz e preserva histórico, URLs, hashes e scripts completos. A trilha de progresso continua contida em 2 px e o cabeçalho continua opaco.

`audio.ts` produz uma identidade sonora com osciladores, envelopes e ruído filtrado. Não baixa gravações externas. O visitante ativa o som e ajusta o volume em Aparência e som; a preferência fica no dispositivo e se sincroniza entre abas. Nenhum AudioContext é criado antes de uma interação autorizada. Volume, silêncio e movimento são controles independentes.

Esta é a primeira etapa da direção visual e sonora. A próxima frente recomendada é aprofundar a exploração das fichas, dos upgrades e das evoluções com os dados da fonte; depois, ferramentas de equipe e busca por intenção podem ser avaliadas como funcionalidades próprias.

## Direção atual — movimento e informação (25/10/2026)

O movimento contínuo usa as artes documentadas do próprio jogo. Nove mapas alternam por dissolução de 2,4 segundos e percorrem lentamente o fundo fixo da página inteira. O personagem em foco tem movimento de repouso independente do mouse; os retratos do catálogo e as artes dos atalhos também continuam animados enquanto estão visíveis. Texto, estatísticas e controles permanecem estáveis. A troca de personagem faz uma transição de 900 ms e aceita cliques rápidos sem trocar o artigo ou os botões para outra forma.

A pausa do cenário fica salva no navegador. A preferência de movimento, a redução de movimento do sistema, a economia de dados e a visibilidade da aba limitam o trabalho de animação. Apenas duas camadas de cenário são mantidas; a biblioteca inteira de mapas não é baixada de uma vez. O código de grade WebGL que já não tinha elemento na interface foi removido.

Os números de série e os rótulos duplicados deram lugar a títulos diretos e, nos cartões, ao posicionamento documentado na fonte. As referências de catálogo consultadas incluem a [biblioteca de personagens do Prydwen](https://www.prydwen.gg/zenless/characters/), com busca e filtros por atributos reais. Essa referência orienta a organização; todas as imagens desta wiki continuam sendo de Anime Adventures.

## Interações de toda a interface — 25/10/2026

O movimento acompanha as ações da pessoa. `ui-motion.ts` concentra transições interrompíveis, fechamento de diálogos, reorganização de listas e passagem do retrato do catálogo à ficha. `ui-interactions.ts` integra abas, campos, estados de espera, mensagens e controles nativos. As entradas de `effects.ts` voltam a responder quando a seção sai da tela e retorna; não dependem de recarregar o documento. O reaparecimento aguarda a animação anterior terminar, evitando ciclos no limite da janela.

Filtros reorganizam os cartões por posição; elementos que saem usam cópias temporárias inertes, sem IDs duplicados, retiradas ao terminar. O menu abre com os itens em sequência e fecha com transição própria. Foco de teclado, Escape, alterações rápidas e preferências de movimento continuam funcionando. Os indicadores das abas seguem a seleção e se ajustam quando fontes, idioma ou largura mudam. As caixas de seleção mantêm a área de clique restrita ao conteúdo do rótulo.

A ficha usa a imagem real do personagem, iluminação associada à raridade, apresentação gradual dos atributos e movimento de repouso. O retrato de transição usa a camada superior nativa do navegador, fica fora da árvore de acessibilidade e é removido ao fechar ou concluir. Controles posicionados, como Fechar, preservam sua posição durante o retorno visual do clique. No celular, a consulta ao artigo ocupa uma linha inteira acima de Salvar e Comparar.

Os sons continuam sendo sintetizados localmente. Favorito, comparação, filtro, confirmação, abertura, fechamento e interação têm respostas distintas, com limite de frequência e controle de volume. Nada inicia um AudioContext antes de uma interação autorizada; silêncio salvo e aba oculta são respeitados. Não há música de fundo ou gravação externa adicionada.

O tratamento visual continua usando retratos, mapas e ícones de Anime Adventures, sem grade espacial, partículas seguindo o cursor ou imagens de outros jogos. Textos e valores não são reescritos pelos efeitos. Os históricos públicos de Atualizações do site e Atualizações do bot permanecem vazios até a fase dos trailers, conforme a decisão do responsável.
