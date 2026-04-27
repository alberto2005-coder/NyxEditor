import * as vscode from 'vscode';
import { ChatWebviewProvider } from './ChatWebviewProvider';
import { GhostFileSystemProvider } from './GhostFileSystemProvider';
import { ZenAudioService } from './ZenAudioService';
import { NyxManagerProvider } from './NyxManagerProvider';

export function activate(context: vscode.ExtensionContext) {
    const chatProvider = new ChatWebviewProvider(context.extensionUri, context);

	// Registrar Nyx Manager
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.openManager', () => {
            NyxManagerProvider.open(context.extensionUri, context);
        })
    );

    // Refrescar modelos en el chat
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.refreshModels', async () => {
            const providers = ['groq', 'gemini-pro', 'claude-3-5', 'gpt-4o'];
            const availableModels: {id: string, label: string}[] = [];

            for (const p of providers) {
                const key = await context.secrets.get(p);
                if (key) {
                    if (p === 'groq') {
                        try {
                            const resp = await fetch('https://api.groq.com/openai/v1/models', {
                                headers: { 'Authorization': `Bearer ${key}` }
                            });
                            const data: any = await resp.json();
                            if (data.data) {
                                data.data.forEach((m: any) => {
                                    availableModels.push({ id: `groq:${m.id}`, label: `Groq: ${m.id}` });
                                });
                            }
                        } catch (e) {
                            availableModels.push({ id: 'groq:llama-3.3-70b-versatile', label: 'Groq: Llama 3.3 (Backup)' });
                        }
                    } else {
                        availableModels.push({ id: p, label: p.toUpperCase() });
                    }
                }
            }
            chatProvider.updateAvailableModels(availableModels);
        })
    );

	// Token Meter Status Bar Item
	const tokenMeter = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	tokenMeter.text = `$(pulse) Nyx AI: 0 tokens`;
	tokenMeter.tooltip = 'Uso de tokens en la última petición. Haz clic para optimizar contexto.';
	tokenMeter.command = 'nyx-ai.optimizeContext';
	tokenMeter.show();
	context.subscriptions.push(tokenMeter);

	// Comando para optimizar contexto
	const optimizeCmd = vscode.commands.registerCommand('nyx-ai.optimizeContext', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const text = editor.document.getText();
			const optimized = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
			vscode.window.showInformationMessage('Contexto optimizado: Comentarios eliminados para ahorrar tokens.');
		}
	});
	context.subscriptions.push(optimizeCmd);

	// Ghost File System
	const ghostFS = new GhostFileSystemProvider();
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('ghost', ghostFS, { isCaseSensitive: true }));

	const ghostCmd = vscode.commands.registerCommand('nyx-ai.createGhostSandbox', async () => {
		const uri = vscode.Uri.parse('ghost:/sandbox.js');
		const content = Buffer.from('// Nyx Ghost Sandbox\n// Este archivo no existe en el disco.\nconsole.log("Hola desde el limbo!");\n');
		ghostFS.writeFile(uri, content, { create: true, overwrite: true });

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc, { preview: false });
		vscode.window.showInformationMessage('Ghost Sandbox generado. Puedes probar código aquí sin miedo.');
	});
	context.subscriptions.push(ghostCmd);

	// Zen Audio Service
	const zenAudio = new ZenAudioService();
	context.subscriptions.push(vscode.commands.registerCommand('nyx-ai.toggleZenAudio', () => {
		vscode.window.showInformationMessage('Zen Pro Audio: Alternando música de ambiente.');
	}));

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatWebviewProvider.viewType, chatProvider)
	);

    // Iniciar medidor y refrescar modelos
    chatProvider.setTokenMeter(tokenMeter);
    vscode.commands.executeCommand('nyx-ai.refreshModels');
}

export function deactivate() { }
