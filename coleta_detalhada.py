"""Coleta os jogos de um clube na Série D (ou outra divisão) a partir da API pública da CBF.

O clube, a competição e a temporada de comparação vêm de config.json. Para a temporada
principal são gerados:

- {prefixo}_todos_jogos.csv: um registro por partida do clube;
- {prefixo}_grupo.csv: classificação final do grupo do clube na primeira fase;
- {prefixo}_gols.csv: todos os gols das partidas do clube (autor, tempo e minuto);
- {prefixo}_atletas.csv: participação dos atletas do clube em cada partida;
- {prefixo}_classificacao_geral.csv: campanha de todos os clubes da competição.

Os jogos recebem ainda o público e a renda lidos dos boletins financeiros (quando o PDF tem
texto; requer a biblioteca pdfplumber, com cache em boletins.json) e as coordenadas da
cidade, guardadas em coordenadas.json para não repetir consultas ao OpenStreetMap.

Para a temporada de comparação são gerados apenas os jogos e o grupo. Por fim, tudo é
consolidado em dados.js, o arquivo lido pela dashboard.

Não exige chave de API. Execute com:  python coleta_detalhada.py
"""

import csv
import io
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_URL = "https://www.cbf.com.br"
API_URL = f"{SITE_URL}/api/cbf"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (analise_clube)",
    "Accept": "application/json",
}
TIPOS_GOL = {"NR": "Normal", "PN": "Pênalti", "FT": "Falta", "CT": "Contra"}
GEOCODER_URL = "https://nominatim.openstreetmap.org/search"
ARQUIVO_COORDENADAS = ROOT / "coordenadas.json"
ARQUIVO_BOLETINS = ROOT / "boletins.json"


# =========================================================
# 1. ACESSO À CBF
# =========================================================

def baixar_bytes(url, headers=HEADERS):
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def baixar(url, como_json=True):
    corpo = baixar_bytes(url)
    return json.loads(corpo) if como_json else corpo.decode("utf-8", errors="replace")


def descobrir_competicao(slug, ano):
    """Lê o id do campeonato e as fases embutidos na página de tabelas da CBF."""
    url = f"{SITE_URL}/futebol-brasileiro/tabelas/campeonato-brasileiro/{slug}/{ano}"
    texto = baixar(url, como_json=False).replace('\\"', '"')

    competicao = re.search(r'"competitionId":"(\d+)"', texto)
    if not competicao:
        raise SystemExit(f"Não foi possível identificar a competição em {url}")

    fases = {}
    padrao = r'\{"fase_id":"(\d+)","fase_nome":"([^"]+)","rodadas_qtd":"(\d+)","fase_tipo":"(\w+)"'
    for fase_id, nome, rodadas, tipo in re.findall(padrao, texto):
        fases[fase_id] = {"id": fase_id, "nome_cbf": nome, "rodadas": int(rodadas), "tipo": tipo}

    # Os ids das fases crescem na ordem em que elas são disputadas.
    return competicao.group(1), sorted(fases.values(), key=lambda fase: int(fase["id"]))


TENTATIVAS = 4


def buscar_rodada(competicao_id, fase_id, rodada):
    """Busca os jogos de uma rodada, com novas tentativas em caso de falha.

    Se a rodada continuar indisponível, a coleta é interrompida: gravar dados parciais
    (um jogo a menos, por exemplo) seria pior do que manter os arquivos anteriores.
    """
    url = f"{API_URL}/jogos/campeonato/{competicao_id}/rodada/{rodada}/fase/{fase_id}"
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            dados = baixar(url)
            break
        except Exception as erro:
            print(f"   Falha em fase {fase_id}, rodada {rodada} (tentativa {tentativa}/{TENTATIVAS}): {erro}")
            if tentativa == TENTATIVAS:
                raise SystemExit(f"Não foi possível obter a fase {fase_id}, rodada {rodada}. Nenhum arquivo foi alterado.")
            time.sleep(2 ** tentativa)

    jogos = []
    for grupo in dados.get("jogos") or []:
        jogos.extend(grupo.get("jogo") or [])
    return jogos


# =========================================================
# 2. TRATAMENTO
# =========================================================

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


def nome_fase(fase, confrontos_por_rodada):
    """Nome de exibição da fase; no mata-mata usa o número de confrontos (8 = oitavas...)."""
    nome = fase["nome_cbf"].strip()
    if fase["tipo"] == "pontuacao":
        return "1ª fase"
    if "playoff" in nome.lower():
        return "Playoff de acesso"
    por_confrontos = {8: "Oitavas de final", 4: "Quartas de final", 2: "Semifinal", 1: "Final"}
    if confrontos_por_rodada in por_confrontos:
        return por_confrontos[confrontos_por_rodada]
    return re.sub(r"\bFase\b", "fase", nome)


def nome_clube(clube, nomes):
    if clube["id"] in nomes:
        return nomes[clube["id"]]
    # Remove sufixos societários que a CBF inclui no nome (ex.: "Rio Branco A.C. SAF").
    sufixos = r"(\s+(S\.?\s?A\.?\s?F\.?|F\.?\s?C\.?|A\.?\s?C\.?|E\.?\s?C\.?))+\s*$"
    nome = re.sub(sufixos, "", clube["nome"].strip(), flags=re.IGNORECASE)
    # Siglas de três letras vêm como nome comum (ex.: "Asa", "Abc", "Csa").
    return nome.upper() if re.fullmatch(r"[A-Za-z]{3}", nome) else nome


def nome_atleta(apelido):
    """A CBF prefixa o apelido com o número da camisa (ex.: '09 - Cauari')."""
    return re.sub(r"^\s*\d+\s*-\s*", "", apelido or "").strip()


def minuto_no_jogo(tempo, minutos):
    """Converte o minuto dentro do tempo (1 a 45, acréscimos contam como 45) para 1 a 90."""
    minuto = min(numero((minutos or "0").split(":")[0]) or 0, 45)
    if tempo in ("2", "TN2", "AC2"):
        return 45 + minuto
    if tempo == "INT":
        return 45
    if tempo == "PJ":
        return 90
    return minuto


def gols_do_jogo(jogo, nomes):
    """Lista os gols creditando gol contra ao adversário do autor."""
    mandante = jogo["mandante"]["id"]
    visitante = jogo["visitante"]["id"]
    gols = []
    for evento in jogo.get("penalidades") or []:
        if evento.get("tipo") != "GOL":
            continue
        autor_clube = evento.get("clube_id")
        clube = autor_clube
        if evento.get("resultado") == "CT":
            clube = visitante if autor_clube == mandante else mandante
        tempo = evento.get("tempo_jogo")
        gols.append({
            "clube_id": clube,
            "atleta_id": evento.get("atleta_id"),
            "atleta": nome_atleta(evento.get("atleta_apelido")),
            "tempo": tempo,
            "minuto_tempo": min(numero((evento.get("minutos") or "0").split(":")[0]) or 0, 45),
            "minuto_jogo": minuto_no_jogo(tempo, evento.get("minutos")),
            "tipo": TIPOS_GOL.get(evento.get("resultado"), "Normal"),
        })
    return sorted(gols, key=lambda gol: gol["minuto_jogo"])


def cartoes_por_clube(jogo):
    contagem = defaultdict(lambda: {"amarelos": 0, "vermelhos": 0})
    for evento in jogo.get("penalidades") or []:
        if evento.get("tipo") != "PENALIDADE":
            continue
        resultado = evento.get("resultado") or ""
        if resultado == "AMARELO":
            contagem[evento.get("clube_id")]["amarelos"] += 1
        elif "VERMELHO" in resultado:
            contagem[evento.get("clube_id")]["vermelhos"] += 1
    return contagem


def documento(jogo, prefixo):
    """Link de um documento do jogo (ex.: 'súmula', 'boletim')."""
    for doc in jogo.get("documentos") or []:
        if (doc.get("title") or "").strip().lower().startswith(prefixo):
            return doc.get("url", "")
    return ""


def arbitro_principal(jogo):
    for arbitro in jogo.get("arbitros") or []:
        if arbitro.get("funcao") == "Arbitro":
            return f"{arbitro.get('nome', '').strip()} ({arbitro.get('uf', '')})"
    return ""


def montar_linha(jogo, fase_nome, etapa, clube_id, nomes):
    em_casa = jogo["mandante"]["id"] == clube_id
    clube = jogo["mandante"] if em_casa else jogo["visitante"]
    adversario = jogo["visitante"] if em_casa else jogo["mandante"]

    gols_pro = numero(clube.get("gols"))
    gols_contra = numero(adversario.get("gols"))
    encerrado = gols_pro is not None and gols_contra is not None

    gols = gols_do_jogo(jogo, nomes)
    gols_pro_sumula = [gol for gol in gols if gol["clube_id"] == clube_id]
    gols_contra_sumula = [gol for gol in gols if gol["clube_id"] == adversario["id"]]
    sumula_confere = encerrado and len(gols_pro_sumula) == gols_pro and len(gols_contra_sumula) == gols_contra

    # Só confia no placar do intervalo quando os gols da súmula batem com o placar final.
    gols_1t_pro = gols_1t_contra = None
    if sumula_confere:
        gols_1t_pro = sum(1 for gol in gols_pro_sumula if gol["tempo"] == "1")
        gols_1t_contra = sum(1 for gol in gols_contra_sumula if gol["tempo"] == "1")
    elif encerrado:
        print(f"   Aviso: gols da súmula não conferem com o placar ({jogo['id_jogo']})")

    partes_local = [parte.strip() for parte in (jogo.get("local") or "").split(" - ")]
    rodada = numero(jogo.get("rodada"))
    rodada_rotulo = ("Ida" if rodada == 1 else "Volta") if etapa == "Mata-mata" else f"R{rodada}"

    penaltis_pro = numero(clube.get("panaltis")) or 0
    penaltis_contra = numero(adversario.get("panaltis")) or 0
    tem_penaltis = penaltis_pro + penaltis_contra > 0
    cartoes = cartoes_por_clube(jogo)

    return {
        "id_jogo": jogo["id_jogo"],
        "data": converter_data(jogo["data"]),
        "hora": jogo.get("hora", ""),
        "status": "finished" if encerrado else "scheduled",
        "etapa": etapa,
        "fase": fase_nome,
        "grupo": jogo.get("grupo", "").replace("GRUPO ", ""),
        "rodada": rodada_rotulo,
        "adversario": nome_clube(adversario, nomes),
        "mando": "Casa" if em_casa else "Fora",
        "gols_clube": gols_pro,
        "gols_adversario": gols_contra,
        "resultado": resultado_de(gols_pro, gols_contra),
        "gols_1t_clube": gols_1t_pro,
        "gols_1t_adversario": gols_1t_contra,
        "gols_2t_clube": None if gols_1t_pro is None else gols_pro - gols_1t_pro,
        "gols_2t_adversario": None if gols_1t_contra is None else gols_contra - gols_1t_contra,
        "resultado_intervalo": resultado_de(gols_1t_pro, gols_1t_contra),
        "penaltis_clube": penaltis_pro if tem_penaltis else None,
        "penaltis_adversario": penaltis_contra if tem_penaltis else None,
        "estadio": partes_local[0] if partes_local else "",
        "cidade": partes_local[1] if len(partes_local) > 1 else "",
        "uf": partes_local[2] if len(partes_local) > 2 else "",
        "arbitro": arbitro_principal(jogo),
        "sumula_url": documento(jogo, "súmula"),
        "boletim_url": documento(jogo, "boletim"),
        "amarelos_clube": cartoes[clube_id]["amarelos"] if encerrado else None,
        "vermelhos_clube": cartoes[clube_id]["vermelhos"] if encerrado else None,
        "amarelos_adversario": cartoes[adversario["id"]]["amarelos"] if encerrado else None,
        "vermelhos_adversario": cartoes[adversario["id"]]["vermelhos"] if encerrado else None,
    }


def linhas_de_gols(jogo, clube_id, nomes):
    if numero(jogo["mandante"].get("gols")) is None:
        return []
    return [
        {
            "id_jogo": jogo["id_jogo"],
            "equipe": "clube" if gol["clube_id"] == clube_id else "adversario",
            "atleta_id": gol["atleta_id"],
            "atleta": gol["atleta"],
            "tempo": gol["tempo"],
            "minuto_tempo": gol["minuto_tempo"],
            "minuto_jogo": gol["minuto_jogo"],
            "tipo": gol["tipo"],
        }
        for gol in gols_do_jogo(jogo, nomes)
    ]


def linhas_de_atletas(jogo, clube_id):
    """Participação dos atletas do clube: titularidade, minutos estimados, gols e cartões.

    Os minutos são estimados a partir das substituições e expulsões, considerando 90 minutos
    por partida (os acréscimos não entram na conta).
    """
    if numero(jogo["mandante"].get("gols")) is None:
        return []
    clube = jogo["mandante"] if jogo["mandante"]["id"] == clube_id else jogo["visitante"]
    atletas = {atleta["id"]: atleta for atleta in clube.get("atletas") or []}

    entrada, saida = {}, {}
    for atleta_id, atleta in atletas.items():
        if atleta.get("entrou_jogando") == "true":
            entrada[atleta_id] = 0
    for troca in clube.get("alteracoes") or []:
        minuto = minuto_no_jogo(troca.get("tempo_subs"), troca.get("tempo_jogo"))
        entrada.setdefault(troca.get("codigo_jogador_entrou"), minuto)
        saida[troca.get("codigo_jogador_saiu")] = minuto

    gols = defaultdict(int)
    amarelos = defaultdict(int)
    vermelhos = defaultdict(int)
    for evento in jogo.get("penalidades") or []:
        atleta_id = evento.get("atleta_id")
        if evento.get("clube_id") != clube_id or atleta_id not in atletas:
            continue
        resultado = evento.get("resultado") or ""
        if evento.get("tipo") == "GOL" and resultado != "CT":
            gols[atleta_id] += 1
        elif evento.get("tipo") == "PENALIDADE" and resultado == "AMARELO":
            amarelos[atleta_id] += 1
        elif evento.get("tipo") == "PENALIDADE" and "VERMELHO" in resultado:
            vermelhos[atleta_id] += 1
            minuto = minuto_no_jogo(evento.get("tempo_jogo"), evento.get("minutos"))
            saida[atleta_id] = min(saida.get(atleta_id, 90), minuto)

    linhas = []
    for atleta_id, inicio in entrada.items():
        if atleta_id not in atletas:
            continue
        fim = saida.get(atleta_id, 90)
        linhas.append({
            "id_jogo": jogo["id_jogo"],
            "atleta_id": atleta_id,
            "atleta": nome_atleta(atletas[atleta_id].get("apelido")),
            "camisa": numero(atletas[atleta_id].get("numero_camisa")),
            "foto": atletas[atleta_id].get("foto", ""),
            "goleiro": int(atletas[atleta_id].get("goleiro") == "true"),
            "titular": int(inicio == 0),
            "minuto_entrada": inicio,
            "minuto_saida": fim,
            "minutos": max(0, fim - inicio),
            "gols": gols[atleta_id],
            "amarelos": amarelos[atleta_id],
            "vermelhos": vermelhos[atleta_id],
        })
    return sorted(linhas, key=lambda linha: (-linha["titular"], linha["minuto_entrada"], linha["camisa"] or 99))


def classificacao_do_grupo(jogos_grupo, clube_id, nomes):
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
                "time": nome_clube(clube, nomes), "pontos": 0, "jogos": 0, "vitorias": 0,
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
            "clube": int(time_id == clube_id),
        }
        for posicao, (time_id, linha) in enumerate(ordenada, start=1)
    ]


def vencedor_do_confronto(partidas):
    """Id do clube que venceu um confronto de ida e volta (agregado e, se preciso, pênaltis)."""
    gols = defaultdict(int)
    penaltis = defaultdict(int)
    for jogo in partidas:
        for lado in ("mandante", "visitante"):
            gols[jogo[lado]["id"]] += numero(jogo[lado].get("gols")) or 0
            penaltis[jogo[lado]["id"]] += numero(jogo[lado].get("panaltis")) or 0
    if len(gols) != 2:
        return None
    (a, gols_a), (b, gols_b) = gols.items()
    if gols_a != gols_b:
        return a if gols_a > gols_b else b
    if penaltis[a] != penaltis[b]:
        return a if penaltis[a] > penaltis[b] else b
    return None


def classificacao_geral(partidas, clube_id, nomes):
    """Campanha de todos os clubes, ordenada pela fase alcançada e depois por pontos.

    partidas: lista de (jogo, nivel_da_fase, nome_da_fase, conta_para_nivel).
    O playoff de acesso soma pontos, mas não altera a fase alcançada.
    """
    tabela = {}
    confrontos_finais = defaultdict(list)
    nivel_final = max((nivel for _, nivel, _, conta in partidas if conta), default=0)
    for jogo, nivel, fase, conta_para_nivel in partidas:
        gols_m = numero(jogo["mandante"].get("gols"))
        gols_v = numero(jogo["visitante"].get("gols"))
        if gols_m is None or gols_v is None:
            continue
        cartoes = cartoes_por_clube(jogo)
        if conta_para_nivel and nivel == nivel_final:
            confrontos_finais[frozenset((jogo["mandante"]["id"], jogo["visitante"]["id"]))].append(jogo)
        for clube, pro, contra, casa in (
            (jogo["mandante"], gols_m, gols_v, True),
            (jogo["visitante"], gols_v, gols_m, False),
        ):
            linha = tabela.setdefault(clube["id"], {
                "time": nome_clube(clube, nomes), "nivel": 0, "fase_alcancada": "1ª fase",
                "pontos": 0, "jogos": 0, "vitorias": 0, "empates": 0, "derrotas": 0,
                "gols_pro": 0, "gols_contra": 0, "amarelos": 0, "vermelhos": 0,
                "pontos_casa": 0, "jogos_casa": 0, "pontos_fora": 0, "jogos_fora": 0,
            })
            if conta_para_nivel and nivel >= linha["nivel"]:
                linha["nivel"] = nivel
                linha["fase_alcancada"] = fase
            pontos = 3 if pro > contra else 1 if pro == contra else 0
            linha["pontos"] += pontos
            linha["jogos"] += 1
            linha["vitorias" if pontos == 3 else "empates" if pontos == 1 else "derrotas"] += 1
            linha["gols_pro"] += pro
            linha["gols_contra"] += contra
            linha["amarelos"] += cartoes[clube["id"]]["amarelos"]
            linha["vermelhos"] += cartoes[clube["id"]]["vermelhos"]
            linha["pontos_casa" if casa else "pontos_fora"] += pontos
            linha["jogos_casa" if casa else "jogos_fora"] += 1

    # O campeão fica um nível acima do vice.
    for jogos in confrontos_finais.values():
        campeao = vencedor_do_confronto(jogos)
        if campeao in tabela:
            tabela[campeao]["nivel"] += 1
            tabela[campeao]["fase_alcancada"] = "Campeão"

    ordenada = sorted(
        tabela.items(),
        key=lambda item: (
            item[1]["nivel"], item[1]["pontos"], item[1]["vitorias"],
            item[1]["gols_pro"] - item[1]["gols_contra"], item[1]["gols_pro"],
        ),
        reverse=True,
    )
    linhas = []
    for posicao, (time_id, linha) in enumerate(ordenada, start=1):
        linha = {"posicao": posicao, **linha, "saldo": linha["gols_pro"] - linha["gols_contra"], "clube": int(time_id == clube_id)}
        del linha["nivel"]
        linhas.append(linha)
    return linhas


def resumo_da_liga(partidas):
    """Números gerais da competição, calculados sobre todos os jogos encerrados."""
    jogos = [jogo for jogo, *_ in partidas
             if numero(jogo["mandante"].get("gols")) is not None and numero(jogo["visitante"].get("gols")) is not None]
    if not jogos:
        return {}
    gols = [numero(j["mandante"]["gols"]) + numero(j["visitante"]["gols"]) for j in jogos]
    mandante = sum(1 for j in jogos if numero(j["mandante"]["gols"]) > numero(j["visitante"]["gols"]))
    visitante = sum(1 for j in jogos if numero(j["mandante"]["gols"]) < numero(j["visitante"]["gols"]))
    return {
        "jogos": len(jogos),
        "gols": sum(gols),
        "media_gols_jogo": round(sum(gols) / len(jogos), 3),
        "vitorias_mandante": mandante,
        "empates": len(jogos) - mandante - visitante,
        "vitorias_visitante": visitante,
    }


def ler_boletim(texto):
    """Extrai público e renda do texto de um boletim financeiro.

    Aceita os modelos da FPF ("TOTAIS 2727 0 2727 R$ 42.130,00") e da FMF
    ("TOTAL 5.597 4.381 1.216 12.150,00"): à venda, devolvidos, vendidos e arrecadação.
    """
    def inteiro(valor):
        return int(valor.replace(".", ""))

    def moeda(valor):
        return float(valor.replace(".", "").replace(",", "."))

    totais = re.search(
        r"^TOTA(?:L|IS)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(?:R\$\s*)?(-?[\d.]+,\d{2})\s*$",
        texto, flags=re.MULTILINE,
    )
    if not totais:
        return None
    liquida = re.search(r"RENDA L[IÍ]QUIDA[^\n]*?(-?[\d.]+,\d{2})", texto)
    return {
        "publico": inteiro(totais.group(3)),
        "renda_bruta": moeda(totais.group(4)),
        "renda_liquida": moeda(liquida.group(1)) if liquida else None,
    }


def publicos_dos_boletins(jogos):
    """Público e renda de cada boletim, com cache em boletins.json (chave: link do PDF).

    Um boletim lido fica guardado e não é baixado de novo. Falhas de rede não entram no
    cache, para que o boletim seja tentado novamente na próxima coleta sem apagar dados.
    PDFs sem texto (documentos escaneados) ficam registrados como null.
    """
    cache = json.loads(ARQUIVO_BOLETINS.read_text(encoding="utf-8")) if ARQUIVO_BOLETINS.exists() else {}
    try:
        import pdfplumber
    except ImportError:
        print("   pdfplumber não instalado: usando apenas os boletins já guardados em boletins.json")
        return cache
    alterado = False
    for jogo in jogos:
        url = jogo["boletim_url"]
        if not url or url in cache:
            continue
        try:
            conteudo = baixar_bytes(url, {"User-Agent": HEADERS["User-Agent"]})
            with pdfplumber.open(io.BytesIO(conteudo)) as pdf:
                texto = "\n".join(pagina.extract_text() or "" for pagina in pdf.pages)
        except Exception as erro:
            print(f"   Boletim de {jogo['data']} indisponível agora ({erro}); será tentado na próxima coleta")
            continue
        cache[url] = ler_boletim(texto)
        alterado = True
    if alterado:
        ARQUIVO_BOLETINS.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    return cache


def coordenadas_das_cidades(jogos):
    """Latitude e longitude de cada cidade, com cache em coordenadas.json."""
    cache = {}
    if ARQUIVO_COORDENADAS.exists():
        cache = json.loads(ARQUIVO_COORDENADAS.read_text(encoding="utf-8"))
    alterado = False
    for jogo in jogos:
        chave = f"{jogo['cidade']}/{jogo['uf']}"
        if not jogo["cidade"] or chave in cache:
            continue
        consulta = urllib.parse.urlencode({
            "q": f"{jogo['cidade']}, {jogo['uf']}, Brasil", "format": "json", "limit": 1, "countrycodes": "br",
        })
        try:
            resultado = json.loads(baixar_bytes(f"{GEOCODER_URL}?{consulta}", {"User-Agent": "analise_clube/1.0 (coleta de dados)"}))
            cache[chave] = [round(float(resultado[0]["lat"]), 5), round(float(resultado[0]["lon"]), 5)] if resultado else None
        except Exception as erro:
            print(f"   Coordenadas indisponíveis para {chave}: {erro}")
            continue
        alterado = True
        time.sleep(1.1)  # política de uso do OpenStreetMap: no máximo 1 consulta por segundo
    if alterado:
        ARQUIVO_COORDENADAS.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    return cache


# =========================================================
# 3. COLETA DE UMA TEMPORADA
# =========================================================

def coletar_temporada(config, ano):
    clube_id = config["clube"]["id"]
    nomes = config.get("nomes", {})
    competicao_id, fases = descobrir_competicao(config["competicao"]["slug"], ano)
    print(f"\n### {config['competicao']['nome']} {ano} (campeonato {competicao_id})")

    jogos, gols, atletas = [], [], []
    jogos_primeira_fase = []
    todas_as_partidas = []
    grupo_clube = None

    for nivel, fase in enumerate(fases):
        etapa = "Grupos" if fase["tipo"] == "pontuacao" else "Mata-mata"
        jogos_da_fase = []
        for rodada in range(1, fase["rodadas"] + 1):
            rodada_jogos = buscar_rodada(competicao_id, fase["id"], rodada)
            jogos_da_fase.append(rodada_jogos)
            time.sleep(0.25)

        fase_nome = nome_fase(fase, len(jogos_da_fase[0]) if jogos_da_fase else 0)
        print(f"\n{fase_nome}")
        conta_para_nivel = fase_nome != "Playoff de acesso"
        for rodada_jogos in jogos_da_fase:
            if etapa == "Grupos":
                jogos_primeira_fase.extend(rodada_jogos)
            todas_as_partidas.extend((jogo, nivel, fase_nome, conta_para_nivel) for jogo in rodada_jogos)
            for jogo in rodada_jogos:
                if clube_id not in (jogo["mandante"]["id"], jogo["visitante"]["id"]):
                    continue
                linha = montar_linha(jogo, fase_nome, etapa, clube_id, nomes)
                jogos.append(linha)
                gols.extend(linhas_de_gols(jogo, clube_id, nomes))
                atletas.extend(linhas_de_atletas(jogo, clube_id))
                if etapa == "Grupos":
                    grupo_clube = jogo.get("grupo")
                print(
                    f"   {linha['data']} {linha['rodada']:>5} | {config['clube']['nome']} "
                    f"{linha['gols_clube']} x {linha['gols_adversario']} "
                    f"{linha['adversario']} ({linha['mando']})"
                )

    if not jogos:
        raise SystemExit(f"Nenhum jogo do clube encontrado em {ano}.")

    jogos.sort(key=lambda linha: (linha["data"], linha["hora"]))
    ordem = {linha["id_jogo"]: indice for indice, linha in enumerate(jogos)}
    gols.sort(key=lambda gol: (ordem[gol["id_jogo"]], gol["minuto_jogo"]))
    atletas.sort(key=lambda atleta: ordem[atleta["id_jogo"]])

    jogos_grupo = [jogo for jogo in jogos_primeira_fase if jogo.get("grupo") == grupo_clube]
    return {
        "ano": ano,
        "grupo_nome": (grupo_clube or "").replace("GRUPO ", ""),
        "jogos": jogos,
        "grupo": classificacao_do_grupo(jogos_grupo, clube_id, nomes),
        "gols": gols,
        "atletas": atletas,
        "classificacao_geral": classificacao_geral(todas_as_partidas, clube_id, nomes),
        "liga": resumo_da_liga(todas_as_partidas),
    }


# =========================================================
# 4. EXPORTAÇÃO
# =========================================================

def slug(texto):
    sem_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", sem_acentos.lower()).strip("_")


def prefixo_arquivos(config, ano):
    return f"{slug(config['clube']['nome'])}_{slug(config['competicao']['slug'])}_{ano}"


def salvar_csv(caminho, linhas):
    if not linhas:
        return
    with open(caminho, "w", newline="", encoding="utf-8") as saida:
        escritor = csv.DictWriter(saida, fieldnames=list(linhas[0].keys()))
        escritor.writeheader()
        escritor.writerows(linhas)


def salvar_dados_js(caminho, config, principal, comparacao):
    dados = {
        "config": {
            "clube": config["clube"],
            "competicao": config["competicao"],
        },
        "principal": principal,
        "comparacao": comparacao and {
            "ano": comparacao["ano"],
            "grupo_nome": comparacao["grupo_nome"],
            "jogos": comparacao["jogos"],
            "grupo": comparacao["grupo"],
        },
    }
    conteudo = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    caminho.write_text(
        "// Arquivo gerado por coleta_detalhada.py. Não edite manualmente.\n"
        f"window.__DASHBOARD_DATA__ = {conteudo};\n",
        encoding="utf-8",
    )


def main():
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    ano = config["competicao"]["ano"]
    principal = coletar_temporada(config, ano)

    print("\nPúblico e renda (boletins financeiros)")
    boletins = publicos_dos_boletins(principal["jogos"])
    for jogo in principal["jogos"]:
        publico = boletins.get(jogo["boletim_url"]) or {}
        jogo["publico"] = publico.get("publico")
        jogo["renda_bruta"] = publico.get("renda_bruta")
        jogo["renda_liquida"] = publico.get("renda_liquida")
        print(f"   {jogo['data']} {jogo['adversario']}: {jogo['publico'] if jogo['publico'] is not None else 'sem dados'}")

    coordenadas = coordenadas_das_cidades(principal["jogos"])
    for jogo in principal["jogos"]:
        latitude, longitude = coordenadas.get(f"{jogo['cidade']}/{jogo['uf']}") or (None, None)
        jogo["latitude"], jogo["longitude"] = latitude, longitude

    prefixo = prefixo_arquivos(config, ano)
    salvar_csv(ROOT / f"{prefixo}_todos_jogos.csv", principal["jogos"])
    salvar_csv(ROOT / f"{prefixo}_grupo.csv", principal["grupo"])
    salvar_csv(ROOT / f"{prefixo}_gols.csv", principal["gols"])
    salvar_csv(ROOT / f"{prefixo}_atletas.csv", principal["atletas"])
    salvar_csv(ROOT / f"{prefixo}_classificacao_geral.csv", principal["classificacao_geral"])

    comparacao = None
    ano_comparacao = (config.get("comparacao") or {}).get("ano")
    if ano_comparacao:
        comparacao = coletar_temporada(config, ano_comparacao)
        prefixo_comparacao = prefixo_arquivos(config, ano_comparacao)
        salvar_csv(ROOT / f"{prefixo_comparacao}_todos_jogos.csv", comparacao["jogos"])
        salvar_csv(ROOT / f"{prefixo_comparacao}_grupo.csv", comparacao["grupo"])

    salvar_dados_js(ROOT / "dados.js", config, principal, comparacao)

    print("\n" + "=" * 60)
    print("FINALIZADO")
    print("=" * 60)
    print("Jogos na temporada principal:", len(principal["jogos"]))
    print("Gols registrados:", len(principal["gols"]))
    print("Participações de atletas:", len(principal["atletas"]))
    if comparacao:
        print(f"Jogos em {ano_comparacao}:", len(comparacao["jogos"]))
    print("Arquivo da dashboard: dados.js")


if __name__ == "__main__":
    main()
