import * as vscode from 'vscode';
import path = require("path");
import { CodeType } from './ConfigManager';

export interface SourceCodeInfo {
    codeType?: CodeType;
    name?: string;
    namespace?: string;

}

export function getFilename(document: vscode.TextDocument): string {
    return document?.fileName.substring(document?.fileName.lastIndexOf(path.sep) + 1);
}
export function isLoginRedirect(url?: string): boolean {
    return (url && url.includes("loginRedirect")) || false;
}
export function determineCodeTypeByContent(sourceText: string): SourceCodeInfo | undefined {
    const driverMatchEx = /^\s*metadata\s*{/gm;
    const appMatchEx = /^\s*definition\s*\(/mg;
    const libMatchEx = /^\s*library\s*\(/mg;

    if (driverMatchEx.exec(sourceText)) {
        return { codeType: CodeType.driver };
    }
    else if (appMatchEx.exec(sourceText)) {
        return { codeType: CodeType.app };
    }
    else if (libMatchEx.exec(sourceText)) {
        return { codeType: CodeType.library };
    }
    return undefined;
}