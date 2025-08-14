import os
import logging
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
    BooleanSelector,
    BooleanSelectorConfig,
)

from .const import (
    DOMAIN,
    CONF_SAVE_PATH,
    CONF_ENTRY_NAME,
    DEFAULT_ENTRY_NAME,
    DEFAULT_SAVE_PATH,
    CONF_REMOVE,
)

_LOGGER = logging.getLogger(__name__)
TEXT_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.TEXT))
BOOLEAN_SELECTOR = BooleanSelector(BooleanSelectorConfig())

def _format_path(input_path, config_dir):
    www_dir = os.path.join(config_dir, "www")
    
    # media 開頭 -> /media
    if input_path.lower().startswith("media"):
        remaining = input_path[5:].lstrip("/")
        output_path = os.path.join("/media", remaining) if remaining else "/media"
    # 包含 www -> Home Assistant www 資料夾
    elif "www" in input_path.lower():
        www_pos = input_path.lower().find("www")
        remaining = input_path[www_pos + 3:].lstrip("/")
        output_path = os.path.join(www_dir, remaining) if remaining else www_dir
    # 其他 -> www 資料夾
    else:
        output_path = os.path.join(www_dir, input_path)
    
    return output_path


class VoiceRecorderConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Voice Recorder."""

    VERSION = 2

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow handler."""
        return VoiceRecorderOptionsFlow()

    async def validate_file_path(self, file_path: str) -> bool:
        """Ensure the file path is valid."""
        return await self.hass.async_add_executor_job(self.hass.config.is_allowed_path, file_path)

    async def async_step_user(self, user_input=None):
        """Handle the initial configuration step."""
        errors = {}

        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if self.hass.data.get(DOMAIN):
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            if not user_input[CONF_ENTRY_NAME] or not user_input[CONF_SAVE_PATH]:
                errors["base"] = "empty"
            elif not await self.validate_file_path(user_input[CONF_SAVE_PATH]):
                errors["base"] = "not_allowed"
            else:
                input_path = user_input[CONF_SAVE_PATH].strip().strip("/")
                config_dir = self.hass.config.config_dir
                final_path = _format_path(input_path, config_dir)
                
                os.makedirs(final_path, exist_ok=True)

                user_input[CONF_SAVE_PATH] = final_path
                
                return self.async_create_entry(
                    title=user_input[CONF_ENTRY_NAME],
                    data=user_input,
                )

        # Schema
        schema = vol.Schema(
            {
                vol.Required(CONF_ENTRY_NAME, default=DEFAULT_ENTRY_NAME): TEXT_SELECTOR,
                vol.Required(CONF_SAVE_PATH, default=DEFAULT_SAVE_PATH): TEXT_SELECTOR,
                vol.Optional(CONF_REMOVE, default=False): BOOLEAN_SELECTOR,
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )


class VoiceRecorderOptionsFlow(config_entries.OptionsFlow):
    """Handle options for Voice Recorder."""

    async def validate_file_path(self, file_path: str) -> bool:
        """Ensure the file path is valid."""
        return await self.hass.async_add_executor_job(self.hass.config.is_allowed_path, file_path)

    async def async_step_init(self, user_input=None):
        """Manage the options for Voice Recorder."""
        errors = {}

        if user_input is not None:
            if not user_input[CONF_ENTRY_NAME] or not user_input[CONF_SAVE_PATH]:
                errors["base"] = "empty"
            elif not await self.validate_file_path(user_input[CONF_SAVE_PATH]):
                errors["base"] = "not_allowed"
            else:
                input_path = user_input[CONF_SAVE_PATH].strip().strip("/")
                config_dir = self.hass.config.config_dir
                final_path = _format_path(input_path, config_dir)
                
                os.makedirs(final_path, exist_ok=True)

                user_input[CONF_SAVE_PATH] = final_path
                # 更新選項
                self.hass.config_entries.async_update_entry(self.config_entry, data=user_input)
                return self.async_create_entry(title=None, data=None)

        old_entry_name = self.config_entry.data.get(CONF_ENTRY_NAME, DEFAULT_ENTRY_NAME)
        old_path = self.config_entry.data.get(CONF_SAVE_PATH, DEFAULT_SAVE_PATH)
        old_remove = self.config_entry.data.get(CONF_REMOVE, False)

        schema = vol.Schema(
            {
                vol.Required(CONF_ENTRY_NAME, default=old_entry_name): TEXT_SELECTOR,
                vol.Required(CONF_SAVE_PATH, default=old_path): TEXT_SELECTOR,
                vol.Optional(CONF_REMOVE, default=old_remove): BOOLEAN_SELECTOR,
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
        )
