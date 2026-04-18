import os
import socket
import sys

PY_MODULES_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "py_modules")


def ensure_pyftpdlib() -> None:
    if PY_MODULES_DIR not in sys.path:
        sys.path.insert(0, PY_MODULES_DIR)


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "Unknown"
