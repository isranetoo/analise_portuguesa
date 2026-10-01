#!/usr/bin/env bash
# Configura o repositório atual para o workflow CTO + devs.
# Uso: bash scripts/setup-cto.sh   (rodar na raiz do repo, com `gh auth login` feito)
set -euo pipefail

command -v gh >/dev/null || { echo "❌ GitHub CLI (gh) não encontrado. Instale: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "❌ Rode 'gh auth login' primeiro."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "❌ Rode dentro de um repositório git."; exit 1; }

echo "→ Criando labels no GitHub..."
mk() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null && echo "  ✓ $1"; }

mk "difficulty:easy"   "0E8A16" "Tarefa fácil — dev-junior (haiku)"
mk "difficulty:medium" "FBCA04" "Tarefa média — dev-pleno (sonnet)"
mk "difficulty:hard"   "D93F0B" "Tarefa difícil — dev-senior (opus)"
mk "type:bug"          "B60205" "Correção de bug"
mk "type:feature"      "1D76DB" "Nova funcionalidade"
mk "type:chore"        "C5DEF5" "Manutenção / infra"
mk "agent:dev-junior"  "BFDADC" "Atribuída ao dev-junior"
mk "agent:dev-pleno"   "BFDADC" "Atribuída ao dev-pleno"
mk "agent:dev-senior"  "BFDADC" "Atribuída ao dev-senior"

echo "→ Garantindo que .claude/worktrees/ está no .gitignore..."
touch .gitignore
grep -qxF ".claude/worktrees/" .gitignore || echo ".claude/worktrees/" >> .gitignore

echo ""
echo "✅ Pronto. Próximos passos:"
echo "   1. Preencha o CLAUDE.md (principalmente os comandos de verificação)."
echo "   2. Abra o Claude Code com: claude --model opus"
echo "   3. Use: /cto <suas demandas>"
