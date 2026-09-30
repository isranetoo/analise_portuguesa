<p align="center">
  <img src="portuguesa-logo.svg" alt="Escudo da Portuguesa" width="100">
</p>

<h1 align="center">Dashboard Gerencial — Portuguesa na Série D 2026</h1>

<p align="center">
  Projeto de análise de dados esportivos que transforma os resultados da campanha da Portuguesa em indicadores de desempenho, leitura por fase e retrospectiva do mata-mata.
</p>

<p align="center">
  <img alt="Streamlit" src="https://img.shields.io/badge/Streamlit-1.64-FF4B4B?logo=streamlit&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=111111">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="Fonte" src="https://img.shields.io/badge/dados-CBF-0E773E">
</p>

![Visão geral da dashboard](dashboard-preview.png)

## Sobre o projeto

Esta dashboard apresenta uma retrospectiva da campanha da Associação Portuguesa de Desportos na Série D do Campeonato Brasileiro de 2026 sob uma perspectiva gerencial. O painel consolida os resultados jogo a jogo, compara o desempenho dentro e fora de casa e mostra a trajetória do clube da fase de grupos até a eliminação no mata-mata.

## Panorama analisado

| Indicador | Resultado |
|---|---:|
| Jogos disputados | 16 |
| Pontos conquistados | 32 |
| Campanha | 9 vitórias, 5 empates e 2 derrotas |
| Aproveitamento | 66,7% |
| Média de pontos | 2,00 por jogo |
| Gols | 22 marcados e 10 sofridos |
| Saldo de gols | +12 |
| Desfecho | Eliminada nas oitavas de final |

Os dados cobrem a campanha completa, de 4 de abril a 25 de julho de 2026.

## Trajetória

| Fase | Adversário | Ida | Volta | Agregado | Situação |
|---|---|:---:|:---:|:---:|---|
| 1ª fase — Grupo A13 | — | — | — | 21 pts | 1ª colocada |
| 2ª fase | Sampaio Corrêa-RJ | 1 × 1 (fora) | 1 × 0 (casa) | 2 × 1 | Classificada |
| 3ª fase | Marcílio Dias | 1 × 1 (fora) | 2 × 0 (casa) | 3 × 1 | Classificada |
| Oitavas de final | Uberlândia | 0 × 2 (fora) | 1 × 0 (casa) | 1 × 2 | Eliminada |

## Principais insights

- A Portuguesa liderou o Grupo A13 com **21 pontos** (6V 3E 1D) e **70,0% de aproveitamento**.
- O Canindé foi decisivo: **91,7% de aproveitamento em casa** (7V 1E, 22 dos 32 pontos), contra **41,7% como visitante**.
- No mata-mata, a equipe **venceu os 3 jogos em casa** e **não venceu nenhum dos 3 fora**; a derrota por 2 × 0 em Uberlândia definiu a eliminação.
- O rendimento caiu ao longo da competição: **73,3%** no turno do grupo, **66,7%** no returno e **61,1%** no mata-mata.
- O time foi mais produtivo no segundo tempo (**12 gols**, contra 10 no primeiro) e **ganhou 6 pontos** em relação aos placares de intervalo.
- A defesa passou **7 dos 16 jogos sem sofrer gol**, com média de 0,63 gol sofrido por partida.

## O que a dashboard entrega

- KPIs de pontos, aproveitamento, média por jogo e saldo de gols;
- trajetória na competição: classificação do grupo e confrontos de ida e volta do mata-mata;
- distribuição de vitórias, empates e derrotas;
- evolução da pontuação jogo a jogo, com a divisão entre fase de grupos e mata-mata;
- comparação entre desempenho em casa e como visitante;
- destaques da campanha: maior vitória, derrota mais pesada, médias de gols e cartões;
- rendimento por etapa (turno e returno do grupo e mata-mata), sequências e jogos sem sofrer gol;
- comparação de gols marcados e sofridos no primeiro e no segundo tempo;
- tabela completa com busca por adversário e filtros por mando de campo.

## Metodologia

- Vitória: 3 pontos; empate: 1 ponto; derrota: 0 ponto;
- aproveitamento: pontos conquistados ÷ pontos possíveis.

No mata-mata os pontos não definem a classificação, que depende do placar agregado (e dos pênaltis, quando há empate). Mesmo assim, o painel soma os pontos dessas partidas para medir o rendimento jogo a jogo de forma comparável entre as fases.

O painel considera somente partidas com <code>status</code> igual a <code>finished</code> e resultado identificado como <code>V</code>, <code>E</code> ou <code>D</code>. Os placares de intervalo e os cartões são calculados a partir dos eventos das súmulas da CBF; gols contra são atribuídos ao adversário do autor.

## Tecnologias utilizadas

- **Python:** coleta e preparação dos dados (somente biblioteca padrão);
- **Streamlit:** publicação e disponibilização da aplicação;
- **JavaScript:** cálculos, filtros e renderização dos gráficos;
- **HTML e CSS:** estrutura, responsividade e identidade visual;
- **CSV:** armazenamento da base consolidada;
- **GitHub:** versionamento e integração com o deploy.

## Estrutura do projeto

<pre><code>analise_portuguesa/
├── app.js
├── coleta_detalhada.py
├── dashboard-preview.png
├── index.html
├── portuguesa-logo.svg
├── portuguesa_serie_d_2026_grupo.csv
├── portuguesa_serie_d_2026_todos_jogos.csv
├── requirements.txt
├── server.js
├── streamlit_app.py
└── styles.css
</code></pre>

## Executar localmente

### Streamlit

<pre><code>git clone https://github.com/isranetoo/analise_portuguesa.git
cd analise_portuguesa
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
</code></pre>

A aplicação será disponibilizada normalmente em <code>http://localhost:8501</code>.

### Versão HTML

<pre><code>node server.js
</code></pre>

Depois, acesse <code>http://localhost:8000</code>.

## Atualização dos dados

O arquivo <code>coleta_detalhada.py</code> busca os jogos na API pública usada pelo site da CBF, sem necessidade de chave, e gera:

- <code>portuguesa_serie_d_2026_todos_jogos.csv</code>: uma linha por partida, com fase, mando, placar final, placar do intervalo, estádio e cartões;
- <code>portuguesa_serie_d_2026_grupo.csv</code>: classificação final do grupo da Portuguesa na primeira fase.

<pre><code>python coleta_detalhada.py
</code></pre>

Após atualizar os CSVs e enviar um novo commit para a branch <code>main</code>, o Streamlit Community Cloud realiza o redeploy da aplicação.

## Créditos

Projeto adaptado do painel de análise do Náutico desenvolvido por [pablohmelo02](https://github.com/pablohmelo02/analise_nautico). Escudo da Portuguesa em domínio público, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Associa%C3%A7%C3%A3o_Portuguesa_de_Desportos.svg). Dados: [CBF](https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026).
