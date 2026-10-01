"""Valida o frontmatter dos agentes e skills do kit (sem dependencia nova)."""
import re
import unittest
from pathlib import Path

try:
    import yaml
except ImportError:  # PyYAML e opcional
    yaml = None

RAIZ = Path(__file__).resolve().parent.parent


def arquivos_do_kit():
    arquivos = list(RAIZ.glob(".claude/agents/*.md"))
    arquivos += RAIZ.glob(".claude/skills/*/SKILL.md")
    arquivos += [p for p in RAIZ.glob("kit/agentes/**/*.md") if p.name != "README.md"]
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


if __name__ == "__main__":
    unittest.main()
