import * as vscode from 'vscode';

interface RecipeStep {
    name: string;
    command: string;
    split?: 'vertical' | 'horizontal';
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Nyx Synapse activa: Preparada para conectar tus procesos.');

    // Registro del comando de lanzamiento
    const launchCommand = vscode.commands.registerCommand('nyx-synapse.launchRecipe', async (recipeName?: string) => {
        const config = vscode.workspace.getConfiguration('nyx-synapse');
        const recipes = config.get<Record<string, RecipeStep[]>>('recipes') || {};

        if (!recipeName) {
            const names = Object.keys(recipes);
            if (names.length === 0) {
                vscode.window.showWarningMessage('No hay recetas definidas en settings.json.');
                return;
            }
            recipeName = await vscode.window.showQuickPick(names, { placeHolder: 'Selecciona una Receta de Nyx Synapse' });
        }

        if (recipeName && recipes[recipeName]) {
            await launchRecipe(recipeName, recipes[recipeName]);
        }
    });

    context.subscriptions.push(launchCommand);

    // PERSISTENCIA: Auto-lanzar receta si está configurada
    const autoLaunch = vscode.workspace.getConfiguration('nyx-synapse').get<string>('autoLaunch');
    if (autoLaunch && autoLaunch !== 'none') {
        setTimeout(() => {
            vscode.commands.executeCommand('nyx-synapse.launchRecipe', autoLaunch);
        }, 3000); // Pequeño delay para dejar que el editor respire
    }
}

async function launchRecipe(name: string, steps: RecipeStep[]) {
    vscode.window.showInformationMessage(`Interpretando receta: ${name}...`);

    let lastTerminal: vscode.Terminal | undefined;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        let terminal: vscode.Terminal;
        
        if (i === 0) {
            // La primera terminal abre el panel
            terminal = vscode.window.createTerminal({ name: step.name });
        } else {
            // Las siguientes hacen split de la anterior
            // Nota: Usamos la API de split si está disponible, o comando de workbench
            terminal = vscode.window.createTerminal({
                name: step.name,
                location: { parentTerminal: lastTerminal } as any
            });
        }

        terminal.show(true);
        if (step.command) {
            terminal.sendText(step.command);
        }
        
        lastTerminal = terminal;
        
        // Breve espera para que el layout se asiente
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Devolver el foco a la primera terminal o mantener la última
    if (lastTerminal) {
        lastTerminal.show(false);
    }
}

export function deactivate() {}
