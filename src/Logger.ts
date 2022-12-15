import * as vscode from 'vscode';
let outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel("Hubitat");

//Simple logging abstraction for now
export class Logger {
    debug(message: string | undefined) {
        this.log("debug", message);
    }
    info(message: string | undefined) {
        this.log("info", message);
    }
    warn(message: string | undefined) {
        this.log("warn", message);
    }
    error(message: string | undefined, error: any) {
        this.log("error", message + error.message);
        if (error instanceof Error) {
            this.log("error", error.message);
        }
    }
    private log(level: string, message: string | undefined) {
        const timestamp: string = new Date().toISOString();
        outputChannel.appendLine(`[${level}] ${timestamp}] ${message}`);
    }
}

export const logger = new Logger();
