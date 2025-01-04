
 [![Contributors][contributors-shield]][contributors-url]
 [![Forks][forks-shield]][forks-url]
 [![Stargazers][stars-shield]][stars-url]
 [![Issues][issues-shield]][issues-url]
 [![License][license-shield]][license-url]

 [contributors-shield]: https://img.shields.io/github/contributors/kukuxx/lovelace-voice-recorder-card.svg?style=for-the-badge
 [contributors-url]: https://github.com/kukuxx/lovelace-voice-recorder-card/graphs/contributors

 [forks-shield]: https://img.shields.io/github/forks/kukuxx/lovelace-voice-recorder-card.svg?style=for-the-badge
 [forks-url]: https://github.com/kukuxx/lovelace-voice-recorder-card/network/members

 [stars-shield]: https://img.shields.io/github/stars/kukuxx/lovelace-voice-recorder-card.svg?style=for-the-badge
 [stars-url]: https://github.com/kukuxx/lovelace-voice-recorder-card/stargazers

 [issues-shield]: https://img.shields.io/github/issues/kukuxx/lovelace-voice-recorder-card.svg?style=for-the-badge
 [issues-url]: https://github.com/kukuxx/lovelace-voice-recorder-card/issues

 [license-shield]: https://img.shields.io/github/license/kukuxx/lovelace-voice-recorder-card.svg?style=for-the-badge
 [license-url]: https://github.com/kukuxx/lovelace-voice-recorder-card/blob/main/LICENSE


# Voice-Recorder-Card

- [English](/README.md) | [繁體中文](/README-zh-TW.md)

> <b>This card can record your voice in mobile apps and computer browsers. It must be integrated with <a href='https://github.com/kukuxx/HA-Voice-Recorder'>HA-Voice-Recorder</a> Use.</b>

## Instructions for use

- It is recommended to use <b>HACS</b> to install. If you want to install manually,
  <br>please put the <b>voice-recorder-card.js</b> folder in <b>www</b> folder.

  [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kukuxx&repository=lovelace-voice-recorder-card&category=Plugin)

- After the installation is complete, please go to Dashboard -> Resources -> Add New Resources, and then configure the card:
```
type: custom:voice-recorder-card
token: your token
```
> [!Tip]
> Please generate a permanent token in HA.<br>
> After configuring the card, please remember to install <a href='https://github.com/kukuxx/HA-Voice-Recorder'>integration</a> to save the recording file.

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

-  Part of the code writing method is referenced <a href='https://github.com/shaonianzhentan/cloud_music/blob/master/custom_components/ha_cloud_music/local/card/ha_cloud_music-setting.js'>here</a>
- The card uses `Recorder.js` from <a href='https://github.com/xiangyuecn/Recorder'>xiangyuecn</a>. Thanks to them for their project!
- Thanks to tester **isaac**