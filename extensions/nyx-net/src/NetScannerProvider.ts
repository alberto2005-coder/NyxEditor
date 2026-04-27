import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NetScannerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nyx-net-sentinel';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            if (data.command === 'testRoute') {
                try {
                    const response = await fetch(data.url, {
                        method: data.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: data.method !== 'GET' ? JSON.stringify({}) : undefined
                    });
                    const result = await response.text();
                    webviewView.webview.postMessage({ command: 'testResult', result, status: response.status });
                } catch (e: any) {
                    webviewView.webview.postMessage({ command: 'testResult', result: e.message, status: 'ERR' });
                }
            }
        });

        // Iniciar bucle de escaneo pasivo
        this._startPassiveMonitoring();
    }

    private async _startPassiveMonitoring() {
        while (true) {
            if (this._view?.visible) {
                const ports = await this._detectActivePorts();
                const routes = await this._scanCodeForRoutes();
                this._view.webview.postMessage({ command: 'update', ports, routes });
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    private async _detectActivePorts() {
        const targetPorts = [3000, 3333, 5000, 5500, 8000, 8080];
        const active: number[] = [];
        
        try {
            // Comando para Windows (netstat)
            const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
            targetPorts.forEach(p => {
                if (stdout.includes(`:${p}`)) active.push(p);
            });
        } catch (e) {}
        
        return active;
    }

    private async _scanCodeForRoutes() {
        const routes: { method: string, path: string }[] = [];
        const editor = vscode.window.activeTextEditor;
        if (!editor) return routes;

        const content = editor.document.getText();
        
        // Regex para Express/Node
        const expressRegex = /app\.(get|post|put|delete)\(['"](.*?)['"]/g;
        let match;
        while ((match = expressRegex.exec(content)) !== null) {
            routes.push({ method: match[1].toUpperCase(), path: match[2] });
        }

        // Regex para FastAPI/Python
        const fastApiRegex = /@app\.(get|post|put|delete)\(["'](.*?)["']/g;
        while ((match = fastApiRegex.exec(content)) !== null) {
            routes.push({ method: match[1].toUpperCase(), path: match[2] });
        }

        return routes;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', sans-serif; padding: 15px; }
                .port-badge { background: #238636; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-right: 5px; }
                .route-item { 
                    background: rgba(255,255,255,0.03); 
                    border: 1px solid rgba(255,255,255,0.1);
                    margin-bottom: 8px;
                    padding: 8px;
                    border-radius: 5px;
                    font-size: 11px;
                }
                .method { font-weight: bold; margin-right: 8px; width: 45px; display: inline-block; }
                .GET { color: #3fb950; }
                .POST { color: #d29922; }
                .DELETE { color: #f85149; }
                button { background: #007acc; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; float: right; font-size: 10px; }
                #result-panel { margin-top: 20px; font-family: monospace; font-size: 10px; background: #000; padding: 10px; border-radius: 5px; max-height: 200px; overflow: auto; display: none; }
                .status-line { color: #58a6ff; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 3px; }
            </style>
        </head>
        <body>
            <h2 style="font-size: 14px; color: #58a6ff;">📡 Nyx Net Sentinel</h2>
            <div id="active-ports" style="margin-bottom: 15px;"></div>
            
            <h3 style="font-size: 12px; opacity: 0.7;">Endpoints Detectados</h3>
            <div id="routes-container"></div>

            <div id="result-panel">
                <div class="status-line" id="res-status"></div>
                <div id="res-body"></div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentPorts = [];

                window.addEventListener('message', event => {
                    const data = event.data;
                    if (data.command === 'update') {
                        currentPorts = data.ports;
                        const portDiv = document.getElementById('active-ports');
                        portDiv.innerHTML = data.ports.length > 0 
                            ? 'Activo en: ' + data.ports.map(p => '<span class="port-badge">:' + p + '</span>').join('')
                            : '<span style="opacity:0.5; font-size:10px;">⏳ Esperando servidor...</span>';

                        const routeDiv = document.getElementById('routes-container');
                        routeDiv.innerHTML = data.routes.map(r => \`
                            <div class="route-item">
                                <span class="method \${r.method}">\${r.method}</span>
                                <span style="opacity: 0.8;">\${r.path}</span>
                                \${data.ports.length > 0 ? \`<button onclick="test('\${r.method}', \${data.ports[0]}, '\${r.path}')">Probar</button>\` : ''}
                            </div>
                        \`).join('');
                    }
                    if (data.command === 'testResult') {
                        const panel = document.getElementById('result-panel');
                        panel.style.display = 'block';
                        document.getElementById('res-status').innerText = 'STATUS: ' + data.status;
                        document.getElementById('res-body').innerText = data.result;
                    }
                });

                function test(method, port, path) {
                    const url = 'http://localhost:' + port + path;
                    vscode.postMessage({ command: 'testRoute', method, url });
                }
            </script>
        </body>
        </html>`;
    }
}
