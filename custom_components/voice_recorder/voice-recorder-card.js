class VoiceRecorderCard extends HTMLElement {
    constructor() {
        super();
        this.recorder = null;
        this.isRecording = false;
        this._hass = null;
        this.MAX_DURATION = 300000; // Maximum record time (milliseconds)
        this.recordingTimeout = null;
    }

    setConfig(config) {
        if (!config.token) {
            throw new Error('Please set HA token');
        }

        this.config = config;
        this.token = config.token;
        this.options = config.event_options || null;
        this.notify = config.notify || false;
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
                max-height: 100%;
                padding: 18px 12px 12px 12px;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-sizing: border-box;
            }
            
            ha-select {
                flex: 50;
                margin: 0;
                max-width: 100%;
                max-height: 100%;
                
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
                --mdc-shape-medium: 12px;  /* 圓角設定 */
                --mdc-theme-primary: var(--accent-color);  /* 選中項目顏色 */
                --mdc-theme-surface: var(--card-background-color);  /* 下拉選單背景 */
            }
            
            ha-select mwc-menu {
                --mdc-theme-surface: var(--card-background-color);
                --mdc-text-color: var(--primary-text-color);
                --mdc-shape-medium: 12px;
            }
            
            mwc-list-item {
                --mdc-theme-text-primary-on-background: var(--primary-text-color);
                --mdc-theme-text-secondary-on-background: var(--secondary-text-color);
                --mdc-ripple-color: var(--accent-color);
            }
            
            mwc-list-item[selected] {
                color: var(--accent-color);
                background-color: rgba(var(--rgb-accent-color), 0.12);
            }

            mwc-button {
                flex: 15;
                margin: 0;
                --mdc-theme-primary: var(--primary-color);
                --mdc-shape-small: 12px;
                transition: all 0.3s ease;
                max-width: 100%;
                max-height: 100%;
            }
            
            mwc-button:hover {
                opacity: 0.9;
            }

            .recording {
                --mdc-theme-primary: var(--error-color) !important;
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
                const listItem = document.createElement('mwc-list-item');
                listItem.value = option;
                listItem.textContent = option;

                if (index === 0) {
                    listItem.setAttribute('selected', 'true');
                }

                eventnameSelect.appendChild(listItem);
            });
        } else {
            // Add empty option as default value
            const emptyOption = document.createElement('mwc-list-item');
            emptyOption.value = ''
            emptyOption.textContent = 'Select event name';
            eventnameSelect.appendChild(emptyOption);
        }

        content.appendChild(eventnameSelect);

        // Add record button
        const recordButton = document.createElement('mwc-button');
        recordButton.raised = true;
        recordButton.id = 'recordButton';
        recordButton.innerHTML = `
          <ha-icon icon="mdi:microphone"></ha-icon>
        `;
        recordButton.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        content.appendChild(recordButton);

        card.appendChild(style);
        card.appendChild(content);

        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }
        this.shadowRoot.appendChild(card);
    }

    async initRecorder() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/xiangyuecn/Recorder@master/recorder.mp3.min.js';

            script.onload = () => {
                this.recorder = Recorder({
                    type: "mp3",
                    sampleRate: 16000,
                    bitRate: 128
                });

                this.recorder.open(() => {
                    resolve();
                }, (msg) => {
                    this._showError('Unable to start recording: ' + msg);
                    reject(new Error(msg));
                });
            };

            script.onerror = () => {
                this._showError('Recorder plug-in failed to load');
                reject(new Error('Script loading failed'));
            };

            document.body.appendChild(script);
        });
    }

    async startRecording() {
        if (this.isRecording) return;

        try {
            if (!this.recorder) {
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
                    this._showMessage('Maximum recording time reached (300 seconds)');
                }
            }, this.MAX_DURATION);

        } catch (error) {
            this._showError('Recording startup failed: ' + error.message);
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
                    if (duration < 2000) {
                        this._showError('The recording time is too short (less than 2 seconds)');
                        return;
                    }

                    const formData = new FormData();
                    const browserID = window.browser_mod?.browserID ? window.browser_mod.browserID : '';
                    const eventName = String(this.shadowRoot.querySelector('#eventnameInput').value || '').trim();
                    formData.append('file', blob, 'recording.mp3');
                    formData.append('browserid', browserID);
                    formData.append('eventname', eventName);

                    const response = await fetch('/api/voice_recorder/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.token}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Upload failed (${response.status}): ${errorText}`);
                    }

                    const result = await response.json();

                    if (result.success && this.notify) {
                        const notification = `Browserid:${result.browserID}\n Eventname: ${result.eventName}\n Filename: ${result.filename}\n Path: ${result.path}`;
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
    `%c  VOICE-RECORDER-CARD  \n%c   Version:   V1.0.8   `,
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



