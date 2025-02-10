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
        this.eventname = config.event_name;    // Static event name
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
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .card-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                box-sizing: border-box;
                background: var(--card-background-color);
            }
            
            .input-container {
                display: none;
                position: relative;
                width: 100%;
            }

            .input-container.visible {
                display: flex;
            }

            .eventname-input {
                width: 100%;
                box-sizing: border-box;
                padding: 12px 44px 12px 16px;
                border: 2px solid var(--primary-color);
                border-radius: 12px;
                background: var(--card-background-color);
                color: var(--primary-text-color);
                font-size: 16px;
                transition: all 0.3s ease;
            }

            .eventname-input:focus {
                outline: none;
                border-color: var(--accent-color);
                box-shadow: 0 0 0 3px rgba(var(--rgb-accent-color), 0.1);
            }

            .eventname-input::placeholder {
                color: var(--secondary-text-color);
            }

            .clear-button {
                position: absolute;
                top: 50%;
                right: 8px;
                transform: translateY(-50%);
                width: 2em;
                height: 2em;
                min-width: unset;
                min-height: unset;
                background: var(--secondary-background-color);
                border: none;
                border-radius: 50%;
                color: var(--primary-text-color);
                cursor: pointer;
                padding: 0;
                display: none;
                font-size: 1.2em;
                line-height: 1;
                z-index: 1;
                transition: all 0.2s ease;
            }

            .clear-button:hover {
                background: var(--primary-color);
                color: var(--primary-text-color);
            }

            .clear-button.visible {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .controls-container {
                display: flex;
                width: 100%;
                gap: 8px;
                align-items: stretch;
            }

            .toggle-button {
                flex: 1; 
                margin: 8px 0;
                border: none;
                border-radius: 12px;
                background: var(--primary-color);
                color: var(--primary-text-color);
                cursor: pointer;
                font-size: 1.5em;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .toggle-button:hover {
                opacity: 0.9;
            }

            mwc-button {
                flex: 20;
                margin: 8px 0;
                --mdc-theme-primary: var(--primary-color);
                --mdc-shape-small: 12px;
                transition: all 0.3s ease;
            }
            
            .recording {
                --mdc-theme-primary: var(--error-color) !important;
            }

            /* Button hover effect */
            mwc-button:hover {
                opacity: 0.9;
            }
        `;

        const content = document.createElement('div');
        content.className = 'card-content';

        // eventname textbox
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        const eventnameInput = document.createElement('input');
        eventnameInput.type = 'text';
        eventnameInput.className = 'eventname-input';
        eventnameInput.id = 'eventnameInput';
        eventnameInput.placeholder = 'Enter your custom event name (optional)';

        const clearButton = document.createElement('button');
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '×';
        clearButton.addEventListener('click', () => {
            eventnameInput.value = '';
            clearButton.classList.remove('visible');
        });

        eventnameInput.addEventListener('input', () => {
            clearButton.classList.toggle('visible', eventnameInput.value.length > 0);
        });

        inputContainer.appendChild(eventnameInput);
        inputContainer.appendChild(clearButton);

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';

        // record button
        const recordButton = document.createElement('mwc-button');
        recordButton.raised = true;
        recordButton.id = 'recordButton';
        recordButton.textContent = 'Start Recording';
        recordButton.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        // toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-button';
        toggleButton.innerHTML = '+';
        toggleButton.addEventListener('click', () => {
            this.isInputVisible = !this.isInputVisible;
            inputContainer.classList.toggle('visible', this.isInputVisible);
            toggleButton.innerHTML = this.isInputVisible ? '-' : '+';
        });

        controlsContainer.appendChild(recordButton);
        controlsContainer.appendChild(toggleButton);

        content.appendChild(inputContainer);
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

        try {
            if (!this.recorder) {
                await this.initRecorder();
            }

            this.recorder.start();
            this.isRecording = true;

            const button = this.shadowRoot.querySelector('#recordButton');
            button.textContent = 'Stop Recording';
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
            button.textContent = 'Start Recording';
            button.classList.remove('recording');

            this.recorder.stop(async (blob, duration) => {
                try {
                    if (duration < 2000) {
                        this._showError('The recording time is too short (less than 2 seconds)');
                        return;
                    }

                    const formData = new FormData();
                    const eventName = this.eventname ?? this.shadowRoot.querySelector('#eventnameInput').value.trim();    // the event name is either provided in the configuration or read from the textbox element
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
