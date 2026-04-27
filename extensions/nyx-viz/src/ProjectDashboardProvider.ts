import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';

export class ProjectDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nyx-project-dashboard';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public static async open(extensionUri: vscode.Uri) {
        const panel = vscode.window.createWebviewPanel(
            this.viewType,
            'Nyx Dashboard: Centro de Mando',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        const instance = new ProjectDashboardProvider(extensionUri);
        const data = await instance._gatherProjectData();
        panel.webview.html = instance._getHtmlForWebview(panel.webview, data);
    }

    public async resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        const data = await this._gatherProjectData();
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, data);
    }

    private async _gatherProjectData() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return { nodes: [], edges: [], tasks: [], hotZones: [] };

        const rootUri = workspaceFolders[0].uri;
        const nodes: any[] = [];
        const edges: any[] = [];
        const tasks: any[] = [];
        const hotZones: any[] = [];

        try {
            const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
            
            for (const file of files) {
                const relPath = vscode.workspace.asRelativePath(file);
                nodes.push({ id: relPath, label: path.basename(relPath), group: path.extname(relPath) });

                try {
                    const content = Buffer.from(await vscode.workspace.fs.readFile(file)).toString();
                    const importRegex = /import.*?from\s+['"](.*?)['"]|require\(['"](.*?)['"]\)/g;
                    let match;
                    while ((match = importRegex.exec(content)) !== null) {
                        const target = match[1] || match[2];
                        if (target && !target.startsWith('.')) continue;
                        edges.push({ from: relPath, to: target });
                    }

                    const taskRegex = /\/\/\s*(TODO|BUG|FIXME):\s*(.*)/g;
                    while ((match = taskRegex.exec(content)) !== null) {
                        tasks.push({ type: match[1], text: match[2], file: relPath });
                    }
                } catch (e) {}
            }

            try {
                const gitLog = execSync('git log --pretty=format: --name-only --since="7 days ago"', { cwd: rootUri.fsPath }).toString();
                const counts: { [key: string]: number } = {};
                gitLog.split('\n').filter((f: string) => f.trim()).forEach((f: string) => {
                    counts[f] = (counts[f] || 0) + 1;
                });
                
                Object.keys(counts).forEach(f => {
                    if (counts[f] > 2) hotZones.push({ file: f, commits: counts[f] });
                });
                hotZones.sort((a, b) => b.commits - a.commits);
            } catch (e) {}
        } catch (e) {}

        return { nodes, edges, tasks, hotZones };
    }

    private _getHtmlForWebview(webview: vscode.Webview, data: any) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
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
            <h1>Nyx Dashboard</h1>
            <div class="grid">
                <div class="glass" id="network"></div>
                <div class="sidebar-section glass">
                    <h2>Tareas</h2>
                    ${data.tasks.map((t: any) => `<div class="task-item task-${t.type}">${t.type}: ${t.text}</div>`).join('')}
                </div>
                <div class="sidebar-section glass">
                    <h2>Hot Zones</h2>
                    ${data.hotZones.map((h: any) => `<div class="hot-item"><span>${h.file.split('/').pop()}</span><span class="badge">${h.commits}</span></div>`).join('')}
                </div>
            </div>
            <script>
                const data = ${JSON.stringify(data)};
                const container = document.getElementById('network');
                const visData = { nodes: new vis.DataSet(data.nodes), edges: new vis.DataSet(data.edges) };
                const options = {
                    nodes: { shape: 'dot', size: 8, font: { color: '#c9d1d9', size: 8 } },
                    edges: { arrows: 'to', color: 'rgba(255,255,255,0.1)' },
                    physics: { stabilization: true }
                };
                new vis.Network(container, visData, options);
            </script>
        </body>
        </html>`;
    }
}
