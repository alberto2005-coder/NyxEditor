import * as vscode from 'vscode';

export class NyxManagerProvider {
    public static readonly viewType = 'nyx-manager';

    public static open(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        const panel = vscode.window.createWebviewPanel(
            NyxManagerProvider.viewType,
            'Nyx Manager: Configuración Global',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveKey':
                    await context.secrets.store(message.provider, message.key);
                    vscode.window.showInformationMessage(`Nyx Manager: Llave de ${message.provider} actualizada.`);
                    // Notificar a otras vistas que las llaves han cambiado
                    vscode.commands.executeCommand('nyx-ai.refreshModels');
                    break;
                case 'deleteKey':
                    await context.secrets.delete(message.provider);
                    vscode.window.showWarningMessage(`Nyx Manager: Llave de ${message.provider} eliminada.`);
                    vscode.commands.executeCommand('nyx-ai.refreshModels');
                    break;
            }
        });
    }

    private static _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    padding: 40px; 
                    color: var(--vscode-foreground); 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: var(--vscode-editor-background);
                }
                .container { max-width: 800px; margin: 0 auto; }
                .card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                }
                h1 { font-size: 32px; font-weight: 300; margin-bottom: 30px; color: #007acc; }
                h2 { font-size: 18px; margin-top: 0; opacity: 0.8; }
                .provider-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .provider-item {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 15px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                }
                input {
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 8px 12px;
                    border-radius: 4px;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                }
                button:hover { background: var(--vscode-button-hoverBackground); }
                .delete-btn { background: #d93025; margin-left: 5px; }
                .delete-btn:hover { background: #b22a22; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Nyx Manager</h1>
                
                <div class="card">
                    <h2>Gestión de Inteligencias Artificiales</h2>
                    <p>Configura tus API Keys para activar los modelos en el chat de Nyx.</p>
                    
                    <div class="provider-grid">
                        <div class="provider-item">
                            <label>Groq (Ultra-Fast LPU)</label>
                            <p style="font-size: 10px; margin: 0; opacity: 0.6;">Consigue tu llave en <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a></p>
                            <input type="password" id="groq-key" placeholder="Pega tu llave de groq.com aquí...">
                            <div>
                                <button onclick="save('groq', 'groq-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('groq')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>Google (Gemini)</label>
                            <input type="password" id="gemini-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('gemini-pro', 'gemini-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('gemini-pro')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>𝕏 (Grok-1)</label>
                            <input type="password" id="grok-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('grok-1', 'grok-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('grok-1')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>OpenAI (GPT-4o)</label>
                            <input type="password" id="gpt-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('gpt-4o', 'gpt-4y')">Guardar</button>
                                <button class="delete-btn" onclick="del('gpt-4o')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>Anthropic (Claude)</label>
                            <input type="password" id="claude-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('claude-3-5', 'claude-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('claude-3-5')">Limpiar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function save(provider, inputId) {
                    const key = document.getElementById(inputId).value;
                    if (!key) return;
                    vscode.postMessage({ command: 'saveKey', provider, key });
                    document.getElementById(inputId).value = '';
                }

                function del(provider) {
                    vscode.postMessage({ command: 'deleteKey', provider });
                }
            </script>
        </body>
        </html>`;
    }
}
