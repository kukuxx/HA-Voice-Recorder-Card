
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

> <b>這個整合可以在手機app和電腦瀏覽器錄製你的聲音並將錄音檔保存。</b>

> [!Tip]
> 如果在使用過程中遇到bug，請先在整合裡<b>啟用偵錯</b>嘗試原本的操作之後，開啟issues把log貼上來。

## 使用說明

- 建議使用 <b>HACS</b> 安裝如果想手動安裝請將 <b>voice_recorder</b> 資料夾放在 <br>
  <b>custom_components</b> 資料夾中， 並重啟 <b>Home assistant</b>。

 [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kukuxx&repository=HA-Voice-Recorder-Card&category=Integration)
 
- 重啟完成到整合裡搜尋voice recorder進行設定，並配置 voice-recorder-card:
```
type: custom:voice-recorder-card
token: your token
event_options:
  - abc  // 選項1為預設事件名稱
  - 123
  - other
notify: bool // 預設為false
```
> [!Tip]
> 1.記得到HA生成永久token。<br>
> 2.如果遇到`allowlist_external_dirs`的問題，請參考<a href='https://www.home-assistant.io/integrations/homeassistant/#allowlist_external_dirs'>這裡</a>。<br>
> 3.event_options是事件名稱選項，可以預先填入多個事件名稱，可選。<br>
> 4.notify可以設定錄音成功是否發送通知，可選。<br>

> [!Important]
> **你無需手動建立資料夾，整合會根據你設定的路徑自動建立資料夾，**<br>
**如果你的路徑以`/media`開頭，將在`/media`下建立資料夾，**<br>
**如果路徑不以`/media`開頭，將在`/homeassistant`下建立資料夾。**<br>

- 錄音檔保存成功後會發送一個`voice_recorder_saved`事件可以用來當作觸發條件，事件內容如下:
```
{
  "browserID": # browserID,
  "eventName": # Custom event name,
  "filename": # File name,
  "path": # File path,
  "size": # File size, 
}
```
> [!Important]
> **browserID: 必須安裝<a href='https://github.com/thomasloven/hass-browser_mod'>browser_mod</a>才會產生ID，否則它將顯示為`null`**

## 致謝

- 部分code寫法參考自 <a href='https://github.com/shaonianzhentan/cloud_music/blob/master/custom_components/ha_cloud_music/local/card/ha_cloud_music-setting.js'>ha_cloud_music</a> 和 <a href='https://github.com/thomasloven/hass-browser_mod/blob/master/custom_components/browser_mod/mod_view.py'>hass-browser_mod</a>。
- 卡片使用的`Recorder.js`來自<a href='https://github.com/xiangyuecn/Recorder'>xiangyuecn</a>。感謝他的專案!
- 感謝測試員 **isaac**。