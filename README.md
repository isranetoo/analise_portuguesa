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
- **Cadorini foi o artilheiro, com 8 gols** (5 na fase de grupos e 3 no mata-mata), dois deles decisivos para vitórias.
- Marcar primeiro foi determinante: o time **abriu o placar em 10 jogos e somou 26 dos 30 pontos** possíveis neles.
- A faixa mais produtiva foi **dos 61 aos 75 minutos** (6 gols), e o time ganhou **6 pontos** em relação aos placares de intervalo.
- **28 atletas** foram utilizados; o goleiro Bruno Bertinato esteve em campo em **93,8% dos minutos**.
- Em relação a 2025 (eliminação na 2ª fase, nos pênaltis), o time **foi mais longe**, com aproveitamento semelhante (**66,7%** contra 68,8%).

## O que a dashboard entrega

- KPIs de pontos, aproveitamento, média por jogo e saldo de gols;
- filtros combinados por mando de campo (casa/fora) e por fase (grupos/mata-mata);
- trajetória na competição: classificação do grupo e confrontos de ida e volta do mata-mata;
- evolução da pontuação jogo a jogo, com tooltip de cada partida;
- comparação entre desempenho em casa e como visitante;
- gols por tempo e por faixa de 15 minutos, incluindo quem abriu o placar;
- artilharia com gols por fase, pênaltis, faltas e gols decisivos;
- disciplina: cartões do time, dos adversários e por atleta;
- elenco: atletas utilizados, time-base, titularidades e minutos estimados;
- retrospecto por adversário;
- comparação com a temporada anterior;
- tabela completa com busca por adversário ou atleta e detalhes expansíveis de cada jogo (gols, escalação, árbitro);
- tema claro e escuro.

## Metodologia

- Vitória: 3 pontos; empate: 1 ponto; derrota: 0 ponto;
- aproveitamento: pontos conquistados ÷ pontos possíveis.

No mata-mata os pontos não definem a classificação, que depende do placar agregado (e dos pênaltis, quando há empate). Mesmo assim, o painel soma os pontos dessas partidas para medir o rendimento jogo a jogo de forma comparável entre as fases.

O painel considera somente partidas com <code>status</code> igual a <code>finished</code> e resultado identificado como <code>V</code>, <code>E</code> ou <code>D</code>. Gols, placares de intervalo, escalações e cartões vêm dos eventos das súmulas da CBF:

- gols contra são atribuídos ao adversário do autor;
- o minuto do gol é contado dentro de cada tempo, e os acréscimos entram na última faixa (45+ e 90+);
- um **gol decisivo** é aquele que colocou o time à frente de vez numa vitória;
- os **minutos jogados** são estimados a partir das substituições e expulsões, com 90 minutos por partida (sem acréscimos);
- os cartões do time incluem a comissão técnica; os cartões por atleta consideram só os jogadores.

## Tecnologias utilizadas

- **Python:** coleta e preparação dos dados (somente biblioteca padrão);
- **Streamlit:** publicação e disponibilização da aplicação;
- **JavaScript:** cálculos, filtros e renderização dos gráficos;
- **HTML e CSS:** estrutura, responsividade e identidade visual;
- **CSV:** armazenamento da base consolidada;
- **GitHub:** versionamento e integração com o deploy.

## Estrutura do projeto

<pre><code>analise_portuguesa/
├── app.js                      # cálculos e renderização da dashboard
├── coleta_detalhada.py         # coleta na CBF e geração dos CSVs e do dados.js
├── config.json                 # clube, competição, cores e temporada de comparação
├── dados.js                    # dados da dashboard (gerado pela coleta)
├── dashboard-preview.png
├── index.html
├── iniciar.py                  # inicia o Streamlit (com correção para Windows)
├── portuguesa-logo.svg
├── portuguesa_serie_d_2025_grupo.csv
├── portuguesa_serie_d_2025_todos_jogos.csv
├── portuguesa_serie_d_2026_atletas.csv
├── portuguesa_serie_d_2026_gols.csv
├── portuguesa_serie_d_2026_grupo.csv
├── portuguesa_serie_d_2026_todos_jogos.csv
├── requirements.txt
├── server.js
├── streamlit_app.py
├── styles.css
├── tests/test_coleta.py        # testes do tratamento das súmulas
└── windows_asyncio.py
</code></pre>

## Executar localmente

### Streamlit

<pre><code>git clone https://github.com/isranetoo/analise_portuguesa.git
cd analise_portuguesa
python -m pip install -r requirements.txt
python iniciar.py
</code></pre>

A aplicação será disponibilizada normalmente em <code>http://localhost:8501</code>.

O <code>iniciar.py</code> equivale a <code>python -m streamlit run streamlit_app.py</code>, mas evita no Windows o aviso inofensivo <code>ConnectionResetError [WinError 10054]</code>, que o asyncio registra quando o navegador encerra uma conexão.

### Versão HTML

<pre><code>node server.js
</code></pre>

Depois, acesse <code>http://localhost:8000</code>.

## Atualização dos dados

O arquivo <code>coleta_detalhada.py</code> busca os jogos na API pública usada pelo site da CBF, sem necessidade de chave. Ele descobre sozinho as fases da competição e gera, para a temporada principal:

- <code>…_todos_jogos.csv</code>: uma linha por partida, com fase, mando, placares final e do intervalo, pênaltis, estádio, árbitro e cartões;
- <code>…_grupo.csv</code>: classificação final do grupo na primeira fase;
- <code>…_gols.csv</code>: todos os gols das partidas, com autor, tempo, minuto e tipo (normal, pênalti, falta ou contra);
- <code>…_atletas.csv</code>: participação de cada atleta em cada partida (titularidade, minutos, gols e cartões).

Para a temporada de comparação, gera apenas os jogos e o grupo. Por fim, tudo é consolidado em <code>dados.js</code>, que é o arquivo lido pela dashboard.

<pre><code>python coleta_detalhada.py
python -m unittest        # testes do tratamento das súmulas
</code></pre>

Após atualizar os dados e enviar um novo commit para a branch <code>main</code>, o Streamlit Community Cloud realiza o redeploy da aplicação.

### Analisar outro clube ou temporada

Basta editar o <code>config.json</code>: id do clube na CBF, nome, artigo ("o" ou "a", usado nos textos), escudo, cores, competição (<code>slug</code> como <code>serie-d</code> ou <code>serie-c</code>), ano e temporada de comparação. Depois, execute a coleta novamente. Os nomes dos adversários podem ser ajustados na seção <code>nomes</code>.

## Créditos

Projeto adaptado do painel de análise do Náutico desenvolvido por [pablohmelo02](https://github.com/pablohmelo02/analise_nautico). Escudo da Portuguesa em domínio público, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Associa%C3%A7%C3%A3o_Portuguesa_de_Desportos.svg). Dados: [CBF](https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026).
