import * as vscode from 'vscode';

export class GhostFileSystemProvider implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    private _files = new Map<string, Uint8Array>();

    watch(_uri: vscode.Uri, _options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
        return new vscode.Disposable(() => { });
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const file = this._files.get(uri.path);
        if (!file) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return {
            type: vscode.FileType.File,
            ctime: Date.now(),
            mtime: Date.now(),
            size: file.length
        };
    }

    readDirectory(_uri: vscode.Uri): [string, vscode.FileType][] {
        return [];
    }

    createDirectory(_uri: vscode.Uri): void {
        throw vscode.FileSystemError.NoPermissions('Ghost files are flat.');
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const file = this._files.get(uri.path);
        if (!file) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return file;
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, _options: { readonly create: boolean; readonly overwrite: boolean }): void {
        this._files.set(uri.path, content);
        this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
    }

    delete(uri: vscode.Uri, _options: { readonly recursive: boolean }): void {
        this._files.delete(uri.path);
        this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
    }

    rename(_oldUri: vscode.Uri, _newUri: vscode.Uri, _options: { readonly overwrite: boolean }): void {
        throw vscode.FileSystemError.NoPermissions();
    }
}
