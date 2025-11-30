class VoiceRecorderCard extends HTMLElement {
    constructor() {
        super();
        this.recorder = null;
        this.isRecording = false;
        this._hass = null;
        this.MAX_DURATION = 300000; // Maximum record time (milliseconds)
        this.recordingTimeout = null;
        this.recorderInitialized = false;
    }

    setConfig(config) {
        if (config.button_mode && !['click', 'hold'].includes(config.button_mode)) {
            throw new Error("Invalid button_mode");
        }

        this.config = config;
        this.options = config.event_options || null;
        this.notify = config.notify || false;
        this.button_mode = config.button_mode || 'click'
        // Volume gain setting, default is 1.0 (no gain), range 1.0 - 10.0
        this.volumeGain = Math.max(1.0, Math.min(10.0, config.volume_gain || 2.0));
        // Sound quality level settings: basic (16k/128), good (22k/160), high (44k/192), ultra (48k/256)
        this.audioQuality = config.audio_quality || 'good';
        this.attachShadow({ mode: 'open' });
        this._buildCard();
    }

    _buildCard() {
        const card = document.createElement('ha-card');
        if (this.config.name) {
            card.header = this.config.name;
        }

        const style = document.createElement('style');
        style.textContent = `
            ha-card {
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                background: var(--card-background-color);
                padding: 0px;
                align-items: center;
                justify-content: center;
            }
            
            .card-content {
                max-width: 100%;
                padding: 18px 12px 12px 12px;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-sizing: border-box;
                flex-wrap: wrap;
            }
            
            ha-select {
                margin: 0;
                flex: 1 1 150px;
                min-width: 0;
                max-width: 100%;
                text-overflow: ellipsis;
                
                /* 基本顏色設定 */
                --mdc-select-fill-color: var(--card-background-color);
                --mdc-select-ink-color: var(--primary-text-color);
                --mdc-select-label-ink-color: var(--primary-color);
                --mdc-select-dropdown-icon-color: var(--primary-color);

                /* 邊框相關 */
                --mdc-select-idle-line-color: var(--primary-color);
                --mdc-select-outlined-idle-border-color: var(--primary-color);
                --mdc-select-outlined-hover-border-color: var(--accent-color);

                --mdc-select-hover-line-color: var(--accent-color);
                --mdc-theme-primary: var(--accent-color);  /* 選中項目顏色 */
                --mdc-theme-surface: var(--card-background-color);  /* 下拉選單背景 */

                --mdc-menu-surface-fill-color: var(--card-background-color);
                --mdc-menu-text-color: var(--primary-text-color);
                --mdc-menu-min-width: 100%;
                --mdc-menu-max-width: 100%;
            }
            
            ha-list-item {
                --mdc-theme-text-primary-on-background: var(--primary-text-color);
                --mdc-theme-text-secondary-on-background: var(--secondary-text-color);
                --mdc-ripple-color: var(--accent-color);
            }
            
            ha-list-item[selected] {
                color: var(--accent-color);
                background-color: rgba(var(--rgb-accent-color), 0.12);
            }

            ha-button {
                margin: 0;
                flex: 0 1 80px;
                max-width: 100%;
                min-width: 0;
                transition: all 0.3s ease;
                --mdc-theme-primary: var(--primary-color);
                --mdc-shape-small: 12px;
            }
            
            ha-button:hover {
                opacity: 0.9;
            }
            
            /* 錄音狀態的紅色樣式 */
            ha-button.recording::part(base) {
                background-color: #ff0000 !important;
            }

             /* 添加脈衝動畫效果 */
             ha-button.recording::part(base) {
                 animation: pulse-red 1.5s infinite;
             }

             @keyframes pulse-red {
                 0% { 
                     box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
                 }
                 70% {
                     box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
                 }
                 100% {
                     box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
                 }
             }
        `;

        const content = document.createElement('div');
        content.className = 'card-content';

        // Add eventname menu
        const eventnameSelect = document.createElement('ha-select');
        eventnameSelect.id = 'eventnameInput';

        // Add options
        if (this.options) {
            this.options.forEach((option, index) => {
                const listItem = document.createElement('ha-list-item');
                listItem.value = option;
                listItem.textContent = option;

                if (index === 0) {
                    listItem.setAttribute('selected', 'true');
                }

                eventnameSelect.appendChild(listItem);
            });
        } else {
            // Add empty option as default value
            const emptyOption = document.createElement('ha-list-item');
            emptyOption.value = ''
            emptyOption.textContent = 'Select event name';
            eventnameSelect.appendChild(emptyOption);
        }

        content.appendChild(eventnameSelect);

        // Add record button
        const recordButton = document.createElement('ha-button');
        recordButton.raised = true;
        recordButton.id = 'recordButton';
        recordButton.innerHTML = `
          <ha-icon icon="mdi:microphone"></ha-icon>
        `;
        if (this.button_mode === 'click') {
            recordButton.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
        } else {
            recordButton.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.startRecording();
            });
            recordButton.addEventListener('pointerup', (e) => {
                e.preventDefault();
                this.stopRecording();
            });
        }

        content.appendChild(recordButton);

        card.appendChild(style);
        card.appendChild(content);

        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }
        this.shadowRoot.appendChild(card);
    }

    async initRecorder() {
        // 避免重複初始化
        if (this.recorderInitialized && this.recorder) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/kukuxx/Recorder@master/recorder.mp3.min.js';

            script.onload = () => {
                // 載入英文語言包並設置語言為英文（避免簡體中文輸出）
                if (window.Recorder && window.Recorder.i18n) {
                    const i18nScript = document.createElement('script');
                    i18nScript.src = 'https://cdn.jsdelivr.net/gh/kukuxx/Recorder@master/src/i18n/en-US.js';
                    i18nScript.onload = () => {
                        window.Recorder.i18n.lang = "en-US";
                        console.log('Recorder language set to English');
                        this._continueRecorderInit(resolve, reject);
                    };
                    i18nScript.onerror = () => {
                        // 如果載入英文語言包失敗，則使用zh-CN
                        window.Recorder.i18n.lang = "zh-CN";
                        console.warn('Failed to load English language pack, some text may still be in Chinese');
                        this._continueRecorderInit(resolve, reject);
                    };
                    document.head.appendChild(i18nScript);
                } else {
                    this._continueRecorderInit(resolve, reject);
                }
            };

            script.onerror = () => {
                this._showError('錄音器外掛載入失敗');
                reject(new Error('腳本載入失敗'));
            };

            // 避免重複添加script標籤
            if (!document.querySelector('script[src="https://cdn.jsdelivr.net/gh/kukuxx/Recorder@master/recorder.mp3.min.js"]')) {
                document.body.appendChild(script);
            } else {
                // 如果script已存在，直接初始化
                script.onload();
            }
        });
    }

    _continueRecorderInit(resolve, reject) {
        // 根據音質等級設定參數
        const qualitySettings = this._getQualitySettings();

        this.recorder = Recorder({
            type: "mp3",
            sampleRate: qualitySettings.sampleRate,
            bitRate: qualitySettings.bitRate,
            // 音頻設置：關閉自動增益控制，使用自訂的增益處理
            audioTrackSet: {
                autoGainControl: false, // 關閉自動增益控制，避免與自訂增益處理衝突
                echoCancellation: true,
                noiseSuppression: true
            },
            // 當使用音量增益時，禁用設備卡頓補償功能
            disableEnvInFix: this.volumeGain !== 1.0,
            onProcess: (buffers, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd) => {
                // 只能修改或替換上次回調以來新增的buffer
                if (this.volumeGain !== 1.0 && buffers && newBufferIdx < buffers.length) {
                    // 只處理新的buffer（從 newBufferIdx 開始到結尾）
                    for (let i = newBufferIdx; i < buffers.length; i++) {
                        if (buffers[i] && buffers[i].length > 0) {
                            // 創建新的增益處理後的buffer來替換原buffer
                            const originalBuffer = buffers[i];
                            const gainedBuffer = new Int16Array(originalBuffer.length);

                            // 應用音量增益 - 使用軟限制器改善音質
                            for (let j = 0; j < originalBuffer.length; j++) {
                                let sample = originalBuffer[j] * this.volumeGain;

                                // 軟限制器：使用 tanh 函數平滑限制，減少削波失真
                                if (Math.abs(sample) > 16384) { // 當超過一半範圍時開始軟限制
                                    const sign = sample >= 0 ? 1 : -1;
                                    const normalizedSample = Math.abs(sample) / 32767;
                                    // 使用 tanh 函數進行軟限制
                                    const limitedSample = Math.tanh(normalizedSample * 2) * 32767 * sign;
                                    sample = limitedSample;
                                } else {
                                    // 在安全範圍內直接使用
                                    sample = Math.max(-32768, Math.min(32767, sample));
                                }

                                gainedBuffer[j] = Math.round(sample);
                            }

                            // 替換原buffer
                            buffers[i] = gainedBuffer;

                            // // 調試日誌（僅第一個buffer）
                            // if (i === newBufferIdx && originalBuffer.length > 0) {
                            //     console.log(`音量增益處理: ${this.volumeGain}x, 原始: ${originalBuffer[0]}, 處理後: ${gainedBuffer[0]}, 緩衝區長度: ${gainedBuffer.length}`);
                            // }
                        }
                    }
                }
                // 避免未使用參數的警告
                void powerLevel; void bufferDuration; void bufferSampleRate; void asyncEnd;
            }
        });

        this.recorder.open(() => {
            this.recorderInitialized = true;
            resolve();
        }, (msg) => {
            this._showError('Recorder error: ' + msg);
            reject(new Error(msg));
        });
    }

    _getQualitySettings() {
        // 音質等級設定表
        const qualityMap = {
            'basic': { sampleRate: 16000, bitRate: 128 }, // 基本品質，小檔案
            'good': { sampleRate: 22050, bitRate: 160 }, // 良好品質，平衡點 (預設)
            'high': { sampleRate: 44100, bitRate: 192 }, // 高品質，較大檔案
            'ultra': { sampleRate: 48000, bitRate: 256 }  // 極高品質，大檔案
        };

        const settings = qualityMap[this.audioQuality] || qualityMap['good'];
        return settings;
    }

    async startRecording() {
        if (this.isRecording) return;

        try {
            if (!this.recorderInitialized) {
                await this.initRecorder();
            }

            this.recorder.start();
            this.isRecording = true;

            const button = this.shadowRoot.querySelector('#recordButton');
            button.classList.add('recording');

            // Set the maximum record time
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                    this._showMessage('Record time limit reached (300 秒)');
                }
            }, this.MAX_DURATION);

        } catch (error) {
            this._showError('Recording failed: ' + error.message);
            this.isRecording = false;
        }
    }

    async stopRecording() {
        if (!this.recorder || !this.isRecording) return;

        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }

        try {
            this.isRecording = false;
            const button = this.shadowRoot.querySelector('#recordButton');
            button.classList.remove('recording');

            this.recorder.stop(async (blob, duration) => {
                try {
                    if (duration < 200) {
                        this._showError('Recording too short(< 200ms)');
                        return;
                    }

                    const formData = new FormData();
                    const browserID = window.browser_mod?.browserID ? window.browser_mod.browserID : '';
                    const eventName = String(this.shadowRoot.querySelector('#eventnameInput').value || '').trim();
                    formData.append('file', blob, 'recording.mp3');
                    formData.append('browserid', browserID);
                    formData.append('eventname', eventName);
                    formData.append('user_id', this._hass.user.id);

                    const response = await fetch('/api/voice_recorder/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this._hass.auth.accessToken}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Upload failed (${response.status}): ${errorText}`);
                    }

                    const result = await response.json();

                    if (result.success && this.notify) {
                        const notification = `BrowserID: ${result.browserID}\nEventName: ${result.eventName}\nFileName: ${result.filename}\nPath: ${result.path}`;
                        this._hass.callService('persistent_notification', 'create', {
                            message: notification,
                            title: 'Recording saved successfully'
                        });
                    } else {
                        if (!result.success) {
                            throw new Error(result.msg);
                        }
                    }

                } catch (error) {
                    this._showError('Failed to save recording: ' + error.message);
                }
            });
        } catch (error) {
            this._showError('Failed to stop recording: ' + error.message);
            this.isRecording = false;
        }
    }

    _showError(message) {
        if (this._hass) {
            this._hass.callService('persistent_notification', 'create', {
                message: message,
                title: 'Recorder card error'
            });
        } else {
            console.error(message);
        }
    }

    _showMessage(message) {
        if (this._hass) {
            this._hass.callService('persistent_notification', 'create', {
                message: message,
                title: 'Recorder card prompts'
            });
        } else {
            console.log(message);
        }
    }

    disconnectedCallback() {
        if (this.recorder) {
            this.recorder.close();
            this.recorder = null;
            this.recorderInitialized = false; // 重置初始化狀態
        }
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }
    }

    set hass(hass) {
        this._hass = hass;
    }
}

console.info(
    `%c  VOICE-RECORDER-CARD  \n%c  VERSION:    V1.0.12  `,
    'color: orchid; font-weight: bold; background: dimgray;',
    'color: orange; font-weight: bold; background: white;'
);

customElements.define('voice-recorder-card', VoiceRecorderCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "voice-recorder-card",
    name: "Voice Recorder Card",
    description: "A card to record and upload audio files.",
});



