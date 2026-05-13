import os
from collections import OrderedDict
from collections.abc import Callable
from threading import RLock
from typing import Any, Hashable


MAX_CACHE_ITEMS = 64

_LOCK = RLock()
_CACHE: OrderedDict[tuple[Hashable, ...], Any] = OrderedDict()


def _file_version(path: str) -> tuple[int, int]:
    stat = os.stat(path)
    return stat.st_mtime_ns, stat.st_size


def get_or_set(path: str, namespace: str, params: tuple[Hashable, ...], factory: Callable[[], Any]) -> Any:
    key = (namespace, os.path.abspath(path), *_file_version(path), *params)

    with _LOCK:
        if key in _CACHE:
            value = _CACHE.pop(key)
            _CACHE[key] = value
            return value

    value = factory()

    with _LOCK:
        _CACHE[key] = value
        while len(_CACHE) > MAX_CACHE_ITEMS:
            _CACHE.popitem(last=False)

    return value


def invalidate_path(path: str) -> None:
    abs_path = os.path.abspath(path)
    with _LOCK:
        for key in list(_CACHE.keys()):
            if len(key) > 1 and key[1] == abs_path:
                _CACHE.pop(key, None)


def clear_all() -> None:
    with _LOCK:
        _CACHE.clear()
