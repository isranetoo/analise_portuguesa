"""Coleta os jogos da Portuguesa na Série D 2026 a partir da API pública da CBF.

Gera dois arquivos usados pela dashboard:

- portuguesa_serie_d_2026_todos_jogos.csv: um registro por partida da Portuguesa;
- portuguesa_serie_d_2026_grupo.csv: classificação final do grupo da primeira fase.

Não exige chave de API. Execute com:  python coleta_detalhada.py
"""

import csv
import json
import time
import urllib.request
from collections import defaultdict

BASE_URL = "https://www.cbf.com.br/api/cbf"
CAMPEONATO_ID = "1260635"  # Campeonato Brasileiro Série D 2026
PORTUGUESA_ID = "63521"    # Portuguesa Saf (SP)

# Fases da Série D 2026: (id da fase na CBF, nome exibido, quantidade de rodadas).
# A primeira fase é de grupos; as demais são confrontos de ida e volta.
FASES = [
    ("2040", "1ª fase", 10),
    ("2066", "2ª fase", 2),
    ("2068", "3ª fase", 2),
    ("2075", "Oitavas de final", 2),
    ("2080", "Quartas de final", 2),
    ("2089", "Semifinal", 2),
    ("2099", "Final", 2),
]
FASE_GRUPOS = "2040"

# Nomes de exibição por id do clube na CBF (a CBF usa "Saf" e omite acentos em alguns nomes).
NOMES = {
    PORTUGUESA_ID: "Portuguesa",
    "20805": "Portuguesa-RJ",
    "20046": "America-RJ",
    "32387": "Sampaio Corrêa-RJ",
}

ARQUIVO_JOGOS = "portuguesa_serie_d_2026_todos_jogos.csv"
ARQUIVO_GRUPO = "portuguesa_serie_d_2026_grupo.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (analise_portuguesa)",
    "Accept": "application/json",
    "Referer": "https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026",
}


# =========================================================
# 1. BUSCAR JOGOS NA CBF
# =========================================================

def buscar_rodada(fase_id, rodada):
    url = f"{BASE_URL}/jogos/campeonato/{CAMPEONATO_ID}/rodada/{rodada}/fase/{fase_id}"
    request = urllib.request.Request(url, headers=HEADERS)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            dados = json.load(response)
    except Exception as erro:
        print(f"   Falha em fase {fase_id}, rodada {rodada}: {erro}")
        return []

    jogos = []
    for grupo in dados.get("jogos") or []:
        jogos.extend(grupo.get("jogo") or [])
    return jogos


# =========================================================
# 2. TRATAMENTO
# =========================================================

def nome_clube(clube):
    if clube["id"] in NOMES:
        return NOMES[clube["id"]]
    nome = clube["nome"].strip()
    return nome[:-4] if nome.endswith(" Saf") else nome


def numero(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def converter_data(valor):
    dia, mes, ano = valor.strip().split("/")
    return f"{ano}-{mes}-{dia}"


def resultado_de(gols_pro, gols_contra):
    if gols_pro is None or gols_contra is None:
        return None
    if gols_pro > gols_contra:
        return "V"
    if gols_pro < gols_contra:
        return "D"
    return "E"


def eventos_por_clube(jogo):
    """Conta gols do 1º tempo e cartões por clube a partir das penalidades da súmula."""
    mandante = jogo["mandante"]["id"]
    visitante = jogo["visitante"]["id"]
    contagem = defaultdict(lambda: {"gols": 0, "gols_1t": 0, "amarelos": 0, "vermelhos": 0})

    for evento in jogo.get("penalidades") or []:
        clube = evento.get("clube_id")
        if evento.get("tipo") == "GOL":
            # Gol contra (CT) é registrado no clube do autor: vale para o adversário.
            if evento.get("resultado") == "CT":
                clube = visitante if clube == mandante else mandante
            contagem[clube]["gols"] += 1
            if evento.get("tempo_jogo") == "1":
                contagem[clube]["gols_1t"] += 1
        elif evento.get("tipo") == "PENALIDADE":
            if evento.get("resultado") == "AMARELO":
                contagem[clube]["amarelos"] += 1
            elif "VERMELHO" in (evento.get("resultado") or ""):
                contagem[clube]["vermelhos"] += 1

    return contagem


def montar_linha(jogo, fase_nome, etapa):
    em_casa = jogo["mandante"]["id"] == PORTUGUESA_ID
    portuguesa = jogo["mandante"] if em_casa else jogo["visitante"]
    adversario = jogo["visitante"] if em_casa else jogo["mandante"]

    gols_pro = numero(portuguesa.get("gols"))
    gols_contra = numero(adversario.get("gols"))
    encerrado = gols_pro is not None and gols_contra is not None

    eventos = eventos_por_clube(jogo)
    ev_pro = eventos[PORTUGUESA_ID]
    ev_contra = eventos[adversario["id"]]

    # Só confia no placar do intervalo quando os gols da súmula batem com o placar final.
    gols_1t_pro = gols_1t_contra = None
    if encerrado and ev_pro["gols"] == gols_pro and ev_contra["gols"] == gols_contra:
        gols_1t_pro = ev_pro["gols_1t"]
        gols_1t_contra = ev_contra["gols_1t"]
    elif encerrado:
        print(f"   Aviso: gols da súmula não conferem com o placar ({jogo['id_jogo']})")

    partes_local = [parte.strip() for parte in (jogo.get("local") or "").split(" - ")]
    estadio = partes_local[0] if partes_local else ""
    cidade = partes_local[1] if len(partes_local) > 1 else ""

    rodada = numero(jogo.get("rodada"))
    if etapa == "Mata-mata":
        rodada_rotulo = "Ida" if rodada == 1 else "Volta"
    else:
        rodada_rotulo = f"R{rodada}"

    penaltis_pro = numero(portuguesa.get("panaltis")) or 0
    penaltis_contra = numero(adversario.get("panaltis")) or 0
    tem_penaltis = penaltis_pro + penaltis_contra > 0

    return {
        "id_jogo": jogo["id_jogo"],
        "data": converter_data(jogo["data"]),
        "hora": jogo.get("hora", ""),
        "status": "finished" if encerrado else "scheduled",
        "etapa": etapa,
        "fase": fase_nome,
        "grupo": jogo.get("grupo", "").replace("GRUPO ", ""),
        "rodada": rodada_rotulo,
        "adversario": nome_clube(adversario),
        "mando": "Casa" if em_casa else "Fora",
        "gols_portuguesa": gols_pro,
        "gols_adversario": gols_contra,
        "resultado": resultado_de(gols_pro, gols_contra),
        "gols_1t_portuguesa": gols_1t_pro,
        "gols_1t_adversario": gols_1t_contra,
        "gols_2t_portuguesa": None if gols_1t_pro is None else gols_pro - gols_1t_pro,
        "gols_2t_adversario": None if gols_1t_contra is None else gols_contra - gols_1t_contra,
        "resultado_intervalo": resultado_de(gols_1t_pro, gols_1t_contra),
        "penaltis_portuguesa": penaltis_pro if tem_penaltis else None,
        "penaltis_adversario": penaltis_contra if tem_penaltis else None,
        "estadio": estadio,
        "cidade": cidade,
        "amarelos_portuguesa": ev_pro["amarelos"] if encerrado else None,
        "vermelhos_portuguesa": ev_pro["vermelhos"] if encerrado else None,
        "amarelos_adversario": ev_contra["amarelos"] if encerrado else None,
        "vermelhos_adversario": ev_contra["vermelhos"] if encerrado else None,
    }


def classificacao_do_grupo(jogos_grupo):
    """Critérios da Série D: pontos, vitórias, saldo de gols e gols marcados."""
    tabela = {}
    for jogo in jogos_grupo:
        gols_m = numero(jogo["mandante"].get("gols"))
        gols_v = numero(jogo["visitante"].get("gols"))
        if gols_m is None or gols_v is None:
            continue
        for clube, pro, contra in (
            (jogo["mandante"], gols_m, gols_v),
            (jogo["visitante"], gols_v, gols_m),
        ):
            linha = tabela.setdefault(clube["id"], {
                "time": nome_clube(clube), "pontos": 0, "jogos": 0, "vitorias": 0,
                "empates": 0, "derrotas": 0, "gols_pro": 0, "gols_contra": 0,
            })
            linha["jogos"] += 1
            linha["gols_pro"] += pro
            linha["gols_contra"] += contra
            if pro > contra:
                linha["vitorias"] += 1
                linha["pontos"] += 3
            elif pro == contra:
                linha["empates"] += 1
                linha["pontos"] += 1
            else:
                linha["derrotas"] += 1

    ordenada = sorted(
        tabela.items(),
        key=lambda item: (
            item[1]["pontos"], item[1]["vitorias"],
            item[1]["gols_pro"] - item[1]["gols_contra"], item[1]["gols_pro"],
        ),
        reverse=True,
    )
    return [
        {
            "posicao": posicao,
            **linha,
            "saldo": linha["gols_pro"] - linha["gols_contra"],
            "portuguesa": int(clube_id == PORTUGUESA_ID),
        }
        for posicao, (clube_id, linha) in enumerate(ordenada, start=1)
    ]


def salvar_csv(arquivo, linhas):
    with open(arquivo, "w", newline="", encoding="utf-8") as saida:
        escritor = csv.DictWriter(saida, fieldnames=list(linhas[0].keys()))
        escritor.writeheader()
        escritor.writerows(linhas)


# =========================================================
# 3. EXECUÇÃO
# =========================================================

def main():
    linhas = []
    grupo_portuguesa = None
    jogos_primeira_fase = []

    for fase_id, fase_nome, rodadas in FASES:
        etapa = "Grupos" if fase_id == FASE_GRUPOS else "Mata-mata"
        print(f"\n{fase_nome}")

        for rodada in range(1, rodadas + 1):
            jogos = buscar_rodada(fase_id, rodada)
            if fase_id == FASE_GRUPOS:
                jogos_primeira_fase.extend(jogos)

            for jogo in jogos:
                ids = (jogo["mandante"]["id"], jogo["visitante"]["id"])
                if PORTUGUESA_ID not in ids:
                    continue
                linha = montar_linha(jogo, fase_nome, etapa)
                linhas.append(linha)
                if fase_id == FASE_GRUPOS:
                    grupo_portuguesa = jogo.get("grupo")
                print(
                    f"   {linha['data']} {linha['rodada']:>5} | Portuguesa "
                    f"{linha['gols_portuguesa']} x {linha['gols_adversario']} "
                    f"{linha['adversario']} ({linha['mando']})"
                )

            time.sleep(0.25)

    if not linhas:
        raise SystemExit("Nenhum jogo da Portuguesa encontrado.")

    linhas.sort(key=lambda linha: (linha["data"], linha["hora"]))
    salvar_csv(ARQUIVO_JOGOS, linhas)

    jogos_grupo = [jogo for jogo in jogos_primeira_fase if jogo.get("grupo") == grupo_portuguesa]
    salvar_csv(ARQUIVO_GRUPO, classificacao_do_grupo(jogos_grupo))

    encerrados = [linha for linha in linhas if linha["status"] == "finished"]
    print("\n" + "=" * 60)
    print("FINALIZADO")
    print("=" * 60)
    print("Jogos encontrados:", len(linhas))
    print("Jogos encerrados:", len(encerrados))
    print("Arquivos:", ARQUIVO_JOGOS, "e", ARQUIVO_GRUPO)


if __name__ == "__main__":
    main()
