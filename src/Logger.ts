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
        this.log("error", message + error.message);
        if (error instanceof Error) {
            this.log("error", error.message);
        }
    }
    private log(level: string, message: string) {
        const timestamp: string = new Date().toISOString()
        outputChannel.appendLine(`[${level}] ${timestamp}] ${message}`);
    }
}

export const logger = new Logger();
