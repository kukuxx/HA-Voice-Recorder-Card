class VoiceRecorderCard extends HTMLElement {
    constructor() {
        super();
        this.recorder = null;
        this.isRecording = false;
        this._hass = null;
        this.MAX_DURATION = 300000; // 最大錄音時長（毫秒）
        this.recordingTimeout = null;
    }

    setConfig(config) {
        if (!config.token) {
            throw new Error('Please set HA token');
        }

        this.config = config;
        this.token = config.token;
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
            .card-content {
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
            }
            
            .eventname-input {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--primary-color);
                border-radius: 4px;
                background: var(--card-background-color);
                color: var(--primary-text-color);
            }

            .eventname-input:focus {
                outline: none;
                border-color: var(--accent-color);
            }

            .eventname-input::placeholder {
                color: var(--secondary-text-color);
            }
            
            .controls-container {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
            }
            
            mwc-button {
                margin: 8px 0;
                --mdc-theme-primary: var(--primary-color);
            }
            
            .recording {
                background-color: var(--error-color) !important;
            }

            .status-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #ccc;
                display: inline-block;
                vertical-align: middle;
            }

            .status-indicator.recording {
                background-color: #ff0000;
                animation: pulse 1s infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;

        const content = document.createElement('div');
        content.className = 'card-content';

        // 添加事件名輸入框
        const eventnameInput = document.createElement('input');
        eventnameInput.type = 'text';
        eventnameInput.className = 'eventname-input';
        eventnameInput.id = 'eventnameInput';
        eventnameInput.placeholder = 'Enter your custom event name (optional)';

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';

        const startButton = document.createElement('mwc-button');
        startButton.raised = true;
        startButton.id = 'recordButton';
        startButton.textContent = 'Press and hold to start';
        startButton.style.flex = '1';

        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.id = 'statusIndicator';

        startButton.addEventListener('mousedown', () => this.startRecording());
        startButton.addEventListener('mouseup', () => this.stopRecording());
        startButton.addEventListener('mouseleave', () => this.stopRecording());

        startButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        startButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        controlsContainer.appendChild(startButton);
        controlsContainer.appendChild(statusIndicator);

        content.appendChild(eventnameInput);
        content.appendChild(controlsContainer);
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

        const eventnameInput = this.shadowRoot.querySelector('#eventnameInput');

        try {
            if (!this.recorder) {
                await this.initRecorder();
            }

            this.recorder.start();
            this.isRecording = true;

            const button = this.shadowRoot.querySelector('#recordButton');
            const statusIndicator = this.shadowRoot.querySelector('#statusIndicator');
            button.textContent = 'Recording...';
            button.classList.add('recording');
            statusIndicator.classList.add('recording');

            // 設置最大錄音時長
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
            const statusIndicator = this.shadowRoot.querySelector('#statusIndicator');
            button.textContent = 'Press and hold to start';
            button.classList.remove('recording');
            statusIndicator.classList.remove('recording');

            this.recorder.stop(async (blob, duration) => {
                try {
                    if (duration < 2000) {
                        this._showError('The recording time is too short (less than 2 seconds)');
                        return;
                    }

                    const formData = new FormData();
                    const eventName = this.shadowRoot.querySelector('#eventnameInput').value.trim();
                    formData.append('file', blob, 'recording.mp3');
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

                    if (result.success) {
                        this._hass.callService('persistent_notification', 'create', {
                            message: `Recording saved: ${result.filename}\n Eventname: ${eventName}\n path：${result.path}`,
                            title: 'Recording saved successfully'
                        });
                    } else {
                        throw new Error(result.msg);
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

window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "voice-recorder-card")) {
    window.customCards.push({
        type: "voice-recorder-card",
        name: "Voice Recorder Card",
        description: "A card to record and upload audio files.",
    });
}

if (!window.customElements.get('voice-recorder-card')) {
    window.customElements.define('voice-recorder-card', VoiceRecorderCard);
}
