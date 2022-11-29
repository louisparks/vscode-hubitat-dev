'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HubitatClient, PublishStatus } from './hubitat';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "hubitat-dev" is now active!');

	let disposable = vscode.commands.registerCommand('hubitat-dev.publish', (uri: vscode.Uri) => {
		publish(context);
	});
	let disposable2 = vscode.commands.registerCommand('hubitat-dev.clearConfig', (uri: vscode.Uri) => {
		context.workspaceState.update("hubitatHostname", null);
	});

	context.subscriptions.push(disposable, disposable2);
}

async function publish(context: vscode.ExtensionContext) {
	const document = vscode.window.activeTextEditor?.document;

	let host = context.workspaceState.get("hubitatHostname") as string | null;
	if (!host) {
		host = await promptUserForHubitatHostname();
		if (host) {
			context.workspaceState.update("hubitatHostname", host);
		}
	}

	if (document?.isDirty) {
		await document.save();
		console.log(`file saved ${!document?.isDirty}`);
	}

	const documentPath = document?.uri.path!;

	const message = vscode.window.showInformationMessage(`Publishing to hubitat file  ${documentPath}`);
	const hubitat = new HubitatClient(host!);
	const result = await hubitat.publish(833, documentPath);
	if (result.status === PublishStatus.success) {
		vscode.window.showInformationMessage(`Success ${documentPath}`);
	} else {
		vscode.window.showErrorMessage(`Failed to publich to hubitat ${document?.uri.path}`);
	}

}

async function promptUserForHubitatHostname(): Promise<string | null> {
	const hubitatHostInput = await vscode.window.showInputBox({
		title: "Hubitat IP Address",
		placeHolder: "IP address or hostname (ex.. 192.168.1.23)",
		prompt: "Please enter Hubitat host or IP address",
	});
	if (!hubitatHostInput) {
		vscode.window.showErrorMessage('Hubitat address required, action aborted');
		return null;
	} else {
		return hubitatHostInput;
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
