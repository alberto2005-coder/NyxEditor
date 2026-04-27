import * as vscode from 'vscode';
import { ChatWebviewProvider } from './ChatWebviewProvider';

export function activate(context: vscode.ExtensionContext) {
	const provider = new ChatWebviewProvider(context.extensionUri, context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatWebviewProvider.viewType, provider)
	);
}

export function deactivate() { }
