import * as vscode from 'vscode';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nyxeditor-chat-view';
    private _view?: vscode.WebviewView;
    private _tokenMeter?: vscode.StatusBarItem;
    private _availableModels: string[] = [];

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) { }

    public async updateAvailableModels(models: string[]) {
        this._availableModels = models;
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateModels', models });
        }
    }

    public setTokenMeter(meter: vscode.StatusBarItem) {
        this._tokenMeter = meter;
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Escuchar mensajes del Panel (Frontend)
        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.type) {
                case 'saveKey':
                    // Guardar llave de forma encriptada
                    await this._context.secrets.store(data.provider, data.key);
                    vscode.window.showInformationMessage(`Llave de ${data.provider} guardada en NyxEditor`);
                    break;
                case 'askAI':
                    const key = await this._context.secrets.get(data.provider);
                    if (!key) {
                        webviewView.webview.postMessage({ type: 'error', text: `Falta la API Key de ${data.provider}` });
                        return;
                    }
                    // Aquí iría la llamada real a la API (fetch)
                    const simulatedTokens = Math.floor(Math.random() * 500) + 100;
                    if (this._tokenMeter) {
                        this._tokenMeter.text = `$(pulse) Nyx AI: ${simulatedTokens} tokens`;
                        this._tokenMeter.backgroundColor = simulatedTokens > 400 ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
                    }
                    webviewView.webview.postMessage({ type: 'addResponse', text: `Respuesta simulada de ${data.provider} (Cerebro en construcción...)` });
                    break;
                case 'ghost':
                    vscode.commands.executeCommand('nyx-ai.createGhostSandbox');
                    break;
                case 'zen':
                    vscode.commands.executeCommand('nyx-ai.toggleZenAudio');
                    break;
                case 'openManager':
                    vscode.commands.executeCommand('nyx-ai.openManager');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                :root {
                    --accent-color: #007acc;
                    --glass-bg: rgba(255, 255, 255, 0.05);
                    --glass-border: rgba(255, 255, 255, 0.1);
                }
                body { 
                    padding: 0; 
                    margin: 0;
                    color: var(--vscode-foreground); 
                    font-family: var(--vscode-font-family); 
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                }
                .main-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 12px;
                    gap: 12px;
                }
                #chat-container { 
                    flex: 1;
                    overflow-y: auto; 
                    padding-right: 4px;
                    scrollbar-width: thin;
                }
                .header { 
                    display: flex; 
                    gap: 8px;
                    align-items: center; 
                }
                .glass-panel {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                }
                select, textarea, input { 
                    background: var(--vscode-input-background); 
                    color: var(--vscode-input-foreground); 
                    border: 1px solid var(--vscode-input-border); 
                    padding: 8px; 
                    border-radius: 4px;
                    font-family: inherit;
                }
                select { width: 100%; }
                .settings-btn {
                    background: transparent;
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-foreground);
                    width: 32px;
                    height: 32px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .settings-btn:hover { background: var(--glass-bg); }
                .settings-panel { 
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .msg { 
                    margin: 12px 0; 
                    padding: 10px 14px; 
                    border-radius: 12px;
                    max-width: 85%;
                    line-height: 1.4;
                    font-size: 13px;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .user { 
                    background: var(--vscode-button-background); 
                    color: var(--vscode-button-foreground);
                    align-self: flex-end; 
                    margin-left: auto;
                    border-bottom-right-radius: 2px;
                }
                .ai { 
                    background: var(--glass-bg); 
                    border: 1px solid var(--glass-border);
                    align-self: flex-start;
                    border-bottom-left-radius: 2px;
                }
                .input-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                textarea { 
                    width: calc(100% - 18px); 
                    resize: none; 
                    min-height: 60px;
                    border-radius: 8px;
                }
                .primary-btn { 
                    background: var(--vscode-button-background); 
                    color: var(--vscode-button-foreground); 
                    cursor: pointer; 
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-weight: 600;
                    transition: filter 0.2s;
                }
                .primary-btn:hover { filter: brightness(1.2); }
                .secondary-btn {
                    background: var(--glass-bg);
                    color: var(--vscode-foreground);
                    border: 1px solid var(--glass-border);
                    padding: 6px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: background 0.2s;
                }
                .secondary-btn:hover { background: var(--glass-border); }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <div class="main-container">
                <div class="header">
                    <select id="model-select">
                        <option value="gemini-pro">Gemini 1.5 Pro</option>
                        <option value="claude-3-5">Claude 3.5 Sonnet</option>
                        <option value="grok-1">Grok-1 (𝕏)</option>
                        <option value="gpt-4o">GPT-4o</option>
                    </select>
                    <button id="settings-btn" class="settings-btn" title="Configuración">⚙</button>
                    <button class="settings-btn" onclick="openManager()" title="Nyx Manager">🏠</button>
                </div>

                <div id="settings" class="settings-panel glass-panel hidden">
                    <p style="font-size: 10px; margin: 0;">Gestiona tus llaves en el <a href="#" onclick="openManager()">Nyx Manager</a></p>
                </div>

                <div id="chat-container"></div>

                <div class="input-section">
                    <textarea id="prompt" placeholder="Pregunta algo a NyxEditor..."></textarea>
                    <button class="primary-btn" onclick="send()">Enviar Mensaje</button>
                    <div style="display: flex; gap: 8px;">
                        <button class="secondary-btn" onclick="ghost()">👻 Sandbox</button>
                        <button class="secondary-btn" onclick="toggleZen()">🎵 Zen Audio</button>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                const settingsPanel = document.getElementById('settings');
                const chatContainer = document.getElementById('chat-container');

                document.getElementById('settings-btn').onclick = () => {
                    settingsPanel.classList.toggle('hidden');
                };

                function saveKey() {
                    const provider = document.getElementById('model-select').value;
                    const key = document.getElementById('api-key').value;
                    vscode.postMessage({ type: 'saveKey', provider, key });
                    settingsPanel.classList.add('hidden');
                    document.getElementById('api-key').value = '';
                }

                function send() {
                    const textarea = document.getElementById('prompt');
                    const text = textarea.value.trim();
                    if (!text) return;
                    const provider = document.getElementById('model-select').value;
                    appendMsg(text, 'user');
                    vscode.postMessage({ type: 'askAI', provider, text });
                    textarea.value = '';
                }

                function appendMsg(text, role) {
                    const div = document.createElement('div');
                    div.className = 'msg ' + role;
                    div.innerText = text;
                    chatContainer.appendChild(div);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }

                function ghost() { vscode.postMessage({ type: 'ghost' }); }
                function toggleZen() { vscode.postMessage({ type: 'zen' }); }
                function openManager() { vscode.postMessage({ type: 'openManager' }); }

                window.addEventListener('message', event => {
                    const data = event.data;
                    if(data.type === 'addResponse') appendMsg(data.text, 'ai');
                    if(data.type === 'error') appendMsg('❌ Error: ' + data.text, 'ai');
                    if(data.type === 'updateModels') {
                        const select = document.getElementById('model-select');
                        const models = {
                            'gemini-pro': 'Gemini 1.5 Pro',
                            'claude-3-5': 'Claude 3.5 Sonnet',
                            'grok-1': 'Grok-1 (𝕏)',
                            'gpt-4o': 'GPT-4o'
                        };
                        select.innerHTML = '';
                        data.models.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m;
                            opt.innerText = models[m] || m;
                            select.appendChild(opt);
                        });
                        if (data.models.length === 0) {
                            const opt = document.createElement('option');
                            opt.innerText = '⚠️ Sin llaves';
                            select.appendChild(opt);
                        }
                    }
                });

                document.getElementById('prompt').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
