# Revisão de interface · 24/10/2026

A revisão parte de `c9bef5a`, preservando catálogo, artigos, recursos da comunidade e integração de publicação. O repositório do bot não foi alterado nem iniciado.

## Cabeçalho

A primeira rolagem fazia a sombra do progresso parecer um bloco embaçado sob a marca. A trilha agora contém o preenchimento em 2 px, sem sombra. O cabeçalho tem fundo opaco e não aplica desfoque ao conteúdo que passa por trás.

A comparação de pixels antes e depois de rolar 80 px não encontrou mudanças fora da trilha nos temas Adventures, Escuro e Claro, nas larguras 320, 390, 768 e 1440 px. Também foram verificadas posições de rolagem de 0, 80, 420 e 1200 px.

## Verificações locais

- 41 testes automatizados passaram.
- Build de 684 páginas concluído.
- Auditoria: 43.295 links e 15.983 ocorrências de imagens; nenhuma falha ou aviso.
- `wrangler deploy --dry-run` concluído.
- 180 combinações de rota, tema e largura conferidas no Chromium. Sem estouro horizontal e com o menu alcançável.
- Busca da abertura, teclado, Escape e retorno de foco; busca sem resultado; filtros restaurados pela URL; ficha rápida; favoritos locais; comparação de três formas exatas; Voltar do navegador; rotação e pausa de cenários; preferência de movimento reduzido.
- Índice fixo, IDs originais, indicador de seção atual, cópia de links do artigo e de seções nos três temas e nas quatro larguras.
- Perfil publicado, diretório, perfil público, comentário e resposta exercitados com os handlers reais do Worker, uma identidade sintética e SQLite em memória. Favoritos públicos permaneceram desmarcados. Nenhum conteúdo de teste foi enviado à produção.

O teste do histórico aguarda a conclusão da entrada antes de avaliar a opacidade da página. Uma captura feita durante a animação não representa o estado final.

As verificações de navegador usaram Chromium. O consentimento humano do Discord e navegadores de outros motores não foram repetidos nesta revisão. As regras de autenticação, propriedade, publicação de dados e anexos continuam cobertas pelos testes existentes; nenhuma API ou migração foi modificada.

## Como conferir a regressão

1. Abrir a página inicial, alternar entre os três temas e rolar pela primeira vez.
2. Conferir uma linha de progresso nítida, contida na base do cabeçalho, sem uma mancha sob a marca.
3. No celular, conferir os quatro atalhos abaixo do cabeçalho e abrir o menu completo.
4. Abrir um artigo longo, navegar pelo índice durante a leitura e copiar o link de uma seção.
5. Voltar pelo navegador e conferir conteúdo visível, filtros e progresso restaurados.
