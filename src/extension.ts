'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HubitatConfigManager } from './config';
import { HubitatClient, PublishStatus } from './hubitat';

let hubitatStatusBarItem: vscode.StatusBarItem;
let configManager: HubitatConfigManager;

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

  const myCommandId = 'sample.showSelectionCount';
  context.subscriptions.push(vscode.commands.registerCommand(myCommandId, () => {
    publish(context);
  }));
  configManager = new HubitatConfigManager(context);

  //status bar
  hubitatStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
  hubitatStatusBarItem.command = myCommandId;
  context.subscriptions.push(hubitatStatusBarItem);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
  updateStatusBarItem();
}

function updateStatusBarItem(): void {
  const codeFile = configManager.lookupCodeFile(vscode.window.activeTextEditor?.document.uri.path!);
  hubitatStatusBarItem.text = `$(home) Hubitat ${configManager.getActiveHub()} id ${codeFile?.id}`;
  hubitatStatusBarItem.show();
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
  }
  let configManager = new HubitatConfigManager(context);

  const documentPath = document?.uri.path!;

  const message = vscode.window.showInformationMessage(`publishing file to hubitat [${documentPath}]`);
  const hubitat = new HubitatClient(host!);
  let codeFile = configManager.lookupCodeFile(documentPath);
  if (!codeFile?.id) {
    const id = await promptUserForFileId();
    codeFile!.id = Number(id);
  }



  const result = await hubitat.publish(codeFile!);
  if (result.status === PublishStatus.success) {
    const header = `Success ${documentPath}`;
    //const options: vscode.MessageOptions = { detail: 'Message Description', modal: true };
    const selection = await vscode.window.showInformationMessage(header);
    configManager.saveCodeFile(result.codeFile);
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
async function promptUserForFileId(): Promise<number | null> {
  const idInput = await vscode.window.showInputBox({
    title: "Source Code ID",
    placeHolder: "ID assigned to the code file",
    prompt: "Please enter the id of the codefile",
    ignoreFocusOut: true
  });
  if (!idInput || isNaN(Number(idInput))) {
    vscode.window.showErrorMessage('file id not valid, action aborted');
    return null;
  } else {
    return Number(idInput);
  }
}



// This method is called when your extension is deactivated
export function deactivate() { }
