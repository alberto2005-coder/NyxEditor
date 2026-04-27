import * as vscode from 'vscode';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nyxeditor-chat-view';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) { }

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
                    webviewView.webview.postMessage({ type: 'addResponse', text: `Respuesta simulada de ${data.provider} (Cerebro en construcción...)` });
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <style>
                body { padding: 10px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
                #chat-container { height: calc(100vh - 120px); overflow-y: auto; margin-bottom: 10px; border-bottom: 1px solid var(--vscode-panel-border); }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                select, textarea, button { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 5px; width: 100%; }
                button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; margin-top: 5px; border: none; }
                button:hover { background: var(--vscode-button-hoverBackground); }
                .settings-panel { display: none; background: var(--vscode-sideBar-background); padding: 10px; border: 1px dashed gray; margin-bottom: 10px; }
                .msg { margin: 8px 0; padding: 8px; border-radius: 4px; }
                .user { background: var(--vscode-editor-inactiveSelectionBackground); text-align: right; }
                .ai { background: var(--vscode-editor-selectionBackground); }
            </style>
        </head>
        <body>
            <div class="header">
                <select id="model-select">
                    <option value="google">Gemini 1.5 Pro</option>
                    <option value="anthropic">Claude 3.5 Sonnet</option>
                </select>
                <button id="settings-btn" style="width: 30px;">⚙</button>
            </div>

            <div id="settings" class="settings-panel">
                <input type="password" id="api-key" placeholder="Pega tu API Key aquí">
                <button onclick="saveKey()">Guardar Llave</button>
            </div>

            <div id="chat-container"></div>

            <textarea id="prompt" rows="3" placeholder="Pregunta algo a NyxEditor..."></textarea>
            <button onclick="send()">Enviar</button>

            <script>
                const vscode = acquireVsCodeApi();
                const settingsPanel = document.getElementById('settings');

                document.getElementById('settings-btn').onclick = () => {
                    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
                };

                function saveKey() {
                    const provider = document.getElementById('model-select').value;
                    const key = document.getElementById('api-key').value;
                    vscode.postMessage({ type: 'saveKey', provider, key });
                    settingsPanel.style.display = 'none';
                }

                function send() {
                    const text = document.getElementById('prompt').value;
                    const provider = document.getElementById('model-select').value;
                    appendMsg(text, 'user');
                    vscode.postMessage({ type: 'askAI', provider, text });
                    document.getElementById('prompt').value = '';
                }

                function appendMsg(text, role) {
                    const div = document.createElement('div');
                    div.className = 'msg ' + role;
                    div.innerText = text;
                    document.getElementById('chat-container').appendChild(div);
                }

                window.addEventListener('message', event => {
                    if(event.data.type === 'addResponse') appendMsg(event.data.text, 'ai');
                    if(event.data.type === 'error') alert(event.data.text);
                });
            </script>
        </body>
        </html>`;
    }
}
