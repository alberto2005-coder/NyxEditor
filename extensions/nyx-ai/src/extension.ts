import * as vscode from 'vscode';
import { ChatWebviewProvider } from './ChatWebviewProvider.js';
import { NyxManagerProvider } from './NyxManagerProvider.js';

export function activate(context: vscode.ExtensionContext) {
    const chatProvider = new ChatWebviewProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatWebviewProvider.viewType, chatProvider)
    );

    const refreshModels = async () => {
        const models = [];

        // 1. Google Gemini
        const geminiKey = await context.secrets.get('google');
        if (geminiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
                const result: any = await response.json();
                if (result.models) {
                    result.models.forEach((m: any) => {
                        if (m.name.includes('gemini')) {
                            const id = m.name.split('/').pop();
                            models.push({ id: `google:${id}`, label: `${m.displayName || id} (Google)` });
                        }
                    });
                }
            } catch (e) {}
        }

        // 2. OpenAI
        const openaiKey = await context.secrets.get('openai');
        if (openaiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${openaiKey}` }
                });
                const result: any = await response.json();
                if (result.data) {
                    result.data.forEach((m: any) => {
                        if (m.id.startsWith('gpt') || m.id.includes('openai')) {
                            models.push({ id: `openai:${m.id}`, label: `${m.id} (OpenAI)` });
                        }
                    });
                }
            } catch (e) {}
        }

        // 3. xAI (Grok)
        const grokKey = await context.secrets.get('grok-1');
        if (grokKey) {
            try {
                const response = await fetch('https://api.x.ai/v1/models', {
                    headers: { 'Authorization': `Bearer ${grokKey}` }
                });
                const result: any = await response.json();
                if (result.data) {
                    result.data.forEach((m: any) => {
                        models.push({ id: `grok:${m.id}`, label: `${m.id} (Grok)` });
                    });
                }
            } catch (e) {}
        }

        // 4. Groq
        const groqKey = await context.secrets.get('groq');
        if (groqKey) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${groqKey}` }
                });
                const result: any = await response.json();
                if (result.data) {
                    result.data.forEach((m: any) => {
                        models.push({ id: `groq:${m.id}`, label: `${m.id} (Groq)` });
                    });
                }
            } catch (e) {}
        }

        // 5. Anthropic (Claude) - Mantenemos estático si hay llave
        const claudeKey = await context.secrets.get('claude-3-5');
        if (claudeKey) {
            models.push({ id: 'anthropic:claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Anthropic)' });
        }

        chatProvider.updateAvailableModels(models);
    };

    // Comando para abrir el Manager
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.openManager', () => {
            NyxManagerProvider.createOrShow(context.extensionUri, context);
        })
    );

    // Comando para refrescar modelos
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.refreshModels', refreshModels)
    );

    // Refrescar al inicio
    refreshModels();

    // Comando para el Sandbox
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.createGhostSandbox', () => {
            vscode.window.showInformationMessage('Creando Sandbox de Nyx...');
            // Lógica del sandbox
        })
    );

    // Registrar comando para que nyx-viz pueda comunicarse si lo necesita
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-ai.updateModels', (models: any) => {
            chatProvider.updateAvailableModels(models);
        })
    );
}

export function deactivate() {}
