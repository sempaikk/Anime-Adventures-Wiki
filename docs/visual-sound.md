# Experiência visual e sonora

Esta etapa parte de `9e2365c`. O foco é estabelecer uma direção mais expressiva para a wiki inteira, começando pela abertura e pela navegação, com artes reais da fonte e recursos existentes preservados.

## Controles

- O som começa desligado. “Ativar som” aparece na abertura; Aparência e som contém ativação, volume e uma amostra.
- `aa-sound` guarda `on` ou `off`; `aa-sound-volume` guarda o volume de 0 a 100. Os controles continuam funcionando quando o armazenamento é indisponível.
- A preferência de movimento continua usando `aa-motion` e respeita movimento reduzido por padrão.
- A escolha de um personagem atualiza os dados e os destinos da forma exata, incluindo ficha rápida e comparação. A seleção não mistura formas ou inventa atributos ausentes.
- As setas do teclado mudam a forma quando a região da cena está focada. Miniaturas e botões oferecem acesso por toque.
- A rotação de cenários para com a pausa manual, movimento desativado, economia de dados, aba oculta ou cena fora de vista.
- WebGL é opcional e renderiza no máximo cerca de 30 vezes por segundo, com resolução limitada. Uma grade CSS mantém a composição quando ele não está disponível.

## Som

Os efeitos combinam notas, transientes e varreduras de ruído filtrado. O motor usa uma saída com ganho controlado, limita disparos muito próximos e desconecta as fontes ao terminarem. A criação do contexto depende de interação; silenciar não deixa novos sons dispararem. Sons e efeitos visuais têm preferências independentes. A ausência de suporte a áudio mantém a navegação utilizável.

## Imagens duplicadas

A fonte guardava imagens alternativas em `noscript` para o carregador original. Ao adaptar o documento, o site mostrava a imagem principal e a alternativa. Foram encontrados 31 ocorrências dessas imagens alternativas em 25 artigos.

O processamento agora remove uma alternativa somente quando o próprio contêiner já oferece a mesma imagem. Conteúdo alternativo sem correspondente é preservado e convertido em HTML normal. Repetições intencionais em outras seções não são apagadas. Os arquivos originais, hashes e revisões da fonte não foram alterados.

Testes de regressão cobrem o artigo real de Traits, repetições intencionais e uma ilustração disponível somente no conteúdo alternativo.

## Validação desta etapa

- 44 testes automatizados passaram, incluindo os três novos testes das imagens alternativas.
- Build de 684 páginas concluído; auditoria de 48.755 links e 15.952 ocorrências de imagens sem falhas ou avisos.
- Nenhuma figura dos artigos gerados continha duas ocorrências do mesmo arquivo de imagem.
- 180 combinações de rota, tema e largura passaram no Chromium (320, 390, 768 e 1440 px; Adventures, Escuro e Claro). O cabeçalho foi comparado antes e depois da primeira rolagem.
- 25 verificações da experiência cobriram saída real de áudio, ausência de contexto antes da ativação, volume, silêncio, quadros renderizados por WebGL, pausa de renderização, escolha de formas, ficha rápida, transição de quatro painéis, histórico, rotação de cenários e movimento reduzido. Sem erros de JavaScript ou shaders.
- Perfil, diretório, comentário e resposta foram exercitados com os handlers reais do Worker, SQLite em memória e uma identidade de teste, sem conteúdo de teste na produção.
- `wrangler deploy --dry-run` concluiu. As APIs, migrações, segredos e o repositório do bot não foram alterados.

As verificações de navegador usaram Chromium; não equivalem a uma nova autorização humana do Discord nem a testes físicos em todos os dispositivos.
