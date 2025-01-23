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

from .card import async_setup_view, async_del_view
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

    # 確保保存路徑是相對於 config 目錄的
    if not save_path.startswith('/'):
        save_path = os.path.join(hass.config.config_dir, save_path)
    os.makedirs(save_path, exist_ok=True)

    async def clear_task(*args):
        await auto_remove(hass, save_path)

    if remove:
        task = async_track_time_change(hass, clear_task, hour=1, minute=0)
    else:
        task = None

    hass.data.setdefault(DOMAIN, {})[entry_id] = {
        "name": entry_name,
        "path": save_path,
        "remove_task": task,
    }

    hass.http.register_view(VoiceRecorderUploadView(save_path))

    await async_setup_view(hass)

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
            async_del_view(hass)
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


async def auto_remove(hass, save_path) -> None:
    """Automatically delete recording files older than today"""
    try:
        job = hass.async_add_executor_job
        record_path = Path(save_path)
        today = as_timestamp(start_of_local_day())

        for file in await job(lambda: list(record_path.iterdir())):
            try:
                # 跳過非文件
                if not file.is_file():
                    continue

                file_stat = await job(file.stat)
                file_mtime = file_stat.st_mtime

                # 刪除今天之前的檔案
                if file_mtime < today:
                    await job(file.unlink, missing_ok=True)
                    _LOGGER.debug(
                        f"Deleted file: {file}, size: {file.stat().st_size} bytes"
                    )

            except Exception as file_err:
                _LOGGER.warning(f"An error occurred while processing {file}: {file_err}")

    except Exception as e:
        _LOGGER.error(f"An error occurred while clearing old files: {e}")


class VoiceRecorderUploadView(HomeAssistantView):
    """Handle voice recorder uploads."""

    url = "/api/voice_recorder/upload"
    name = "api:voice_recorder"
    requires_auth = True
    _upload_lock: asyncio.Lock | None = None

    def __init__(self, save_path):
        """Initialize the upload view."""
        self.save_path = save_path

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
            reader = await request.multipart()

            file_data = None
            eventName = None

            # 讀取所有欄位
            while True:
                field = await reader.next()
                if field is None:
                    break

                if field.name == "file":
                    # 處理文件
                    time = now().strftime("%Y-%m-%d_%H:%M:%S")
                    filename = f"recording_{time}.mp3"
                    filepath = os.path.join(self.save_path, filename)

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
                    eventName = value.decode()

            if not file_data:
                raise web.HTTPBadRequest(text="No file field found")

            if not eventName:
                eventName = "emty"

            # 觸發保存成功事件
            hass.bus.async_fire(
                f"{DOMAIN}_saved", {
                    "path": file_data["filepath"],
                    "size": file_data["size"],
                    "filename": file_data["filename"],
                    "eventName": eventName
                }
            )

            return web.json_response(
                {
                    "success": True,
                    "msg": "Recording saved",
                    "filename": file_data["filename"],
                    "eventName": eventName,
                    "path": file_data["filepath"]
                }
            )

        except Exception as e:
            _LOGGER.error("An error occurred while saving the recording file: %s", str(e))
            return web.json_response(
                {
                    "success": False,
                    "msg": f"Save failed: {str(e)}"
                }, status=500
            )
