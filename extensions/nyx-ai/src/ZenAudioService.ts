import * as vscode from 'vscode';

export class ZenAudioService {
    private static _panel: vscode.WebviewPanel | undefined;

    public static play(mode: string) {
        if (!this._panel) {
            this._panel = vscode.window.createWebviewPanel(
                'zenAudio',
                'Zen Audio',
                { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
                { enableScripts: true }
            );
            // Hacerlo invisible (o al menos no molesto)
            this._panel.reveal(vscode.ViewColumn.Two, true);
        }

        const audioUrl = this._getAudioUrl(mode);
        
        this._panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <body>
                <audio id="player" autoplay loop src="${audioUrl}"></audio>
                <script>
                    const player = document.getElementById('player');
                    player.volume = 0.3;
                    console.log('Reproduciendo atmósfera: ${mode}');
                </script>
            </body>
            </html>
        `;

        vscode.window.showInformationMessage(`Nyx Zen: Atmósfera de ${mode} activada.`);
    }

    private static _getAudioUrl(mode: string): string {
        // Enlaces a sonidos de ambiente relajantes (puedes cambiarlos por archivos locales luego)
        switch (mode) {
            case 'rain': return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Placeholder por ahora
            case 'forest': return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
            default: return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3';
        }
    }

    public static stop() {
        if (this._panel) {
            this._panel.dispose();
            this._panel = undefined;
            vscode.window.showInformationMessage('Nyx Zen: Modo silencio activado.');
        }
    }
}
