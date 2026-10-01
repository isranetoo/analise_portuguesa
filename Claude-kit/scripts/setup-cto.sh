#!/usr/bin/env bash
# Configura o repositório atual para o workflow CTO + devs do Claude-kit.
# Uso: bash scripts/setup-cto.sh   (rodar na raiz do repo, com `gh auth login` feito)
# Edite a lista AREAS abaixo com as áreas da seção 4 do seu CLAUDE.md antes de rodar.
set -euo pipefail

command -v gh >/dev/null || { echo "ERRO: GitHub CLI (gh) não encontrado. Instale: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "ERRO: rode 'gh auth login' primeiro."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode dentro de um repositório git."; exit 1; }

# Pausa entre chamadas que escrevem (ver "Ritmo das chamadas ao GitHub" no CLAUDE.md).
PAUSA="${PAUSA:-5}"

mk() {
  gh label create "$1" --color "$2" --description "$3" --force >/dev/null && echo "  ok $1"
  sleep "$PAUSA"
}

echo "-> Criando labels no GitHub (pausa de ${PAUSA}s entre chamadas)..."

# Nível (define o modelo no despacho: easy -> haiku, medium -> sonnet, hard -> opus)
mk "difficulty:easy"   "0E8A16" "Tarefa fácil (haiku)"
mk "difficulty:medium" "FBCA04" "Tarefa média (sonnet)"
mk "difficulty:hard"   "D93F0B" "Tarefa difícil (opus)"

# Tipo
mk "type:bug"     "B60205" "Correção de bug"
mk "type:feature" "1D76DB" "Nova funcionalidade"
mk "type:chore"   "C5DEF5" "Manutenção / infra"

# Agentes ativos do kit (.claude/agents/)
AGENTES=(
  "dev-junior:genérico nível fácil"
  "dev-pleno:genérico nível médio"
  "dev-senior:genérico nível difícil"
  "reviewer:revisão geral e clean code"
  "tech-lead:plano e quebra de issues grandes"
  "arquiteto-software:decisões técnicas e contratos entre áreas"
  "esp-python:código Python"
  "esp-qa:testes unitários e cobertura"
  "esp-e2e:testes E2E com Playwright"
  "esp-cicd:GitHub Actions (só com pedido explícito)"
  "esp-appsec:segurança de aplicações"
  "esp-a11y:acessibilidade"
  "esp-css:CSS e design system"
  "esp-uiux:interface e UX"
  "esp-performance-web:performance web"
  "esp-dados:dados gerados e validação"
  "esp-scraping:fontes externas, scraping e PDFs"
)
for item in "${AGENTES[@]}"; do
  mk "agent:${item%%:*}" "BFDADC" "${item#*:}"
done

# Áreas de exemplo: troque pelas da seção 4 do seu CLAUDE.md
AREAS=(
  "frontend:interface do produto"
  "backend:servidor e APIs"
  "dados:coleta e dados gerados"
  "docs:documentação"
  "ci:workflows do GitHub Actions"
  "kit:kit de agentes (CLAUDE.md, .claude/, scripts/)"
)
for item in "${AREAS[@]}"; do
  mk "area:${item%%:*}" "D4C5F9" "${item#*:}"
done

echo "-> Garantindo que .claude/worktrees/ está no .gitignore..."
touch .gitignore
grep -qxF ".claude/worktrees/" .gitignore || echo ".claude/worktrees/" >> .gitignore

echo ""
echo "Pronto. Próximos passos:"
echo "   1. Preencha o CLAUDE.md (marcadores <...>, comandos, áreas)."
echo "   2. Crie o GitHub Project com os campos Priority, Size e Status (ver README do kit)."
echo "   3. Comite os arquivos na main e abra o Claude Code com: claude --model opus"
echo "   4. Use: /cto <suas demandas>"
