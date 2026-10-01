"""Testes do tratamento das súmulas da CBF.  Execute com:  python -m unittest"""

import unittest

import coleta_detalhada as coleta

CLUBE = "100"
ADVERSARIO = "200"
NOMES = {CLUBE: "Clube"}


def gol(clube_id, tempo, minuto, resultado="NR", atleta_id="1", apelido="09 - Artilheiro"):
    return {"tipo": "GOL", "resultado": resultado, "clube_id": clube_id, "tempo_jogo": tempo,
            "minutos": f"{minuto:02d}:00", "atleta_id": atleta_id, "atleta_apelido": apelido}


def cartao(clube_id, cor, tempo="TN2", minuto=10, atleta_id="1"):
    return {"tipo": "PENALIDADE", "resultado": cor, "clube_id": clube_id, "tempo_jogo": tempo,
            "minutos": f"{minuto:02d}:00", "atleta_id": atleta_id}


def atleta(atleta_id, titular=True, camisa=1):
    return {"id": atleta_id, "numero_camisa": str(camisa), "goleiro": "false",
            "entrou_jogando": "true" if titular else "false", "apelido": f"{camisa:02d} - Atleta {atleta_id}"}


def jogo(gols_clube=1, gols_adv=0, eventos=(), em_casa=True, penaltis=(0, 0), atletas=(), alteracoes=()):
    clube = {"id": CLUBE, "nome": "Clube Saf", "gols": str(gols_clube), "panaltis": str(penaltis[0]),
             "atletas": list(atletas), "alteracoes": list(alteracoes)}
    adversario = {"id": ADVERSARIO, "nome": "Rival F. C.", "gols": str(gols_adv), "panaltis": str(penaltis[1])}
    return {
        "id_jogo": "1", "rodada": "2", "grupo": "GRUPO B1", "data": " 20/06/2026", "hora": "16:00",
        "local": "Canindé - Sao Paulo - SP",
        "arbitros": [{"funcao": "Arbitro", "nome": "Fulano", "uf": "SP"}],
        "mandante": clube if em_casa else adversario,
        "visitante": adversario if em_casa else clube,
        "penalidades": list(eventos),
    }


class MontarLinhaTest(unittest.TestCase):
    def test_placar_do_intervalo_vem_da_sumula(self):
        linha = coleta.montar_linha(
            jogo(2, 1, [gol(CLUBE, "1", 10), gol(ADVERSARIO, "2", 5), gol(CLUBE, "2", 40)]),
            "2ª fase", "Mata-mata", CLUBE, NOMES)
        self.assertEqual((linha["gols_1t_clube"], linha["gols_1t_adversario"]), (1, 0))
        self.assertEqual((linha["gols_2t_clube"], linha["gols_2t_adversario"]), (1, 1))
        self.assertEqual(linha["resultado"], "V")
        self.assertEqual(linha["rodada"], "Volta")
        self.assertEqual(linha["adversario"], "Rival")
        self.assertEqual(linha["arbitro"], "Fulano (SP)")

    def test_gol_contra_conta_para_o_adversario_do_autor(self):
        # O zagueiro do adversário marca contra: o gol é do clube.
        linha = coleta.montar_linha(jogo(1, 0, [gol(ADVERSARIO, "1", 30, "CT")]), "1ª fase", "Grupos", CLUBE, NOMES)
        self.assertEqual(linha["gols_1t_clube"], 1)
        gols = coleta.linhas_de_gols(jogo(1, 0, [gol(ADVERSARIO, "1", 30, "CT")]), CLUBE, NOMES)
        self.assertEqual(gols[0]["equipe"], "clube")
        self.assertEqual(gols[0]["tipo"], "Contra")

    def test_sumula_incompleta_nao_inventa_intervalo(self):
        linha = coleta.montar_linha(jogo(2, 0, [gol(CLUBE, "1", 10)]), "1ª fase", "Grupos", CLUBE, NOMES)
        self.assertIsNone(linha["gols_1t_clube"])
        self.assertIsNone(linha["resultado_intervalo"])
        self.assertEqual(linha["resultado"], "V")

    def test_penaltis_so_aparecem_quando_houve_disputa(self):
        sem = coleta.montar_linha(jogo(1, 0, [gol(CLUBE, "1", 10)]), "2ª fase", "Mata-mata", CLUBE, NOMES)
        com = coleta.montar_linha(jogo(1, 0, [gol(CLUBE, "1", 10)], penaltis=(3, 4)), "2ª fase", "Mata-mata", CLUBE, NOMES)
        self.assertIsNone(sem["penaltis_clube"])
        self.assertEqual((com["penaltis_clube"], com["penaltis_adversario"]), (3, 4))

    def test_jogo_fora_inverte_mandante(self):
        linha = coleta.montar_linha(jogo(0, 2, [gol(ADVERSARIO, "1", 1), gol(ADVERSARIO, "2", 2)], em_casa=False),
                                    "1ª fase", "Grupos", CLUBE, NOMES)
        self.assertEqual((linha["mando"], linha["resultado"], linha["rodada"]), ("Fora", "D", "R2"))

    def test_jogo_sem_placar_fica_agendado(self):
        partida = jogo()
        partida["mandante"]["gols"] = ""
        partida["visitante"]["gols"] = ""
        linha = coleta.montar_linha(partida, "1ª fase", "Grupos", CLUBE, NOMES)
        self.assertEqual(linha["status"], "scheduled")
        self.assertIsNone(linha["resultado"])
        self.assertEqual(coleta.linhas_de_gols(partida, CLUBE, NOMES), [])


class MinutosTest(unittest.TestCase):
    def test_minuto_no_jogo(self):
        self.assertEqual(coleta.minuto_no_jogo("1", "12:00"), 12)
        self.assertEqual(coleta.minuto_no_jogo("2", "12:00"), 57)
        self.assertEqual(coleta.minuto_no_jogo("2", "49:00"), 90)  # acréscimos contam como 45
        self.assertEqual(coleta.minuto_no_jogo("INT", "45:00"), 45)
        self.assertEqual(coleta.minuto_no_jogo("PJ", "00:00"), 90)

    def test_minutos_jogados_com_substituicao_e_expulsao(self):
        atletas = [atleta("1", camisa=9), atleta("2", camisa=5), atleta("3", titular=False, camisa=20)]
        trocas = [{"codigo_jogador_saiu": "1", "codigo_jogador_entrou": "3", "tempo_subs": "TN2", "tempo_jogo": "15:00"}]
        eventos = [gol(CLUBE, "1", 10, atleta_id="1"), cartao(CLUBE, "VERMELHO2AMARELO", "TN2", 30, atleta_id="2"),
                   cartao(CLUBE, "AMARELO", "INT", 45, atleta_id="999")]  # 999: comissão técnica
        linhas = {linha["atleta_id"]: linha for linha in
                  coleta.linhas_de_atletas(jogo(1, 0, eventos, atletas=atletas, alteracoes=trocas), CLUBE)}
        self.assertEqual((linhas["1"]["minutos"], linhas["1"]["gols"]), (60, 1))
        self.assertEqual((linhas["2"]["minutos"], linhas["2"]["vermelhos"]), (75, 1))
        self.assertEqual((linhas["3"]["titular"], linhas["3"]["minuto_entrada"], linhas["3"]["minutos"]), (0, 60, 30))
        self.assertNotIn("999", linhas)
        self.assertEqual(linhas["1"]["atleta"], "Atleta 1")


class NomesTest(unittest.TestCase):
    def test_nome_fase(self):
        mata = {"tipo": "eliminacao", "nome_cbf": "4ª fase"}
        self.assertEqual(coleta.nome_fase({"tipo": "pontuacao", "nome_cbf": "1ª Fase"}, 48), "1ª fase")
        self.assertEqual(coleta.nome_fase({"tipo": "eliminacao", "nome_cbf": "2ª Fase"}, 32), "2ª fase")
        self.assertEqual(coleta.nome_fase(mata, 8), "Oitavas de final")
        self.assertEqual(coleta.nome_fase({"tipo": "eliminacao", "nome_cbf": "Playoff de Acesso"}, 2), "Playoff de acesso")

    def test_nome_clube_remove_sufixos(self):
        self.assertEqual(coleta.nome_clube({"id": "9", "nome": "Rio Branco A.C. SAF"}, {}), "Rio Branco")
        self.assertEqual(coleta.nome_clube({"id": "9", "nome": "Porto Vitória F. C."}, {}), "Porto Vitória")
        self.assertEqual(coleta.nome_clube({"id": "9", "nome": "Uberlândia Saf"}, {}), "Uberlândia")
        self.assertEqual(coleta.nome_clube({"id": "9", "nome": "Madureira"}, {"9": "Madureira-RJ"}), "Madureira-RJ")
        self.assertEqual(coleta.nome_clube({"id": "9", "nome": "Asa"}, {}), "ASA")


class BoletimTest(unittest.TestCase):
    def test_modelo_fpf(self):
        texto = "LOCALIDADES A VENDA\nTOTAIS 2727 0 2727 R$ 42.130,00\nRENDA LÍQUIDA (RECEITA - DESPESA) R$ -41.009,68"
        self.assertEqual(coleta.ler_boletim(texto), {"publico": 2727, "renda_bruta": 42130.0, "renda_liquida": -41009.68})

    def test_modelo_fmf(self):
        texto = "SETOR\nTOTAL 5.597 4.381 1.216 12.150,00\nTOTAL 38,91"
        self.assertEqual(coleta.ler_boletim(texto), {"publico": 1216, "renda_bruta": 12150.0, "renda_liquida": None})

    def test_boletim_sem_texto(self):
        self.assertIsNone(coleta.ler_boletim(""))

    def test_cache_de_boletins_resiste_a_falha_de_rede(self):
        import json
        import tempfile
        from pathlib import Path
        from unittest import mock

        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "boletins.json"
            guardado = {"publico": 100, "renda_bruta": 1000.0, "renda_liquida": None}
            arquivo.write_text(json.dumps({"https://cbf/a.pdf": guardado}), encoding="utf-8")
            jogos = [{"data": "2026-01-01", "boletim_url": "https://cbf/a.pdf"},
                     {"data": "2026-01-08", "boletim_url": "https://cbf/b.pdf"}]
            falha = mock.Mock(side_effect=OSError("conexão recusada"))
            with mock.patch.object(coleta, "ARQUIVO_BOLETINS", arquivo), mock.patch.object(coleta, "baixar_bytes", falha):
                cache = coleta.publicos_dos_boletins(jogos)
            # O boletim já lido não é baixado de novo; o que falhou não entra no cache.
            self.assertEqual(cache["https://cbf/a.pdf"], guardado)
            self.assertNotIn("https://cbf/b.pdf", cache)
            self.assertEqual(falha.call_count, 1)
            self.assertEqual(json.loads(arquivo.read_text(encoding="utf-8")), {"https://cbf/a.pdf": guardado})

    def test_resultado_distingue_sem_texto_de_formato_desconhecido(self):
        self.assertEqual(coleta.resultado_do_boletim(""), {"erro": "sem_texto"})
        self.assertEqual(coleta.resultado_do_boletim(" \n\n "), {"erro": "sem_texto"})
        self.assertEqual(coleta.resultado_do_boletim("BORDERÔ\nPÚBLICO PAGANTE 1.000"), {"erro": "formato_desconhecido"})
        texto = "SETOR\nTOTAL 5.597 4.381 1.216 12.150,00"
        self.assertEqual(coleta.resultado_do_boletim(texto), coleta.ler_boletim(texto))

    def _coletar_com_pdfs(self, guardado, textos):
        """Roda publicos_dos_boletins com um cache inicial e PDFs falsos (url -> texto)."""
        import json
        import sys
        import tempfile
        import types
        from pathlib import Path
        from unittest import mock

        def abrir(conteudo):
            pagina = mock.Mock()
            pagina.extract_text.return_value = textos[conteudo.decode()]
            pdf = mock.MagicMock()
            pdf.__enter__.return_value.pages = [pagina]
            return pdf

        pdfplumber = types.SimpleNamespace(open=lambda arquivo: abrir(arquivo.getvalue()))
        baixar = mock.Mock(side_effect=lambda url, headers: url.encode())
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "boletins.json"
            arquivo.write_text(json.dumps(guardado), encoding="utf-8")
            jogos = [{"data": "2026-01-01", "boletim_url": url} for url in list(guardado) + list(textos) if url]
            jogos = list({jogo["boletim_url"]: jogo for jogo in jogos}.values())
            with mock.patch.object(coleta, "ARQUIVO_BOLETINS", arquivo), \
                    mock.patch.object(coleta, "baixar_bytes", baixar), \
                    mock.patch.dict(sys.modules, {"pdfplumber": pdfplumber}):
                cache = coleta.publicos_dos_boletins(jogos)
            gravado = json.loads(arquivo.read_text(encoding="utf-8"))
        return cache, gravado, [chamada.args[0] for chamada in baixar.call_args_list]

    def test_cache_reprocessa_formato_desconhecido_e_null_antigo(self):
        lido = {"publico": 100, "renda_bruta": 1000.0, "renda_liquida": None}
        guardado = {
            "https://cbf/lido.pdf": lido,
            "https://cbf/escaneado.pdf": {"erro": "sem_texto"},
            "https://cbf/desconhecido.pdf": {"erro": "formato_desconhecido"},
            "https://cbf/antigo.pdf": None,
        }
        textos = {
            # O parser passou a entender o boletim que antes era desconhecido.
            "https://cbf/desconhecido.pdf": "TOTAL 10 0 10 100,00",
            # null de versões anteriores: motivo desconhecido, então é lido de novo.
            "https://cbf/antigo.pdf": "",
            "https://cbf/novo.pdf": "LAYOUT QUE NINGUEM CONHECE",
        }
        cache, gravado, baixados = self._coletar_com_pdfs(guardado, textos)
        self.assertEqual(sorted(baixados), sorted(textos))
        self.assertEqual(cache["https://cbf/lido.pdf"], lido)
        self.assertEqual(cache["https://cbf/escaneado.pdf"], {"erro": "sem_texto"})
        self.assertEqual(cache["https://cbf/desconhecido.pdf"], {"publico": 10, "renda_bruta": 100.0, "renda_liquida": None})
        self.assertEqual(cache["https://cbf/antigo.pdf"], {"erro": "sem_texto"})
        self.assertEqual(cache["https://cbf/novo.pdf"], {"erro": "formato_desconhecido"})
        self.assertEqual(gravado, cache)

    def test_formato_desconhecido_continua_sendo_tentado(self):
        guardado = {"https://cbf/desconhecido.pdf": {"erro": "formato_desconhecido"}}
        textos = {"https://cbf/desconhecido.pdf": "AINDA DESCONHECIDO"}
        cache, gravado, baixados = self._coletar_com_pdfs(guardado, textos)
        self.assertEqual(baixados, ["https://cbf/desconhecido.pdf"])
        self.assertEqual(cache, guardado)
        self.assertEqual(gravado, guardado)


class ClassificacaoGeralTest(unittest.TestCase):
    def test_fase_alcancada_e_campeao(self):
        def partida(m, v, gm, gv, pen=(0, 0)):
            return {"mandante": {"id": m, "nome": m, "gols": str(gm), "panaltis": str(pen[0])},
                    "visitante": {"id": v, "nome": v, "gols": str(gv), "panaltis": str(pen[1])}}
        partidas = [
            (partida("A", "B", 3, 0), 0, "1ª fase", True),
            (partida("C", "D", 0, 0), 0, "1ª fase", True),
            # Final entre C e B: empate no agregado, C vence nos pênaltis.
            (partida("C", "B", 1, 0), 1, "Final", True),
            (partida("B", "C", 1, 0, (5, 6)), 1, "Final", True),
        ]
        tabela = coleta.classificacao_geral(partidas, "A", {})
        self.assertEqual([(l["time"], l["fase_alcancada"]) for l in tabela][:2], [("C", "Campeão"), ("B", "Final")])
        self.assertEqual(tabela[2]["time"], "A")  # 3 pontos, mas parou na 1ª fase


class ClassificacaoTest(unittest.TestCase):
    def test_desempate_por_saldo(self):
        def partida(m, v, gm, gv):
            return {"mandante": {"id": m, "nome": m, "gols": str(gm)}, "visitante": {"id": v, "nome": v, "gols": str(gv)}}
        # A e B têm 4 pontos e 1 vitória cada; A fica na frente pelo saldo (+3 contra +1).
        jogos = [partida("A", "C", 3, 0), partida("A", "B", 1, 1), partida("B", "C", 1, 0)]
        tabela = coleta.classificacao_do_grupo(jogos, "A", {})
        self.assertEqual([linha["time"] for linha in tabela], ["A", "B", "C"])
        self.assertEqual(tabela[0]["clube"], 1)


if __name__ == "__main__":
    unittest.main()
