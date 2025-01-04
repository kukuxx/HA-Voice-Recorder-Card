
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

> <b>這個卡片可以在手機app和電腦瀏覽器錄製你的聲音，必須和<a href='https://github.com/kukuxx/HA-Voice-Recorder'>HA-Voice-Recorder</a>整合搭配使用`。</b>

## 使用說明

- 建議使用 <b>HACS</b> 安裝如果想手動安裝請將 <b>voice-recorder-card.js</b> 資料夾放至 <br>
  <b>www</b> 資料夾。

  [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kukuxx&repository=lovelace-voice-recorder-card&category=Plugin)

- 安裝完成後請到儀表板 -> 資源 -> 新增資源，再配置卡片:
```
type: custom:voice-recorder-card
token: your token
```
> [!Tip]
> 記得到HA生成永久token。<br>
> 卡片配置完請記得安裝<a href='https://github.com/kukuxx/HA-Voice-Recorder'>整合</a>才能保存錄音檔。

- 錄音檔保存成功後會發送一個`voice_recorder_saved`事件可以用來當作觸發條件，事件內容如下:
```
{
  "path": # 檔案路徑
  "size": # 檔案大小
  "filename": # 檔案名
  "eventName": # 自訂的事件名稱
}
```

## 感謝

- 部分code寫法參考自 <a href='https://github.com/shaonianzhentan/cloud_music/blob/master/custom_components/ha_cloud_music/local/card/ha_cloud_music-setting.js'>這裡</a>
- 卡片使用的`Recorder.js`來自<a href='https://github.com/xiangyuecn/Recorder'>xiangyuecn</a>。感謝他的專案!
- 感謝測試員 **isaac**