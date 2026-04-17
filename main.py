import asyncio
import os
import socket
import sys
import threading
import warnings

import decky

try:
    from pyftpdlib.authorizers import DummyAuthorizer
    from pyftpdlib.handlers import FTPHandler
    from pyftpdlib.servers import FTPServer
except ImportError:
    pass  # installed at runtime via _ensure_pyftpdlib()

# ── pyftpdlib lives in py_modules/ (vendored at runtime on first launch) ──
PY_MODULES_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "py_modules")


def _ensure_pyftpdlib() -> None:
    if PY_MODULES_DIR not in sys.path:
        sys.path.insert(0, PY_MODULES_DIR)


def _get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "Unknown"


class Plugin:
    _server: "FTPServer | None" = None
    _server_thread = None
    _running = False

    # Defaults — future settings page will persist these via decky.logger settings API
    _port: int = 2121
    _root: str = decky.DECKY_USER_HOME  # /home/deck

    # ── lifecycle ──────────────────────────────────────────────────────────
    async def _main(self):
        self.loop = asyncio.get_event_loop()
        _ensure_pyftpdlib()
        decky.logger.info(
            "decky-ftpd loaded (port=%d, root=%s)", self._port, self._root
        )

    async def _unload(self):
        await self.stop_server()
        decky.logger.info("decky-ftpd unloaded")

    async def _uninstall(self):
        decky.logger.info("decky-ftpd uninstalled")

    async def _migration(self):
        decky.logger.info("decky-ftpd migration (nothing to migrate yet)")

    # ── callable: start ────────────────────────────────────────────────────
    async def start_server(self) -> dict:
        if self._running:
            return {"success": True, "already": True}

        try:
            _ensure_pyftpdlib()
            from pyftpdlib.authorizers import DummyAuthorizer
            from pyftpdlib.handlers import FTPHandler
            from pyftpdlib.servers import FTPServer

            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                authorizer = DummyAuthorizer()
                authorizer.add_anonymous(self._root, perm="elradfmwMT")

            class DeckFTPHandler(FTPHandler):
                passive_ports = range(50000, 50100)
                banner = "Steam Deck FTP ready."

            DeckFTPHandler.authorizer = authorizer  # ← this was missing!

            self._server = FTPServer(("0.0.0.0", self._port), DeckFTPHandler)
            self._server.max_cons = 10
            self._server.max_cons_per_ip = 3

            server = self._server

            def _serve():
                decky.logger.info("decky-ftpd: server started on port %d", self._port)
                server.serve_forever()

            self._server_thread = threading.Thread(target=_serve, daemon=True)
            self._server_thread.start()
            self._running = True

            return {"success": True}

        except Exception as exc:
            decky.logger.error("decky-ftpd: failed to start — %s", exc)
            return {"success": False, "error": str(exc)}

    # ── callable: stop ─────────────────────────────────────────────────────
    async def stop_server(self) -> dict:
        if not self._running:
            return {"success": True, "already": True}

        try:
            if self._server:
                self._server.close_all()
                self._server = None
            self._running = False
            decky.logger.info("decky-ftpd: server stopped")
            return {"success": True}
        except Exception as exc:
            decky.logger.error("decky-ftpd: failed to stop — %s", exc)
            return {"success": False, "error": str(exc)}

    # ── callable: status ───────────────────────────────────────────────────
    async def get_status(self) -> dict:
        return {
            "running": self._running,
            "ip": _get_local_ip() if self._running else "",
            "port": self._port,
            "root": self._root,
        }
