import * as vscode from 'vscode';

export class ZenAudioService {
    private _currentAudio: string = '';

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.updateAudioForLanguage(editor.document.languageId);
            }
        });
    }

    public updateAudioForLanguage(langId: string) {
        let profile = 'light-ambient';
        if (['cpp', 'c', 'rust', 'go'].includes(langId)) {
            profile = 'industrial-machine';
        } else if (['python', 'java'].includes(langId)) {
            profile = 'minimalist-pulse';
        }

        if (profile !== this._currentAudio) {
            this._currentAudio = profile;
            vscode.window.showInformationMessage(`Zen Pro: Cambiando atmósfera a ${profile} (Simulado)`);
            // Aquí se dispararía el audio real en un webview oculto
        }
    }
}
