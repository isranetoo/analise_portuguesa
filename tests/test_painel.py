"""Testes da dashboard no navegador (Playwright).

Abrem o index.html direto do disco, com os dados de dados.js. São ignorados quando o
Playwright não está instalado. Para rodar:

    pip install -r requirements-dev.txt
    python -m playwright install chromium
    python -m unittest
"""

import json
import re
import unittest
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover - depende do ambiente
    sync_playwright = None

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
PAGINAS = ["inicio", "trajetoria", "desempenho", "gols", "elenco", "jogos", "serie-d", "estadios", "comparacao"]


def dados():
    texto = (ROOT / "dados.js").read_text(encoding="utf-8")
    return json.loads(re.search(r"window\.__DASHBOARD_DATA__ = (.*);\s*$", texto, re.S).group(1))


@unittest.skipIf(sync_playwright is None, "Playwright não instalado")
class PainelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        try:
            cls.browser = cls.playwright.chromium.launch()
        except Exception:
            cls.browser = cls.playwright.chromium.launch(channel="chrome")
        cls.dados = dados()
        cls.jogos = [j for j in cls.dados["principal"]["jogos"] if j["status"] == "finished"]

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
        self.page = self.context.new_page()
        self.erros = []
        self.page.on("pageerror", lambda erro: self.erros.append(str(erro)))
        # Bloqueia recursos externos (mapa, fotos): o teste não deve depender da internet.
        self.page.route(re.compile(r"^https?://"), lambda route: route.abort())
        self.page.goto(INDEX.as_uri())

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.erros, [], "a página gerou erros de JavaScript")

    def paginas_visiveis(self):
        return self.page.evaluate("[...document.querySelectorAll('.page')].filter(p => !p.hidden).map(p => p.dataset.page)")

    def test_inicio_resume_a_campanha(self):
        pontos = sum(3 if j["resultado"] == "V" else 1 if j["resultado"] == "E" else 0 for j in self.jogos)
        self.assertEqual(self.paginas_visiveis(), ["inicio"])
        self.assertIn(f"{pontos} de {len(self.jogos) * 3} pontos", self.page.locator("#homeKpis").inner_text())
        self.assertEqual(self.page.locator("#headerGames").inner_text(), str(len(self.jogos)))
        self.assertFalse(self.page.is_visible("#filterRow"))

    def test_todas_as_paginas_abrem_pelo_menu(self):
        for pagina in PAGINAS:
            self.page.click(f"#mainNav a[data-page='{pagina}']")
            self.assertEqual(self.paginas_visiveis(), [pagina])
            self.assertEqual(self.page.evaluate("location.hash"), f"#{pagina}")

    def test_filtros_valem_entre_paginas(self):
        mata_mata = [j for j in self.jogos if j["etapa"] == "Mata-mata"]
        self.page.click("#mainNav a[data-page='gols']")
        self.page.click("#stageFilter button[data-filter='Mata-mata']")
        self.page.click("#mainNav a[data-page='jogos']")
        self.assertEqual(self.page.locator(".match-row").count(), len(mata_mata))

    def test_detalhes_do_jogo_e_pagina_do_atleta(self):
        self.page.click("#mainNav a[data-page='jogos']")
        self.page.locator(".match-row").first.click()
        detalhes = self.page.locator(".details-row:not([hidden])")
        self.assertIn("Súmula", detalhes.inner_text())
        detalhes.locator(".athlete-link").first.click()
        self.assertEqual(self.paginas_visiveis(), ["atleta"])
        self.assertTrue(self.page.evaluate("location.hash").startswith("#atleta/"))
        self.assertEqual(self.page.locator("#athleteMatches tr").count(), len(self.jogos))

    def test_link_para_atleta_inexistente_volta_ao_inicio(self):
        self.page.goto(INDEX.as_uri() + "#atleta/nao-existe")
        self.page.reload()
        self.assertEqual(self.paginas_visiveis(), ["inicio"])

    def test_download_do_csv_de_jogos(self):
        self.page.click("#mainNav a[data-page='jogos']")
        with self.page.expect_download() as info:
            self.page.click("#matchesDownload")
        linhas = Path(info.value.path()).read_text(encoding="utf-8-sig").splitlines()
        self.assertEqual(len(linhas), len(self.jogos) + 1)
        self.assertTrue(linhas[0].startswith("id_jogo,"))

    def test_serie_d_mostra_posicao_do_clube(self):
        clube = next(linha for linha in self.dados["principal"]["classificacao_geral"] if linha["clube"] == 1)
        self.page.click("#mainNav a[data-page='serie-d']")
        self.assertIn(f"{clube['posicao']}º de", self.page.locator("#leagueKpis").inner_text())
        self.assertEqual(self.page.locator(".league-metric").count(), 6)

    def test_mapa_sem_internet_mostra_aviso(self):
        self.page.click("#mainNav a[data-page='estadios']")
        self.page.wait_for_timeout(200)
        self.assertIn("km percorridos", self.page.locator("#travelSummary").inner_text())
        self.assertIn("Mapa indisponível", self.page.locator("#travelMap").inner_text())

    def test_temporada_sem_jogos_encerrados_mostra_aviso(self):
        # Simula o início de uma temporada: os jogos chegam do dados.js apenas agendados.
        self.page.add_init_script("""
            Object.defineProperty(window, '__DASHBOARD_DATA__', {
              configurable: true,
              set(dados) {
                dados.principal.jogos.forEach(j => { j.status = 'scheduled'; j.resultado = null; });
                dados.principal.gols = [];
                dados.principal.atletas = [];
                Object.defineProperty(window, '__DASHBOARD_DATA__', {value: dados, writable: true});
              }
            });
        """)
        self.page.reload()
        aviso = self.page.locator("main").inner_text()
        self.assertIn("ainda não disputou jogos", aviso)
        self.assertIn("estreia", aviso)
        self.assertFalse(self.page.is_visible("#mainNav"))

    def test_proximo_jogo_sem_data_mostra_traco(self):
        self.page.add_init_script("""
            Object.defineProperty(window, '__DASHBOARD_DATA__', {
              configurable: true,
              set(dados) {
                dados.principal.jogos.forEach(j => { j.status = 'scheduled'; j.resultado = null; j.data = ''; });
                dados.principal.gols = [];
                dados.principal.atletas = [];
                Object.defineProperty(window, '__DASHBOARD_DATA__', {value: dados, writable: true});
              }
            });
        """)
        self.page.reload()
        self.assertIn("estreia será em —", self.page.locator("main").inner_text())

    def test_tema_escuro(self):
        self.page.click("#themeToggle")
        self.assertIn(self.page.evaluate("document.documentElement.dataset.theme"), ("dark", "light"))


if __name__ == "__main__":
    unittest.main()
