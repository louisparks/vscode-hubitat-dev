import * as fs from 'fs';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { logger } from './Logger';

const HUBITAT_CONFIG_KEY = "hubitatConfig";
const HUB_HOSTNAME_KEY = "hubitat.hub.hostname";
const FORCE_HUBITAT_UPDATE = "hubitat.misc.overwriteHubitatVersion";
const CONFIG_FILENAME = "metadata.json";
const CONFIG_DIR = ".hubitat";


interface HubitatConfiguration {
  files: Array<HubitatCodeFile>
}

export enum CodeType {
  driver = "driver",
  app = "app",
  library = "library"
}

export interface HubitatCodeFile {
  filepath?: string;
  codeType?: CodeType;
  id?: number;
  version?: number;
  source?: string;
}

export class HubitatConfigManager {
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async load(workspaceFolder: vscode.Uri): Promise<HubitatConfiguration> {
    let workspaceFolderConfigFile = vscode.Uri.parse(workspaceFolder + '/' + CONFIG_DIR + '/' + CONFIG_FILENAME);
    if (!fs.existsSync(workspaceFolderConfigFile.fsPath)) {
      logger.info(`creating new config file at [${workspaceFolderConfigFile}]`);
      return this.saveConfigToWorkspaceFolder(workspaceFolder, { files: [] });
    }
    const workspaceConfig = await vscode.workspace.fs.readFile(vscode.Uri.parse(workspaceFolder + '/' + CONFIG_DIR + '/' + CONFIG_FILENAME));
    const config = JSON.parse(String(workspaceConfig)) as HubitatConfiguration;
    return config;
  }

  async lookupCodeFile(filepath: string): Promise<HubitatCodeFile | undefined> {
    let workspaceFolder = this.findWorkspaceConfigFolderFileForPath(filepath);
    let config = await this.load(workspaceFolder);
    let file = config.files.find(file => file.filepath === filepath);
    return file;
  }

  async saveCodeFile(codeFile: HubitatCodeFile) {
    delete codeFile.source;
    let codeFilePath = vscode.Uri.parse(codeFile.filepath!);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(codeFilePath);
    let config = await this.load(workspaceFolder?.uri!);
    let existingIndex = config.files.findIndex(f => f.filepath === codeFile.filepath);
    if (existingIndex > -1) {
      config.files[existingIndex] = codeFile;
    } else {
      config.files.push(codeFile);
    }
    await this.saveConfigToWorkspaceFolder(workspaceFolder?.uri!, config);
  }

  determineCodeType(filepath: string): Promise<CodeType | undefined> {
    return this.determineCodeTypeByContent(filepath);
  }

  async determineCodeTypeByContent(filepath: string): Promise<CodeType | undefined> {
    const driverMatchEx = /^\s*metadata\s*{\s/gm;
    const appMatchEx = /definition\((.|\n)*\)/mg;
    const libMatchEx = /^\s*library\s*\((.|\n)*\)\s*\n/mg;

    const sourceText = (await vscode.workspace.openTextDocument(filepath)).getText();
    if (driverMatchEx.exec(sourceText)) {
      return CodeType.driver;
    }
    else if (appMatchEx.exec(sourceText)) {
      return CodeType.app;
    }
    else if (libMatchEx.exec(sourceText)) {
      return CodeType.library;
    }
    return undefined;
  }

  getActiveHub(): string | undefined {
    const host = vscode.workspace.getConfiguration().get(HUB_HOSTNAME_KEY) as string;
    return host;
  }

  setActiveHub(hostname: string) {
    vscode.workspace.getConfiguration().update(HUB_HOSTNAME_KEY, hostname, vscode.ConfigurationTarget.Global);
  }

  forceHubitatUpdate(): boolean {
    return vscode.workspace.getConfiguration().get(FORCE_HUBITAT_UPDATE) as boolean;
  }

  clear() {
    this.context.workspaceState.update(HUBITAT_CONFIG_KEY, "");
    vscode.workspace.getConfiguration().update(HUB_HOSTNAME_KEY, null, vscode.ConfigurationTarget.Global);
  }

  async saveConfigToWorkspaceFolder(workspaceFolder: vscode.Uri, config: HubitatConfiguration): Promise<HubitatConfiguration> {
    const folder = vscode.workspace.getWorkspaceFolder(workspaceFolder);
    await vscode.workspace.fs.writeFile(vscode.Uri.parse(folder?.uri.path + '/' + CONFIG_DIR + '/' + CONFIG_FILENAME), new TextEncoder().encode(JSON.stringify(config, null, 2)));
    return config;
  }

  findWorkspaceConfigFolderFileForPath(filepath: string): vscode.Uri {
    return vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(filepath))?.uri!;
  }

}