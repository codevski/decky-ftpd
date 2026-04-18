import asyncio
import os
import threading
import warnings
from typing import TYPE_CHECKING

from settings import SettingsManager  # pyright: ignore[reportMissingImports]
from utils import (  # pyright: ignore[reportMissingImports]
    ensure_pyftpdlib,
    get_local_ip,
)

import decky

if TYPE_CHECKING:
    from pyftpdlib.servers import FTPServer

PY_MODULES_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "py_modules")


class Plugin:
    _server: "FTPServer | None" = None
    _server_thread = None
    _running = False
    _settings: "SettingsManager | None" = None
    _loop: "asyncio.AbstractEventLoop | None" = None

    DEFAULTS = {
        "port": 2121,
        "root_dir": "/",
        "passive_port_start": 50000,
        "passive_port_end": 50100,
    }

    async def _main(self):
        self._loop = asyncio.get_running_loop()
        ensure_pyftpdlib()

        settings = SettingsManager(
            name="settings",
            settings_directory=decky.DECKY_PLUGIN_SETTINGS_DIR,
        )
        settings.read()
        self._settings = settings

        decky.logger.info(
            "decky-ftpd loaded (port=%d, root=%s)",
            self._get("port"),
            self._get("root_dir"),
        )

    async def _unload(self):
        await self.stop_server()
        decky.logger.info("decky-ftpd unloaded")

    async def _uninstall(self):
        decky.logger.info("decky-ftpd uninstalled")

    async def _migration(self):
        decky.logger.info("decky-ftpd: nothing to migrate")

    async def _emit_status(self):
        try:
            await decky.emit(
                "ftpd_status",
                {
                    "running": self._running,
                    "ip": get_local_ip() if self._running else "",
                    "port": self._get("port"),
                    "root": self._get("root_dir"),
                },
            )
        except Exception as e:
            decky.logger.warning("decky-ftpd: emit failed — %s", e)

    async def start_server(self) -> dict:
        if self._running:
            return {"success": True, "already": True}

        try:
            ensure_pyftpdlib()
            from pyftpdlib.authorizers import DummyAuthorizer
            from pyftpdlib.handlers import FTPHandler
            from pyftpdlib.servers import FTPServer

            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                authorizer = DummyAuthorizer()
                authorizer.add_anonymous(self._get("root_dir"), perm="elradfmwMT")

            p_start = self._get("passive_port_start")
            p_end = self._get("passive_port_end")

            class DeckFTPHandler(FTPHandler):
                passive_ports = range(p_start, p_end)
                banner = "Steam Deck FTP ready."

            DeckFTPHandler.authorizer = authorizer

            self._server = FTPServer(("0.0.0.0", self._get("port")), DeckFTPHandler)
            self._server.max_cons = 10
            self._server.max_cons_per_ip = 3

            server = self._server

            def _serve():
                decky.logger.info(
                    "decky-ftpd: server started on port %d", self._get("port")
                )
                try:
                    server.serve_forever()
                except Exception as exc:
                    decky.logger.error("decky-ftpd: server thread crashed — %s", exc)
                finally:
                    if self._server is server:
                        self._running = False
                        loop = self._loop
                        if loop is not None:
                            try:
                                asyncio.run_coroutine_threadsafe(
                                    self._emit_status(), loop
                                )
                            except Exception:
                                pass

            self._server_thread = threading.Thread(target=_serve, daemon=True)
            self._server_thread.start()

            self._server_thread.join(timeout=0.2)
            if not self._server_thread.is_alive():
                return {
                    "success": False,
                    "error": "Server failed to start (check port availability).",
                }

            self._running = True
            await self._emit_status()
            return {"success": True}

        except Exception as exc:
            self._running = False
            await self._emit_status()
            decky.logger.error("decky-ftpd: failed to start — %s", exc)
            return {"success": False, "error": str(exc)}

    async def stop_server(self) -> dict:
        if not self._running:
            return {"success": True, "already": True}

        try:
            if self._server:
                self._server.close_all()
                self._server = None
            self._running = False
            await self._emit_status()
            decky.logger.info("decky-ftpd: server stopped")
            return {"success": True}
        except Exception as exc:
            decky.logger.error("decky-ftpd: failed to stop — %s", exc)
            return {"success": False, "error": str(exc)}

    async def get_status(self) -> dict:
        return {
            "running": self._running,
            "ip": get_local_ip() if self._running else "",
            "port": self._get("port"),
            "root": self._get("root_dir"),
        }

    def _get(self, key: str):
        assert self._settings is not None
        return self._settings.getSetting(key, self.DEFAULTS[key])

    async def get_settings(self) -> dict:
        return {k: self._get(k) for k in self.DEFAULTS}

    async def save_settings(self, new_settings: dict) -> dict:
        try:
            assert self._settings is not None

            port = int(new_settings.get("port", self._get("port")))
            root = str(new_settings.get("root_dir", self._get("root_dir")))
            p_start = int(
                new_settings.get("passive_port_start", self._get("passive_port_start"))
            )
            p_end = int(
                new_settings.get("passive_port_end", self._get("passive_port_end"))
            )

            if not (1024 <= port <= 65535):
                return {"success": False, "error": "Port must be 1024–65535."}
            if not root.startswith("/"):
                return {"success": False, "error": "Root must be an absolute path."}
            if not (1024 <= p_start <= 65535 and 1024 <= p_end <= 65535):
                return {"success": False, "error": "Passive ports must be 1024–65535."}
            if p_end <= p_start:
                return {
                    "success": False,
                    "error": "Passive end must be greater than start.",
                }
            if p_start <= port <= p_end:
                return {
                    "success": False,
                    "error": "Control port must not sit inside the passive range.",
                }

            self._settings.setSetting("port", port)
            self._settings.setSetting("root_dir", root)
            self._settings.setSetting("passive_port_start", p_start)
            self._settings.setSetting("passive_port_end", p_end)
            self._settings.commit()

            restarted = False
            if self._running:
                await self.stop_server()
                res = await self.start_server()
                if not res.get("success"):
                    return {
                        "success": False,
                        "error": f"Saved, but restart failed: {res.get('error')}",
                    }
                restarted = True
            else:
                await self._emit_status()

            return {"success": True, "restarted": restarted}
        except Exception as exc:
            decky.logger.error("decky-ftpd: save_settings failed — %s", exc)
            return {"success": False, "error": str(exc)}
