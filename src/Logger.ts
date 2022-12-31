import * as vscode from 'vscode';
let outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel("Hubitat");

//Simple logging abstraction for now
export class Logger {
    debug(message: string) {
        this.log("debug", message);
    }
    info(message: string) {
        this.log("info", message);
    }
    warn(message: string) {
        this.log("warn", message);
    }
    error(message: string, error: any) {
        let fullMessage = message;
        if (error instanceof Error) {
            fullMessage = `${fullMessage} [${error.message}]`;
        }
        this.log("error", fullMessage);
    }
    private log(level: string, message: string) {
        const timestamp: string = new Date().toISOString();
        outputChannel.appendLine(`[${level}] ${timestamp}] ${message}`);
    }
}

export const logger = new Logger();
