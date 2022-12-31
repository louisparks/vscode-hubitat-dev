'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as utils from './Utils';
import { CodeType, HubitatCodeFile, HubitatConfigManager } from './ConfigManager';
import { HubConnectionStatus, HubitatClient, PublishErrorReason, PublishStatus } from './HubitatClient';
import { logger } from './Logger';

let hubitatStatusBarItem: vscode.StatusBarItem;
let configManager: HubitatConfigManager;
let hubitatClient: HubitatClient;

const OVERWRITE_MESSAGE = "Overwrite on Hubitat";
const CANCEL_MESSAGE = "Do nothing";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  logger.info('hubitat-developement extension is now active!!');

  context.subscriptions.push(vscode.commands.registerCommand('hubitat-dev.publish', (uri: vscode.Uri) => {
    publish(context);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('hubitat-dev.clearConfig', (resource) => {
    configManager.clear();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('hubitat-dev.checkHubConnection', async (resource) => {
    const result = await hubitatClient.checkHubConnection();
    if (result.status === HubConnectionStatus.success) {
      vscode.window.showInformationMessage(`successfully connected to hub ${result.hubData?.name} at ${result.hubData?.ipAddress}`);
    }
    else {
      vscode.window.showErrorMessage(`error connecting to hub at ${configManager.getActiveHubInfo().host} reason ${result.reason}`);
    }
    logger.info("checking hub connection" + JSON.stringify(result));
  }));

  vscode.workspace.onDidChangeConfiguration(event => {
    logger.info("detected settings changes reloading clients");
    initClients(context);
  });
  initClients(context);

}
function initClients(context: vscode.ExtensionContext) {
  configManager = new HubitatConfigManager(context);
  hubitatClient = new HubitatClient(configManager);
  configureStatusBar(context);
}

function configureStatusBar(context: vscode.ExtensionContext) {
  hubitatStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
  context.subscriptions.push(hubitatStatusBarItem);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
  updateStatusBarItem();
}

async function updateStatusBarItem() {
  if (!vscode.window.activeTextEditor?.document.uri.fsPath.endsWith(".groovy")) {
    hubitatStatusBarItem.hide();
    return;
  }
  if (vscode.window.activeTextEditor?.document.uri && vscode.window.activeTextEditor?.document.uri.scheme === 'file') {
    const codeFile = await configManager.lookupCodeFile(vscode.window.activeTextEditor?.document.uri.path);
    const type = await configManager.determineCodeTypeByContent(codeFile?.filepath || vscode.window.activeTextEditor?.document.uri.path);
    hubitatStatusBarItem.text = `$(home) Hubitat ${configManager.getActiveHubInfo().host || "N/A"} ${type} ${codeFile?.id || "not published"}`;
    hubitatStatusBarItem.show();
  }
}

function statusBarStartSpinning(): void {
  hubitatStatusBarItem.text = `$(home) Hubitat Publishing $(loading~spin)`;
}


async function publish(context: vscode.ExtensionContext, force = false) {

  if (!(await hasHubConfigured())) {
    vscode.window.showErrorMessage("hub address required for publishing");
    return;
  }

  const document = vscode.window.activeTextEditor?.document;
  if (document?.isDirty) {
    await document.save();
  }
  const codeType = await configManager.determineCodeType(document?.uri.path!);

  let codeFile = await configManager.lookupCodeFile(document?.uri.path!);
  let currentFileOnHubitat = codeFile ? await hubitatClient.loadExistingCodeFromHubitat(codeFile) : undefined;

  if (!codeFile || !currentFileOnHubitat) {
    const existingId = await promptUserForFileId(codeType!);
    if (existingId === undefined) {
      return;
    }
    else if (existingId > 0) {
      codeFile = { filepath: document?.uri.path!, id: existingId, codeType: codeType };
      currentFileOnHubitat = await hubitatClient.loadExistingCodeFromHubitat(codeFile);
      force = true;
    }
  }
  if (codeFile && currentFileOnHubitat) {
    await callWithSpinner(async () => {
      await publishExistingFile(codeFile!, force);
    });
  }
  else {
    await callWithSpinner(async () => {
      await addNewCodeFile(document!);
    });
  }
}

async function addNewCodeFile(document: vscode.TextDocument) {
  const documentPath = document.uri.path;
  let newCodeFile = { filepath: documentPath, source: document?.getText(), codeType: await configManager.determineCodeType(documentPath) };
  const result = await (hubitatClient.createNewCodeOnHubitat(newCodeFile));
  if (result.status === PublishStatus.success) {
    vscode.window.showInformationMessage(`Hubitat - Created new ${result.codeFile.codeType} for ${utils.getFilename(document)} [${result.codeFile.id}]`);
    await configManager.saveCodeFile(result.codeFile);
  } else {
    vscode.window.showErrorMessage(`Hubitat - Error publishing file ${utils.getFilename(document)} [${result.errorMessage}]`);
  }
}

async function publishExistingFile(codeFile: HubitatCodeFile, force: boolean) {
  const filename = utils.getFilename(vscode.window.activeTextEditor?.document!);

  const result = await hubitatClient.publish(codeFile, force);
  if (result.status === PublishStatus.success) {
    const message = `Hubitat - Successfully published ${filename}`;
    vscode.window.showInformationMessage(message);
    configManager.saveCodeFile(result.codeFile);
  } else {
    logger.warn(`failed to publish ${filename}\n${result.errorMessage}`);
    if (result.errorReason === PublishErrorReason.duplicate) {
      let override = await vscode.window.showErrorMessage(`Failed to publish to hubitat ${filename}`, { modal: true, detail: result.errorMessage }, CANCEL_MESSAGE, OVERWRITE_MESSAGE);
      if (override === OVERWRITE_MESSAGE) {
        publishExistingFile(codeFile, true);
      }
    } else {
      vscode.window.showErrorMessage(`Failed to publish to hubitat ${filename}\n${result.errorMessage}`);
    }
  }

}

async function callWithSpinner(callback: Function) {
  statusBarStartSpinning();
  try {
    return await callback();
  }
  catch (error) {
    logger.error("Unknonwn error occured ", error);
  }
  finally {
    updateStatusBarItem();
  }
}

async function hasHubConfigured(): Promise<boolean> {
  let host = configManager.getActiveHubInfo().host;
  if (!host) {
    host = await promptUserForHubitatHostname();
    if (host) {
      configManager.setActiveHub(host);
      return true;
    }
  }
  return host ? true : false;
}

async function promptUserForHubitatHostname(): Promise<string | undefined> {
  const hubitatHostInput = await vscode.window.showInputBox({
    title: "Hubitat IP Address",
    placeHolder: "IP address or hostname (ex.. 192.168.1.23)",
    prompt: "Please enter Hubitat hostname or IP address",
  });
  return hubitatHostInput;
}

export async function promptUserForFileId(codeType: CodeType): Promise<number | undefined> {
  if (codeType) {
    const result = await vscode.window.showInputBox({
      value: undefined,
      title: `You have not published this ${codeType} before. If it already exists, you may enter the id below, this will overwrite existing ${codeType}`,
      placeHolder: `empty to create a new ${codeType}`,
      ignoreFocusOut: true,
      validateInput: text => {
        return isNaN(Number(text)) ? 'Invalid Id' : null;
      }
    });
    if (result === undefined) {
      return undefined;
    }
    return Number(result);
  } else {
    vscode.window.showErrorMessage(`Unable to determine file type (app,driver,library)`);
  }
}

export function deactivate() {
  logger.info("Hubitat Extension Deactivated");
}
