import * as vscode from 'vscode';
import path = require("path");

export function getFilename(document: vscode.TextDocument): string {
    return document?.fileName.substring(document?.fileName.lastIndexOf(path.sep) + 1);
}