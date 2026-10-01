---
name: atualizar-pr
description: "Use para aplicar ajustes de review ou resolver conflito em um PR que ja existe, na mesma branch (nunca abra PR novo)."
---

# atualizar-pr

Troque `<N>` pela issue, `<PR>` pelo numero do PR e `<branch-do-PR>` pela branch dele.

## 1. Descubra a branch e parta dela
```bash
gh pr view <PR> --json headRefName,body,state
git fetch origin && git checkout -b tmp-<N> origin/<branch-do-PR>
```

## 2. Aplique os ajustes
Altere so o que o review/conflito pede, nos arquivos da issue. Commits no padrao `<tipo>: <resumo> (#<N>)` (portugues, minusculo, sem acento).

## 3. Sincronize com a main e teste
```bash
git fetch origin && git merge origin/main
<comando de testes>
```
Conflito: mantenha os dois lados, inclusive os testes de ambos. So siga com tudo verde e anote o total.

## 4. Push na branch do PR (nunca force push, nunca PR novo)
```bash
git push origin HEAD:<branch-do-PR>
```

## 5. Atualize o corpo do PR se ficou desatualizado
```bash
sleep 5
gh pr edit <PR> --body-file - <<'BODY'
Closes #<N>

## O que mudou
<atualizado>

## Como testar
1. <passos>

Testes: <total> OK
BODY
sleep 5
gh pr view <PR> --json closingIssuesReferences,mergeable
```
`Closes #<N>` fica sempre na PRIMEIRA linha e a issue deve aparecer em `closingIssuesReferences`. Se `mergeable` for `UNKNOWN`, espere 10 s e consulte de novo.
