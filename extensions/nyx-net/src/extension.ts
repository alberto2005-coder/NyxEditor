import * as vscode from 'vscode';
import { NetScannerProvider } from './NetScannerProvider.js';

export function activate(context: vscode.ExtensionContext) {
    const netProvider = new NetScannerProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(NetScannerProvider.viewType, netProvider)
    );

    // Notificar activación
    console.log('Nyx Net Sentinel está activo y monitorizando puertos...');
}

export function deactivate() {}
