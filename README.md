
 [![Contributors][contributors-shield]][contributors-url]
 [![Forks][forks-shield]][forks-url]
 [![Stargazers][stars-shield]][stars-url]
 [![Issues][issues-shield]][issues-url]
 [![License][license-shield]][license-url]

 [contributors-shield]: https://img.shields.io/github/contributors/kukuxx/HA-Voice-Recorder-Card.svg?style=for-the-badge
 [contributors-url]: https://github.com/kukuxx/HA-Voice-Recorder-Card/graphs/contributors

 [forks-shield]: https://img.shields.io/github/forks/kukuxx/HA-Voice-Recorder-Card.svg?style=for-the-badge
 [forks-url]: https://github.com/kukuxx/HA-Voice-Recorder-Card/network/members

 [stars-shield]: https://img.shields.io/github/stars/kukuxx/HA-Voice-Recorder-Card.svg?style=for-the-badge
 [stars-url]: https://github.com/kukuxx/HA-Voice-Recorder-Card/stargazers

 [issues-shield]: https://img.shields.io/github/issues/kukuxx/HA-Voice-Recorder-Card.svg?style=for-the-badge
 [issues-url]: https://github.com/kukuxx/HA-Voice-Recorder-Card/issues

 [license-shield]: https://img.shields.io/github/license/kukuxx/HA-Voice-Recorder-Card.svg?style=for-the-badge
 [license-url]: https://github.com/kukuxx/HA-Voice-Recorder-Card/blob/main/LICENSE


# HA-Voice-Recorder-Card

- [English](/README.md) | [繁體中文](/README-zh-TW.md)

> <b>This integration can record your voice in mobile apps and computer browsers and save the recording files.</b>

> [!Tip]
> If you encounter a bug during use, <br>
> please enable <b>debug mode</b> in the integration and try the original operation, <br>
> then open issues and post the log.

## Instructions for use

- It is recommended to use <b>HACS</b> to install. If you want to install manually,
  <br>please put the <b>voice_recorder</b> folder in <b>custom_components</b> folder, 
  <br>and restart <b>Home assistant</b>.

  [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kukuxx&repository=HA-Voice-Recorder-Card&category=Integration)

- After the restart is completed, search for Voice Recorder in the integration and set it up, then configure voice-recorder-card:
```
type: custom:voice-recorder-card
token: your token
event_name: default eventname(optional), It will be used when the eventname input box has no value
```
> [!Tip]
> 1.Please generate a permanent token in HA.<br>
> 2.If you encounter problems about `allowlist_external_dirs`, please refer <a href='https://www.home-assistant.io/integrations/homeassistant/#allowlist_external_dirs'>here.</a>

- After the recording file is successfully saved, a `voice_recorder_saved` event will be sent, which can be used as a trigger. The event data are as follows:
```
{
  "path": # File path
  "size": # File size
  "filename": # File name
  "eventName": # Custom event name
}
```

## grateful

-  Part of the code writing method is referenced <a href='https://github.com/shaonianzhentan/cloud_music/blob/master/custom_components/ha_cloud_music/local/card/ha_cloud_music-setting.js'>ha_cloud_music</a> and <a href='https://github.com/thomasloven/hass-browser_mod/blob/master/custom_components/browser_mod/mod_view.py'>hass-browser_mod</a>.
- The card uses `Recorder.js` from <a href='https://github.com/xiangyuecn/Recorder'>xiangyuecn</a>. Thanks to them for their project!
- Thanks to tester **isaac**.