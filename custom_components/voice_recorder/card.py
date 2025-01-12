import logging
from urllib.parse import urlparse, parse_qs

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig

from .const import FRONTEND_SCRIPT_URL

_LOGGER = logging.getLogger(__name__)


async def async_setup_view(hass):
    """Setup the custom Lovelace card."""
    try:
        # Register the static resource for the custom card
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    FRONTEND_SCRIPT_URL,
                    hass.config.
                    path("custom_components/voice_recorder/voice-recorder-card.js"),
                    False,
                )
            ]
        )
        _LOGGER.info("Registered static path for %s", FRONTEND_SCRIPT_URL)

        # Add the custom card as a frontend module
        add_extra_js_url(hass, FRONTEND_SCRIPT_URL)
        _LOGGER.info("Added %s as an extra JS URL", FRONTEND_SCRIPT_URL)

        resources = hass.data.get("lovelace", {}).get("resources")
        if not resources:
            _LOGGER.warning("Lovelace resources not available.")
            return

        if not resources.loaded:
            await resources.async_load()
            resources.loaded = True

        frontend_added = False
        for r in resources.async_items():
            ver = await version(r["url"])
            if r["url"].startswith(FRONTEND_SCRIPT_URL):
                if ver == 1:
                    frontend_added = True
                    _LOGGER.info("Resource %s is already up to date.", r["url"])
                    continue
                else:
                    await resources.async_delete_item(r["id"])
                    _LOGGER.info("Deleted outdated resource: %s", r["url"])

        if not frontend_added:
            if getattr(resources, "async_create_item", None):
                await resources.async_create_item(
                    {
                        "res_type": "module",
                        "url": FRONTEND_SCRIPT_URL + "?ver=1",
                    }
                )
                _LOGGER.info("Added new resource with version 1: %s", FRONTEND_SCRIPT_URL)
    except Exception as e:
        _LOGGER.error("Failed to setup the custom card: %s", e, exc_info=True)


async def async_del_view(hass):
    """Delete the custom Lovelace card resources."""
    try:
        resources = hass.data.get("lovelace", {}).get("resources")
        if not resources:
            _LOGGER.warning("Lovelace resources not available.")
            return

        if not resources.loaded:
            await resources.async_load()
            resources.loaded = True

        for r in resources.async_items():
            if r["url"].startswith(FRONTEND_SCRIPT_URL):
                await resources.async_delete_item(r["id"])
                _LOGGER.info("Deleted resource: %s", r["url"])
    except Exception as e:
        _LOGGER.error("Failed to delete resources: %s", e, exc_info=True)


async def version(url):
    """Extract the version from the query string of a URL."""
    try:
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        ver = int(query_params.get("ver", [0])[0])  # Default to 0 if 'ver' is missing
        return ver
    except ValueError:
        _LOGGER.warning("Invalid version format in URL: %s", url)
        return 0
