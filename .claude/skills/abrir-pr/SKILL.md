---
name: abrir-pr
description: Use ao terminar a implementacao de uma issue NOVA para abrir o PR (se ja existe PR da issue, use atualizar-pr).
---

# abrir-pr

Troque `<N>` pelo numero da issue e `<branch>` pela sua branch (`<tipo>/<N>-<slug>`).

## 1. Confira se ja existe PR da issue
```bash
gh pr list --state all --search "Closes #<N>" --json number,headRefName,state
gh pr list --state all --json number,headRefName,state --jq '.[] | select(.headRefName | test("/<N>-"))'
```
Se aparecer algum PR com `state` OPEN: PARE, nao abra outro. So PR ABERTO da issue bloqueia; PR fechado ou mergeado (`CLOSED`/`MERGED`) nao conta. Use a skill `atualizar-pr` na branch desse PR.

## 2. Sincronize e teste
```bash
git fetch origin && git merge origin/main
python -m unittest -v
```
- Conflito: mantenha os dois lados (inclusive testes) e rode os testes de novo.
- Anote o total de testes (ex.: "54"). So siga com tudo verde.

## 3. Push (nunca force push)
```bash
git push -u origin HEAD
```

## 4. Abra o PR
Use a label `difficulty:<easy|medium|hard>` igual a da issue. `Closes #<N>` deve ser a PRIMEIRA linha do corpo.
```bash
gh pr create --assignee @me --title "<tipo>: <resumo> (#<N>)" --label "difficulty:<nivel>" --body-file - <<'BODY'
Closes #<N>

## O que mudou
<o que e por que>

## Como testar
1. <passo a passo>

## Criterios de aceite
- [x] <criterio da issue>

Testes: <total> OK
BODY
```

## 5. Confira o vinculo
```bash
sleep 5
gh pr view --json number,url,closingIssuesReferences
```
`closingIssuesReferences` deve conter a issue `<N>`. Se estiver vazio, corrija o corpo (`gh pr edit <PR> --body-file -`) mantendo `Closes #<N>` na primeira linha.

Ritmo: 5 s entre chamadas `gh` que escrevem; 10 s entre polls.
