import * as vscode from 'vscode';
import { ChatWebviewProvider } from './ChatWebviewProvider';
import { GhostFileSystemProvider } from './GhostFileSystemProvider';
import { ZenAudioService } from './ZenAudioService';
import { NyxManagerProvider } from './NyxManagerProvider';

export function activate(context: vscode.ExtensionContext) {
	// Registrar Nyx Manager
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.openManager', () => {
            NyxManagerProvider.open(context.extensionUri, context);
        })
    );

    // Refrescar modelos en el chat
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.refreshModels', async () => {
            if (chatProvider) {
                const providers = ['gemini-pro', 'claude-3-5', 'grok-1', 'gpt-4o'];
                const availableModels = [];
                for (const p of providers) {
                    const key = await context.secrets.get(p);
                    if (key) availableModels.push(p);
                }
                chatProvider.updateAvailableModels(availableModels);
            }
        })
    );

    const chatProvider = new ChatWebviewProvider(context.extensionUri, context);

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
			// Simulación de optimización: quitar comentarios (regex simple)
			const optimized = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
			vscode.window.showInformationMessage('Contexto optimizado: Comentarios eliminados para ahorrar tokens.');
			// Aquí podrías reemplazar el texto o simplemente guardarlo para la siguiente petición
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
