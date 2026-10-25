# Idiomas

A interface tem português brasileiro e inglês dos Estados Unidos. Artigos em português usam traduções automáticas identificadas e oferecem acesso ao inglês. Nomes oficiais, números, imagens, IDs de abas e âncoras são preservados. Perfis, comentários e notas editoriais continuam no idioma de quem os escreveu.

As traduções dos textos públicos foram preparadas com Google Translate e armazenadas neste diretório. Nenhum provedor de tradução é chamado pelo navegador ou pelo build. Não se enviam dados de visitantes, perfis ou comentários ao provedor.

`articles-pt-BR.json` armazena fragmentos com nomes, números, links e mídia protegidos. `glossary.json` contém os termos preservados. `ui-en-US.json` é o dicionário da interface; o cache canônico correspondente permite revisar ou atualizar a tradução. Os arquivos `*-failures.json` vazios indicam que as pendências da preparação foram resolvidas. O campo `reviewed` registra ajustes de fragmentos recusados pela validação automática.

O build valida marcadores, estrutura HTML, nomes e números antes de restaurar os atributos originais. Uma tradução ausente ou inválida impede a publicação.

Para atualizar fontes/traduções:

```sh
npm run prebuild
npx astro build
node scripts/translation-corpus.mjs
python scripts/translate_corpus.py .cache/translations/articles-input.json source/translations/articles-pt-BR.json
node scripts/collect-ui-translations.mjs
python scripts/translate_corpus.py .cache/translations/ui-input.json source/translations/ui-en-US-canonical.json
node scripts/compile-ui-translations.mjs
npm run build
```

É necessário revisar qualquer fragmento recusado antes de continuar. O preparador respeita respostas de limite do serviço e salva o progresso; não roda em CI. `AA_TRANSLATION_WORK_DIR` permite escolher outro diretório temporário.

Use `npm run build` e `npm run preview` para revisar os dois idiomas. `astro dev` e previews com `SITE_BASE` mantêm as rotas originais, sem o seletor de idiomas. Em produção, o Worker escolhe português para país BR e inglês para os demais países, salvo escolha manual no cookie `aa-language`. A URL com idioma explícito sempre prevalece. Os endereços públicos originais dos documentos legais do bot permanecem estáveis em português.

Textos da wiki e traduções mantêm atribuição e licenciamento CC-BY-SA; imagens preservam créditos e condições das fontes.
