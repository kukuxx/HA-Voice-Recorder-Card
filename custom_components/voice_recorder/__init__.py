from __future__ import annotations

import os
import logging
import aiofiles
import asyncio

from copy import deepcopy
from pathlib import Path
from aiohttp import web

from homeassistant.components.http import KEY_HASS, HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.typing import ConfigType
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers import config_validation as cv
from homeassistant.util.dt import now, as_timestamp, start_of_local_day

from .card import async_setup_frontend, async_del_frontend
from .const import (
    DOMAIN,
    CONF_ENTRY_NAME,
    CONF_SAVE_PATH,
    CONF_REMOVE,
    DEFAULT_SAVE_PATH,
    DEFAULT_ENTRY_NAME,
)

CONFIG_SCHEMA = cv.removed(DOMAIN, raise_if_present=True)  # YAML 配置已棄用

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up global for Voice Recorder."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Voice Recorder from a config entry."""
    entry_id = entry.entry_id
    entry_name = entry.data.get(CONF_ENTRY_NAME, DEFAULT_ENTRY_NAME)
    save_path = entry.data.get(CONF_SAVE_PATH, DEFAULT_SAVE_PATH)
    remove = entry.data.get(CONF_REMOVE, False)

    async def clear_task(*args):
        await hass.async_add_executor_job(auto_remove, save_path)

    if remove:
        task = async_track_time_change(hass, clear_task, hour=1, minute=0, second=0)
    else:
        task = None

    hass.data.setdefault(DOMAIN, {})[entry_id] = {
        "name": entry_name,
        "path": save_path,
        "remove_task": task,
    }

    hass.http.register_view(VoiceRecorderUploadView(entry_id))

    await async_setup_frontend(hass)

    entry.async_on_unload(entry.add_update_listener(update_listener))

    return True


async def update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Update listener."""
    try:
        await hass.config_entries.async_reload(entry.entry_id)
    except Exception as e:
        _LOGGER.error(f"update_listener error {e}")


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    try:
        task = hass.data[DOMAIN][entry.entry_id].get("remove_task", None)
        if task:
            task()
        hass.data[DOMAIN].pop(entry.entry_id, None)

        if DOMAIN in hass.data and not hass.data[DOMAIN]:
            await async_del_frontend(hass)
            hass.data.pop(DOMAIN, None)

        return True
    except Exception as e:
        _LOGGER.error(f"async_unload_entry error {e}")
        return False


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate config entry."""
    if entry.version > 2:
        # 未來版本無法處理
        return False

    if entry.version < 2:
        # 舊版本更新資料
        data = deepcopy(dict(entry.data))
        data.setdefault(CONF_REMOVE, False)
        hass.config_entries.async_update_entry(entry, version=2, data=data)
    return True


def auto_remove(save_path) -> None:
    """Automatically delete recording files older than today"""
    try:
        record_path = Path(save_path)
        today = as_timestamp(start_of_local_day())

        for file in list(record_path.iterdir()):
            try:
                # 跳過非文件
                if not file.is_file():
                    continue

                file_stat = file.stat()
                file_mtime = file_stat.st_mtime
                file_size = file_stat.st_size

                # 刪除今天之前的檔案
                if file_mtime < today:
                    file.unlink(missing_ok=True)
                    _LOGGER.info(f"Deleted file: {file}, size: {file_size} bytes")

            except Exception as file_err:
                _LOGGER.warning(f"{file}: {file_err}")

    except Exception as e:
        _LOGGER.error(f"An error occurred while clearing old files: {e}")


class VoiceRecorderUploadView(HomeAssistantView):
    """Handle voice recorder uploads."""

    url = "/api/voice_recorder/upload"
    name = "api:voice_recorder"
    requires_auth = True
    _upload_lock: asyncio.Lock | None = None

    def __init__(self, entry_id):
        """Initialize the upload view."""
        self.entry_id = entry_id

    @callback
    def _get_upload_lock(self) -> asyncio.Lock:
        """Get upload lock."""
        if self._upload_lock is None:
            self._upload_lock = asyncio.Lock()

        return self._upload_lock

    async def post(self, request):
        """Handle POST requests for file uploads."""
        async with self._get_upload_lock():
            return await self._upload_file(request)

    async def _upload_file(self, request):
        """Handle uploaded file."""
        try:
            hass = request.app[KEY_HASS]
            save_path = hass.data[DOMAIN][self.entry_id]["path"]
            reader = await request.multipart()

            file_data = None
            eventName = "null"
            browserID = "null"
            user_id = "unknown"

            # 讀取所有欄位
            while True:
                field = await reader.next()
                if field is None:
                    break

                if field.name == "file":
                    # 處理文件
                    time = now().strftime("%Y-%m-%d_%H:%M:%S")
                    filename = f"recording_{time}.mp3"
                    filepath = os.path.join(save_path, filename)

                    # 保存文件
                    size = 0
                    async with aiofiles.open(filepath, "wb") as f:
                        while True:
                            chunk = await field.read_chunk()
                            if not chunk:
                                break
                            size += len(chunk)
                            await f.write(chunk)

                    file_data = {"filepath": filepath, "size": size, "filename": filename}

                elif field.name == "eventname":
                    # 讀取 eventName
                    value = await field.read(decode=True)
                    if value:
                        eventName = value.decode()

                elif field.name == "browserid":
                    value = await field.read(decode=True)
                    if value:
                        browserID = value.decode()

                elif field.name == "user_id":
                    value = await field.read(decode=True)
                    if value:
                        user_id = value.decode()

            if not file_data:
                raise web.HTTPBadRequest(text="No file field found")

            www_dir = os.path.join(hass.config.config_dir, "www")

            if file_data["filepath"].startswith("/media"):
                # /media/xxx -> /media/local/xxx
                remaining_path = file_data["filepath"][6:]
                url_path = "/media/local" + remaining_path
            elif file_data["filepath"].startswith(www_dir):
                # /config/www/xxx -> /local/xxx
                remaining_path = file_data["filepath"][len(www_dir):]
                url_path = "/local" + remaining_path
            else:
                url_path = file_data["filepath"]
                

            # 觸發保存成功事件
            hass.bus.async_fire(
                f"{DOMAIN}_saved", {
                    "browserID": browserID,
                    "eventName": eventName,
                    "filename": file_data["filename"],
                    "path": url_path,
                    "size": file_data["size"],
                    "user_id": user_id,
                }
            )

            return web.json_response({
                "success": True,
                "msg": "Recording saved",
                "browserID": browserID,
                "eventName": eventName,
                "filename": file_data["filename"],
                "path": file_data["filepath"],
            })

        except Exception as e:
            _LOGGER.error("An error occurred while saving the recording file: %s", str(e))
            return web.json_response({"success": False, "msg": f"Save failed: {str(e)}"}, status=500)
