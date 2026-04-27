import * as vscode from 'vscode';

export class NyxManagerProvider {
    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel(
            'nyxManager',
            'Nyx Manager',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        const getStatus = async () => ({
            groq: !!(await context.secrets.get('groq')),
            gemini: !!(await context.secrets.get('gemini-pro')),
            grok: !!(await context.secrets.get('grok-1')),
            gpt4: !!(await context.secrets.get('gpt-4o')),
            claude: !!(await context.secrets.get('claude-3-5'))
        });

        const updateHtml = async () => {
            panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri, await getStatus());
        };

        updateHtml();

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveKey':
                    await context.secrets.store(message.provider, message.key);
                    vscode.window.showInformationMessage(`Llave de ${message.provider} guardada correctamente.`);
                    updateHtml();
                    vscode.commands.executeCommand('nyx-ai.refreshModels');
                    break;
                case 'deleteKey':
                    await context.secrets.delete(message.provider);
                    vscode.window.showInformationMessage(`Llave de ${message.provider} eliminada.`);
                    updateHtml();
                    vscode.commands.executeCommand('nyx-ai.refreshModels');
                    break;
            }
        });
    }

    private static _getHtmlForWebview(_webview: vscode.Webview, _extensionUri: vscode.Uri, keysStatus: any) {
        return `<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nyx Manager</title>
            <style>
                body {
                    background-color: #0d1117;
                    color: #c9d1d9;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 40px;
                }
                .container { max-width: 900px; margin: 0 auto; }
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 24px;
                    margin-bottom: 24px;
                }
                .provider-item label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-weight: 600; color: #fff; }
                .status-badge { background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
                .provider-item input { 
                    width: 100%; 
                    padding: 10px; 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid rgba(255,255,255,0.1); 
                    border-radius: 5px; 
                    color: #fff;
                    margin-bottom: 10px;
                    box-sizing: border-box;
                }
                h1 { font-size: 32px; font-weight: 300; margin-bottom: 30px; color: #007acc; }
                h2 { font-size: 18px; margin-top: 0; opacity: 0.8; }
                .provider-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                button {
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                button:hover { background: #005fb8; }
                .delete-btn { background: #d73a49; margin-left: 10px; }
                .delete-btn:hover { background: #b31d28; }
                a { color: #58a6ff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Nyx Manager</h1>
                
                <div class="glass-card">
                    <h2>Gestión de Inteligencias Artificiales</h2>
                    <p>Configura tus API Keys para activar los modelos en el chat de Nyx.</p>
                    
                    <div class="provider-grid">
                        <div class="provider-item">
                            <label>Groq (Ultra-Fast LPU) ${keysStatus.groq ? '<span class="status-badge">✅ Configurada</span>' : ''}</label>
                            <p style="font-size: 10px; margin: 0; opacity: 0.6;">Consigue tu llave en <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a></p>
                            <input type="password" id="groq-key" placeholder="Pega tu llave de groq.com aquí...">
                            <div>
                                <button onclick="save('groq', 'groq-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('groq')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>Google (Gemini) ${keysStatus.gemini ? '<span class="status-badge">✅ Configurada</span>' : ''}</label>
                            <input type="password" id="gemini-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('gemini-pro', 'gemini-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('gemini-pro')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>𝕏 (Grok-1) ${keysStatus.grok ? '<span class="status-badge">✅ Configurada</span>' : ''}</label>
                            <input type="password" id="grok-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('grok-1', 'grok-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('grok-1')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>OpenAI (GPT-4o) ${keysStatus.gpt4 ? '<span class="status-badge">✅ Configurada</span>' : ''}</label>
                            <input type="password" id="gpt-key" placeholder="Pega tu llave aquí...">
                            <div>
                                <button onclick="save('gpt-4o', 'gpt-key')">Guardar</button>
                                <button class="delete-btn" onclick="del('gpt-4o')">Limpiar</button>
                            </div>
                        </div>

                        <div class="provider-item">
                            <label>Anthropic (Claude) ${keysStatus.claude ? '<span class="status-badge">✅ Configurada</span>' : ''}</label>
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
                }

                function del(provider) {
                    vscode.postMessage({ command: 'deleteKey', provider });
                }
            </script>
        </body>
        </html>`;
    }
}
