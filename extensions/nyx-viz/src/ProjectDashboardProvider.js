"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDashboardProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class ProjectDashboardProvider {
    _extensionUri;
    static viewType = 'nyx-project-dashboard';
    _view;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    static async open(extensionUri) {
        const panel = vscode.window.createWebviewPanel(this.viewType, 'Nyx Dashboard: Centro de Mando', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        const instance = new ProjectDashboardProvider(extensionUri);
        const data = await instance._gatherProjectData();
        panel.webview.html = instance._getHtmlForWebview(panel.webview, data);
    }
    async resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        const data = await this._gatherProjectData();
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, data);
    }
    async _gatherProjectData() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return { nodes: [], edges: [], tasks: [], hotZones: [] };
        const rootUri = workspaceFolders[0].uri;
        const nodes = [];
        const edges = [];
        const tasks = [];
        const hotZones = [];
        try {
            const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
            // LÍMITE DE SEGURIDAD: Solo graficar los primeros 100 archivos para evitar cuelgues
            // Pero seguimos buscando TAREAS en todos.
            const graphLimit = 100;
            let graphCount = 0;
            for (const file of files) {
                const relPath = vscode.workspace.asRelativePath(file);
                if (graphCount < graphLimit) {
                    nodes.push({ id: relPath, label: path.basename(relPath), group: path.extname(relPath) });
                    graphCount++;
                }
                try {
                    const content = Buffer.from(await vscode.workspace.fs.readFile(file)).toString();
                    if (graphCount <= graphLimit) {
                        const importRegex = /import.*?from\s+['"](.*?)['"]|require\(['"](.*?)['"]\)/g;
                        let match;
                        while ((match = importRegex.exec(content)) !== null) {
                            const target = match[1] || match[2];
                            if (target && !target.startsWith('.'))
                                continue;
                            edges.push({ from: relPath, to: target });
                        }
                    }
                    const taskRegex = /\/\/\s*(TODO|BUG|FIXME):\s*(.*)/g;
                    let taskMatch;
                    while ((taskMatch = taskRegex.exec(content)) !== null) {
                        tasks.push({ type: taskMatch[1], text: taskMatch[2], file: relPath });
                    }
                }
                catch (e) { }
            }
            try {
                const gitLog = (0, child_process_1.execSync)('git log --pretty=format: --name-only --since="7 days ago"', { cwd: rootUri.fsPath }).toString();
                const counts = {};
                gitLog.split('\n').filter((f) => f.trim()).forEach((f) => {
                    counts[f] = (counts[f] || 0) + 1;
                });
                Object.keys(counts).forEach(f => {
                    if (counts[f] > 2)
                        hotZones.push({ file: f, commits: counts[f] });
                });
                hotZones.sort((a, b) => b.commits - a.commits);
            }
            catch (e) { }
        }
        catch (e) { }
        return { nodes, edges, tasks, hotZones };
    }
    _getHtmlForWebview(webview, data) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'unsafe-inline' https://unpkg.com; img-src ${webview.cspSource} https:; connect-src https://unpkg.com;">
            <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
            <style>
                body { background-color: #0d1117; color: #c9d1d9; font-family: 'Inter', sans-serif; padding: 10px; margin: 0; }
                .grid { display: flex; flex-direction: column; gap: 10px; height: 100vh; }
                .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; }
                #network { height: 300px; width: 100%; background: #0b0e14; border-radius: 8px; }
                .sidebar-section { flex: 1; overflow-y: auto; }
                h1 { font-size: 16px; margin-bottom: 10px; color: #007acc; text-align: center; }
                h2 { font-size: 10px; text-transform: uppercase; opacity: 0.7; margin-bottom: 5px; color: #58a6ff; }
                .task-item { padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 10px; }
                .task-BUG { color: #f85149; }
                .task-TODO { color: #3fb950; }
                .hot-item { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; }
                .badge { background: #238636; padding: 1px 4px; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div id="debug-info" style="font-size: 10px; color: #f85149; padding: 10px; background: rgba(0,0,0,0.5); display: block;">
                Diagnóstico: Iniciando Dashboard... <br>
                Archivos detectados: ${data.nodes.length} <br>
                Relaciones detectadas: ${data.edges.length} <br>
                Tareas: ${data.tasks.length}
            </div>
            <h1>Nyx Dashboard</h1>
            <div class="grid">
                <div class="glass" id="network">
                    <div id="loader" style="text-align:center; padding-top: 100px; opacity: 0.5;">Cargando mapa interactivo...</div>
                </div>
                <div class="sidebar-section glass">
                    <h2>Tareas</h2>
                    ${data.tasks.map((t) => `<div class="task-item task-${t.type}">${t.type}: ${t.text}</div>`).join('')}
                </div>
            </div>
            <script>
                window.onerror = function(msg, url, line) {
                    document.getElementById('debug-info').innerHTML += '<br>ERROR JS: ' + msg + ' (Línea ' + line + ')';
                };

                setTimeout(() => {
                    if (typeof vis === 'undefined') {
                        document.getElementById('debug-info').innerHTML += '<br>⚠️ ERROR: No se pudo cargar la librería Vis.js desde internet. Verifica tu conexión o el CSP.';
                    } else {
                        document.getElementById('debug-info').innerHTML += '<br>✅ Vis.js cargada correctamente.';
                        renderGraph();
                    }
                }, 1000);

                function renderGraph() {
                    const data = ${JSON.stringify(data)};
                    const container = document.getElementById('network');
                    if (data.nodes.length === 0) {
                        container.innerHTML = '<div style="padding:20px; opacity:0.5;">No se han encontrado archivos .js o .ts para mapear.</div>';
                        return;
                    }
                    const visData = { nodes: new vis.DataSet(data.nodes), edges: new vis.DataSet(data.edges) };
                    const options = {
                        nodes: { shape: 'dot', size: 10, font: { color: '#c9d1d9', size: 9 } },
                        edges: { arrows: 'to', color: 'rgba(255,255,255,0.1)' },
                        physics: { stabilization: true }
                    };
                    try {
                        new vis.Network(container, visData, options);
                        document.getElementById('debug-info').style.display = 'none'; // Ocultar debug si todo va bien
                    } catch (e) {
                        document.getElementById('debug-info').innerHTML += '<br>Error VisNetwork: ' + e.message;
                    }
                }
            </script>
        </body>
        </html>`;
    }
}
exports.ProjectDashboardProvider = ProjectDashboardProvider;
//# sourceMappingURL=ProjectDashboardProvider.js.map