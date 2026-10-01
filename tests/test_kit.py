"""Valida o frontmatter dos agentes e skills do kit (sem dependencia nova)."""
import re
import unittest
from pathlib import Path

try:
    import yaml
except ImportError:  # PyYAML e opcional
    yaml = None

RAIZ = Path(__file__).resolve().parent.parent
KIT = RAIZ / "Claude-kit"

AGENTES_DO_KIT = {
    "dev-junior", "dev-pleno", "dev-senior", "reviewer", "tech-lead",
    "arquiteto-software", "esp-python", "esp-qa", "esp-e2e", "esp-cicd",
    "esp-appsec", "esp-a11y", "esp-css", "esp-uiux", "esp-performance-web",
    "esp-dados", "esp-scraping",
}
SKILLS_DO_KIT = {"abrir-pr", "atualizar-pr", "criar-issue", "revisar-pr"}

# Referencias a este projeto que nao podem aparecer no kit generico.
REFERENCIAS_DO_PROJETO = re.compile(
    r"isranetoo|portuguesa|\bcbf\b|streamlit|coleta_detalhada|\bapp\.js\b"
    r"|projects/2\b|item-edit 2\b|test_painel|test_coleta|dados\.js",
    re.IGNORECASE,
)


def arquivos_do_kit():
    arquivos = []
    for base in (RAIZ, KIT):
        arquivos += base.glob(".claude/agents/*.md")
        arquivos += base.glob(".claude/skills/*/SKILL.md")
    arquivos += [p for p in KIT.glob("agentes/**/*.md") if p.name != "README.md"]
    return sorted(arquivos)


def extrair_frontmatter(texto):
    """Devolve as linhas entre os dois `---` iniciais, ou None."""
    linhas = texto.lstrip("﻿").splitlines()
    if not linhas or linhas[0].strip() != "---":
        return None
    for i in range(1, len(linhas)):
        if linhas[i].strip() == "---":
            return linhas[1:i]
    return None


class FrontmatterKitTest(unittest.TestCase):
    def test_existem_arquivos_do_kit(self):
        self.assertTrue(arquivos_do_kit())

    def test_frontmatter_valido_em_todos_os_arquivos(self):
        for caminho in arquivos_do_kit():
            nome_arquivo = caminho.relative_to(RAIZ).as_posix()
            with self.subTest(arquivo=nome_arquivo):
                linhas = extrair_frontmatter(caminho.read_text(encoding="utf-8"))
                self.assertIsNotNone(linhas, "frontmatter entre --- ausente")
                chaves = {}
                for linha in linhas:
                    m = re.match(r"^([A-Za-z_][\w-]*):(?:\s+(.*))?$", linha)
                    if not m:
                        continue  # continuacao, comentario ou linha vazia
                    chave, valor = m.group(1), (m.group(2) or "").strip()
                    chaves[chave] = valor
                    if valor and valor[0] not in "\"'[{|>":
                        self.assertNotIn(
                            ": ", valor,
                            f"'{chave}' tem ': ' sem aspas (YAML invalido)")
                self.assertTrue(chaves.get("name"), "falta name")
                self.assertTrue(chaves.get("description"), "falta description")
                if yaml is not None:
                    dados = yaml.safe_load("\n".join(linhas))
                    self.assertIsInstance(dados, dict)
                    self.assertTrue(dados.get("name"))
                    self.assertTrue(dados.get("description"))


class ClaudeKitTest(unittest.TestCase):
    def test_estrutura_completa(self):
        esperados = ["README.md", "CLAUDE.md", ".worktreeinclude",
                     "scripts/setup-cto.sh", ".claude/commands/cto.md",
                     "agentes/README.md"]
        esperados += [f".claude/agents/{nome}.md" for nome in AGENTES_DO_KIT]
        esperados += [f".claude/skills/{nome}/SKILL.md" for nome in SKILLS_DO_KIT]
        for relativo in esperados:
            with self.subTest(arquivo=relativo):
                self.assertTrue((KIT / relativo).is_file())
        nomes = {p.stem for p in KIT.glob(".claude/agents/*.md")}
        self.assertEqual(nomes, AGENTES_DO_KIT)

    def test_biblioteca_movida_para_o_kit(self):
        restantes = [p for p in (RAIZ / "kit").rglob("*") if p.is_file()]
        self.assertEqual(restantes, [], "kit/ deveria ter sido movido")
        self.assertTrue(list(KIT.glob("agentes/*/*.md")))

    def test_kit_sem_referencia_ao_projeto(self):
        for caminho in sorted(p for p in KIT.rglob("*") if p.is_file()):
            texto = caminho.read_text(encoding="utf-8")
            with self.subTest(arquivo=caminho.relative_to(RAIZ).as_posix()):
                achado = REFERENCIAS_DO_PROJETO.search(texto)
                self.assertIsNone(achado, achado and achado.group(0))

    def test_name_igual_ao_nome_do_arquivo(self):
        for caminho in KIT.glob(".claude/agents/*.md"):
            with self.subTest(arquivo=caminho.name):
                linhas = extrair_frontmatter(caminho.read_text(encoding="utf-8"))
                self.assertIn(f"name: {caminho.stem}", linhas)

    def test_setup_cria_label_de_todos_os_agentes(self):
        script = (KIT / "scripts" / "setup-cto.sh").read_text(encoding="utf-8")
        for nome in AGENTES_DO_KIT:
            with self.subTest(agente=nome):
                self.assertIn(f'"{nome}:', script)

    def test_sem_referencia_antiga_a_kit_agentes(self):
        arquivos = [RAIZ / "CLAUDE.md", RAIZ / "README-CTO.md"]
        arquivos += RAIZ.glob(".claude/**/*.md")
        arquivos += KIT.rglob("*.md")
        for caminho in arquivos:
            with self.subTest(arquivo=caminho.relative_to(RAIZ).as_posix()):
                texto = caminho.read_text(encoding="utf-8")
                self.assertNotRegex(texto, r"(?<!Claude-)kit/agentes")


if __name__ == "__main__":
    unittest.main()
