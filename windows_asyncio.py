"""Correção para o aviso ConnectionResetError (WinError 10054) do asyncio no Windows."""

from __future__ import annotations

import sys


def silence_windows_connection_reset() -> None:
    """Evita o traceback de ConnectionResetError no terminal do Windows.

    O asyncio do Windows registra esse erro quando o navegador encerra a conexão de forma
    abrupta (ao abrir, recarregar ou fechar a aba). Ele é inofensivo e não afeta a dashboard.
    """
    if sys.platform != "win32":
        return

    from asyncio.proactor_events import _ProactorBasePipeTransport

    original = _ProactorBasePipeTransport._call_connection_lost
    if getattr(original, "_ignora_reset", False):
        return

    def call_connection_lost(self, exc):
        try:
            original(self, exc)
        except ConnectionResetError:
            # O navegador já encerrou a conexão; conclui a limpeza que o asyncio interrompeu.
            if self._sock is not None:
                self._sock.close()
                self._sock = None
            if self._server is not None:
                self._server._detach()
                self._server = None
            self._called_connection_lost = True

    call_connection_lost._ignora_reset = True
    _ProactorBasePipeTransport._call_connection_lost = call_connection_lost
