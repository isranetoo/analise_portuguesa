"""Inicia a dashboard no Streamlit.

Equivale a "python -m streamlit run streamlit_app.py", mas aplica a correção do aviso
ConnectionResetError do Windows antes de o servidor subir (veja windows_asyncio.py).
Argumentos extras são repassados ao Streamlit, por exemplo:  python iniciar.py --server.port 8502
"""

import sys
from pathlib import Path

from streamlit.web import cli

from windows_asyncio import silence_windows_connection_reset

if __name__ == "__main__":
    silence_windows_connection_reset()
    app = Path(__file__).resolve().parent / "streamlit_app.py"
    sys.argv = ["streamlit", "run", str(app), *sys.argv[1:]]
    sys.exit(cli.main(prog_name="streamlit"))
