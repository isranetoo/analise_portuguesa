# Kit CTO para Claude Code

Workflow em que uma sessão do Claude Code atua como **CTO**: faz triagem das demandas, cria issues no GitHub, escolhe o modelo pela dificuldade e despacha até **4 devs em paralelo**, cada um em seu próprio git worktree, abrindo PRs que são revisados antes de você decidir o merge.

## Instalação em qualquer projeto
1. Copie para a raiz do repo: `.claude/`, `CLAUDE.md`, `.worktreeinclude` e `scripts/setup-cto.sh`.
   - Se o projeto já tem `CLAUDE.md`, apenas acrescente as seções que faltam (comandos de verificação, convenções, banco).
2. Pré-requisitos: Claude Code atualizado, `gh` instalado e autenticado (`gh auth login`), remote no GitHub.
3. Rode `bash scripts/setup-cto.sh` (cria as labels e ajusta o .gitignore).
4. Preencha o `CLAUDE.md`.
5. Comite os arquivos na main, para que os worktrees dos agentes já os enxerguem.

## Uso
```bash
claude --model opus
```
```
/cto 1) botão de login quebrado no Safari 2) export CSV no dashboard 3) migrar tabela de pedidos para RLS por organização
```

## Agentes
| Agente | Modelo | Quando |
|---|---|---|
| dev-junior | haiku | ajustes triviais, 1–2 arquivos |
| dev-pleno | sonnet | features/bugs contidos em um módulo |
| dev-senior | opus | arquitetura, schema, segurança, bugs difíceis |
| reviewer | sonnet | revisa cada PR e comenta (nunca aprova/mergeia) |

Para trocar o modelo de um nível, edite o campo `model:` no arquivo do agente (aceita `haiku`, `sonnet`, `opus` ou um model ID completo).

## Ciclo de uma demanda
demanda → triagem (CTO) → issue com labels → dev no worktree → PR `Closes #N` → reviewer → você faz o merge.
Se um dev perceber que a tarefa é maior que o nível dele, responde `ESCALAR` e o CTO redespacha para o nível acima.

## Dicas
- **Permissões:** para os devs em background não travarem pedindo aprovação, libere `git` e `gh` via `/permissions` no Claude Code (ou no `.claude/settings.json` do projeto).
- **Conflitos:** o CTO serializa tarefas que tocam os mesmos arquivos e roda no máximo uma migration por vez.
- **Custo:** a triagem em Opus vale a pena; se quiser economizar, rebaixe o `reviewer` para `haiku`.
- **Repos privados/monorepos:** ajuste a seção "Estrutura de pastas" do `CLAUDE.md` — é o que mais melhora a precisão das issues.
