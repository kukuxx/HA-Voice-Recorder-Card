
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
event_options:
  - All     // option1 is default eventname
  - Living Room
  - Kitchen
notify: bool    // The default value is false.
button_mode: click or hold    // The default value is click.
volume_gain: 2    // The default value is 2.
audio_quality: good    // The default value is good.
```
> [!Tip]
> 1. If you encounter problems about `allowlist_external_dirs`, please refer <a href='https://www.home-assistant.io/integrations/homeassistant/#allowlist_external_dirs'>here.</a><br>
> 2. event_options(optional) is the event name option, multiple names can be pre-set.<br>
> 3. notify (optional) determines whether a notification is sent when a file is successfully saved.<br>
> 4.button_mode (optional) determines whether the button is in click or hold mode.<br>
> 5. volume_gain (optional) determines the volume gain of the recording. It is recommended not to set too large a gain to reduce the sound quality.<br>
> 6. audio_quality (optional) determines the audio quality of the recording.

> [!Important]
> **You don’t need to create a folder manually. The integration will automatically create a folder based on the path you’ve set.**<br>
**If your path starts with `/media`, it will create the folder under the `/media`, if the path doesn’t start with `/media`, it will create the folder under the `/homeassistant/www`.**<br>

- After the recording file is successfully saved, a `voice_recorder_saved` event will be sent, which can be used as a trigger. The event data are as follows:
```
{
  "browserID": # browserID,
  "eventName": # Custom event name,
  "filename": # File name,
  "path": # File path,
  "size": # File size, 
}
```
 [!Tip]
> **browserID: This is optional. You must install <a href='https://github.com/thomasloven/hass-browser_mod'>browser_mod</a> to generate an ID, otherwise it will be displayed as `null`.**

### Play sounds immediatly at home - announcements
This automation will play every incoming voice recording on a media player / speaker matching the *eventName* in announcement mode at a fixed volume (20). 
```
alias: Announcement
description: ""
triggers:
  - trigger: event
    event_type: voice_recorder_saved
conditions: []
actions:
  - action: media_player.play_media
    metadata: {}
    data:
      media:
        media_content_id: "{{ trigger.event.data.path}}"
        media_content_type: music
      announce: true
      extra:
        volume: 20
    target:
      entity_id: media_player.{{ trigger.event.data.eventName | slugify(separator="_") }}
    enabled: true
mode: single
```


## Credits

-  Part of the code writing method is referenced <a href='https://github.com/shaonianzhentan/cloud_music/blob/master/custom_components/ha_cloud_music/local/card/ha_cloud_music-setting.js'>ha_cloud_music</a> and <a href='https://github.com/thomasloven/hass-browser_mod/blob/master/custom_components/browser_mod/mod_view.py'>hass-browser_mod</a>.
- The card uses `Recorder.js` from <a href='https://github.com/xiangyuecn/Recorder'>xiangyuecn</a>. Thanks to them for their project!
- Thanks to tester **isaac**.