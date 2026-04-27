import * as vscode from 'vscode';
import { ProjectDashboardProvider } from './ProjectDashboardProvider.js';

export function activate(context: vscode.ExtensionContext) {
    const dashboardProvider = new ProjectDashboardProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ProjectDashboardProvider.viewType, dashboardProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-viz.openDashboard', () => {
            ProjectDashboardProvider.open(context.extensionUri);
        })
    );

    // El "Puente": Permitir que nyx-ai pida datos del proyecto
    context.subscriptions.push(
        vscode.commands.registerCommand('nyx-viz.getProjectData', async () => {
            return await (ProjectDashboardProvider as any)._gatherProjectData();
        })
    );
}

export function deactivate() {}
