"""Publica a dashboard HTML do clube configurado em config.json dentro do Streamlit."""

from __future__ import annotations

import base64
import json
import mimetypes
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from windows_asyncio import silence_windows_connection_reset


ROOT = Path(__file__).resolve().parent

# Com "python iniciar.py" a correção já vem aplicada antes do servidor subir;
# com "streamlit run" ela passa a valer a partir da primeira execução da página.
silence_windows_connection_reset()

CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))


def read_text(filename: str) -> str:
    return (ROOT / filename).read_text(encoding="utf-8")


def inline_script(source: str) -> str:
    # Evita que um "</script>" dentro dos dados encerre a tag antes da hora.
    escaped = source.replace("</", "<\\/")
    return f"<script>{escaped}</script>"


def logo_data_uri() -> str:
    escudo = ROOT / CONFIG["clube"]["escudo"]
    mime = mimetypes.guess_type(escudo.name)[0] or "image/svg+xml"
    return f"data:{mime};base64,{base64.b64encode(escudo.read_bytes()).decode('ascii')}"


def build_dashboard() -> str:
    html = read_text("index.html")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{read_text('styles.css')}</style>")
    html = re.sub(r'(<img id="brandLogo" src=")[^"]*(")', lambda m: m.group(1) + logo_data_uri() + m.group(2), html)
    html = html.replace('<script src="dados.js"></script>', inline_script(read_text("dados.js")))

    embedded_script = inline_script(read_text("app.js")) + """
      <script>
        (() => {
          let lastHeight = 0;
          const syncHeight = () => {
            const height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
            if (height === lastHeight) return;
            lastHeight = height;
            window.parent.postMessage({
              isStreamlitMessage: true,
              type: "streamlit:setFrameHeight",
              height
            }, "*");
          };
          window.addEventListener("load", syncHeight);
          window.addEventListener("resize", syncHeight);
          new ResizeObserver(syncHeight).observe(document.body);
          setTimeout(syncHeight, 200);
          setTimeout(syncHeight, 900);
        })();
      </script>
    """
    return html.replace('<script src="app.js"></script>', embedded_script)


st.set_page_config(
    page_title=f"{CONFIG['clube']['nome']} | Painel de desempenho",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      .block-container { max-width: 1536px; padding: 0 !important; }
      [data-testid="stHeader"], [data-testid="stToolbar"] { display: none; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.iframe(build_dashboard(), width='stretch', height='content')
