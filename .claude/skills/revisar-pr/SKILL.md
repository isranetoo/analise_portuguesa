---
name: revisar-pr
description: Use para revisar um PR em worktree temporario (testes, vinculo, escopo, criterios) e comentar sem aprovar nem mergear.
---

# revisar-pr

Troque `<PR>`, `<N>` (issue) e `<branch>` (head do PR). Nunca troque a branch do checkout principal; nunca aprove nem mergeie.

IMPORTANTE: rode os passos 2 a 6 numa UNICA chamada de shell, porque `TMP` e uma variavel de shell e se perde entre chamadas separadas (o `git worktree remove` do passo 6 falharia). Nao use `cd` solto: use `git -C "$TMP"` ou subshell `( cd "$TMP" && ... )`.

## 1. Dados do PR e da issue
```bash
gh pr view <PR> --json headRefName,files,mergeable,closingIssuesReferences,body
gh issue view <N>
```

## 2. Worktree temporario sincronizado com a main
```bash
git fetch origin
TMP="$(mktemp -d)/rev-<PR>"
git worktree add "$TMP" origin/<branch>
git -C "$TMP" merge --no-edit origin/main
```
Se o merge conflitar, registre como bloqueante (`CONFLICTING`) e va ao passo 5.

## 3. Testes
```bash
( cd "$TMP" && python -m unittest -v )
```
Anote o total e as falhas.

## 4. Confira
- Vinculo: `closingIssuesReferences` contem a issue e `Closes #<N>` esta na primeira linha do corpo.
- Escopo: `files` do PR so dentro dos "Arquivos provaveis" da issue (fora disso: justificado no PR ou bloqueante).
- Criterios de aceite: marque um a um contra o diff.
- Convencoes do `CLAUDE.md` (idioma, mudanca minima, sem dados gerados a mao, sem mexer em workflows/config).

## 5. Comente
```bash
gh pr review <PR> --comment --body-file - <<'BODY'
## Review PR #<PR> (issue #<N>)
Testes: <total> OK
### Bloqueante
- <itens ou "nenhum">
### Sugestoes (nao bloqueantes)
- <itens ou "nenhuma">
Veredito: PRONTO | AJUSTES | BLOQUEADO
BODY
```

## 6. Limpe
```bash
git worktree remove --force "$TMP"
```
Reporte o veredito e o total de testes.
