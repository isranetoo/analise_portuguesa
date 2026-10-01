---
name: criar-issue
description: Use para criar uma issue no padrao completo do projeto (labels, projeto Portuguesa, Priority, Size e Status).
---

# criar-issue

Padrao do `CLAUDE.md` (secao 5). Todo pedido vira issue antes de qualquer implementacao.

## 1. Defina
- Titulo `<tipo>: <descricao>` (fix, feat, chore, docs, ci, test).
- Labels: `difficulty:<easy|medium|hard>`, `type:<bug|feature|chore>`, `agent:<dev-junior|dev-pleno|dev-senior>`, `area:<painel|coleta|publicacao|docs|ci|kit>`.
- Priority: P0 (producao quebrada, dados errados, CI vermelho na main), P1 (bug visivel ou pedido explicito), P2 (melhoria, testes, docs).
- Size: XS, S, M, L, XL.
- Status: `Ready` (sem bloqueio) ou `Backlog` (bloqueada; escreva "Bloqueada por #N" no corpo).

## 2. Crie a issue
Corpo com as 6 secoes: Contexto, Comportamento atual, Comportamento esperado, Criterios de aceite (checklist, incluindo "`python -m unittest -v` passando" e "`Closes #<N>` na primeira linha do PR"), Arquivos provaveis (lista exata), Fora de escopo.
```bash
gh issue create --title "<tipo>: <titulo>" \
  --label "difficulty:<nivel>,type:<tipo>,agent:<dev-...>,area:<area>" \
  --project "Portuguesa" --assignee @me --body-file - <<'BODY'
## Contexto
...
## Comportamento atual
...
## Comportamento esperado
...
## Criterios de aceite
- [ ] ...
- [ ] `python -m unittest -v` passando
- [ ] O PR deve ter `Closes #<esta issue>` na primeira linha
## Arquivos provaveis
- ...
## Fora de escopo
- ...
BODY
```
Guarde a URL impressa.

## 3. Preencha os campos do projeto (5 s entre chamadas)
```bash
sleep 5
gh project item-edit 2 --owner isranetoo --url <url> --field "Priority" --value <P0|P1|P2>
sleep 5
gh project item-edit 2 --owner isranetoo --url <url> --field "Size" --value <XS|S|M|L|XL>
sleep 5
gh project item-edit 2 --owner isranetoo --url <url> --field "Status" --value <Ready|Backlog>
```

## 4. Limite secundario do GitHub
Se aparecer "secondary rate limit" / "abuse": pare de escrever e espere em background (`run_in_background`), testando a cada 60 s ate a API voltar a responder:
```bash
until gh api graphql -f query='query{viewer{login}}' >/dev/null 2>&1; do sleep 60; done
```
Depois confira o que ja foi criado (`gh issue list --limit 5`) para nao duplicar e continue com 5 s entre chamadas.

Responda ao usuario com o link da issue.
