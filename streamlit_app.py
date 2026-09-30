"""Publica a dashboard HTML da Portuguesa dentro do Streamlit."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from windows_asyncio import silence_windows_connection_reset


ROOT = Path(__file__).resolve().parent

# Com "python iniciar.py" a correção já vem aplicada antes do servidor subir;
# com "streamlit run" ela passa a valer a partir da primeira execução da página.
silence_windows_connection_reset()


def read_text(filename: str) -> str:
    return (ROOT / filename).read_text(encoding="utf-8")


def embed_csv(filename: str) -> str:
    return json.dumps(read_text(filename), ensure_ascii=False).replace("</", "<\\/")


def build_dashboard() -> str:
    html = read_text("index.html")
    css = read_text("styles.css")
    javascript = read_text("app.js")
    logo = base64.b64encode((ROOT / "portuguesa-logo.svg").read_bytes()).decode("ascii")

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        f"<style>{css}</style>",
    )
    html = html.replace(
        'src="portuguesa-logo.svg"',
        f'src="data:image/svg+xml;base64,{logo}"',
    )

    embedded_script = f"""
      <script>
        window.__PORTUGUESA_CSV__ = {embed_csv("portuguesa_serie_d_2026_todos_jogos.csv")};
        window.__PORTUGUESA_GRUPO_CSV__ = {embed_csv("portuguesa_serie_d_2026_grupo.csv")};
      </script>
      <script>{javascript}</script>
      <script>
        (() => {{
          let lastHeight = 0;
          const syncHeight = () => {{
            const height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
            if (height === lastHeight) return;
            lastHeight = height;
            window.parent.postMessage({{
              isStreamlitMessage: true,
              type: "streamlit:setFrameHeight",
              height
            }}, "*");
          }};
          window.addEventListener("load", syncHeight);
          window.addEventListener("resize", syncHeight);
          new ResizeObserver(syncHeight).observe(document.body);
          setTimeout(syncHeight, 200);
          setTimeout(syncHeight, 900);
        }})();
      </script>
    """
    return html.replace('<script src="app.js"></script>', embedded_script)


st.set_page_config(
    page_title="Portuguesa | Painel de desempenho",
    page_icon="🟢",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      .stApp { background: #f5f5f3; }
      .block-container { max-width: 1536px; padding: 0 !important; }
      [data-testid="stHeader"], [data-testid="stToolbar"] { display: none; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.iframe(build_dashboard(), width='stretch', height='content')
