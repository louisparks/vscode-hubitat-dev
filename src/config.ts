import * as vscode from 'vscode';

interface HubitatConfiguration {
  hostname: string;
  username: string;
  password: string;
  files: Array<HubitatCodeFile>
}

export enum CodeType {
  driver = "driver",
  app = "app",
  library = "library"
}

export interface HubitatCodeFile {
  filepath: string;
  codeType: CodeType;
  id: number;
  version: number;
}

export class HubitatConfigManager {
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  load(): HubitatConfiguration {
    let existingConfig = this.context.workspaceState.get("hubitatConfig") as HubitatConfiguration;

    if (!existingConfig) {
      existingConfig = {
        hostname: "",
        username: "",
        password: "",
        files: []
      };
    }
    this.save(existingConfig);
    return existingConfig;
  }

  lookupCodeFile(filepath: string): HubitatCodeFile | null {
    const codeType = this.determineCodeType(filepath);
    let config = this.load();
    let file = config.files.find(file => file.filepath === filepath);
    if (!file || !file.id) {
      return { filepath: filepath, codeType: codeType, id: 0, version: 0 };
    };
    //Hack, lets figure out a better way
    file.codeType = codeType;
    return file;
  }

  saveCodeFile(codeFile: HubitatCodeFile) {
    let config = this.load();
    let files = config.files.filter(f => f.filepath !== codeFile.filepath);
    files.push(codeFile);
    config.files = files;
    this.save(config);
  }

  determineCodeType(filepath: string): CodeType {
    return filepath.includes("/apps/") ? CodeType.app : CodeType.driver;
  }

  save(config: HubitatConfiguration) {
    this.context.workspaceState.update("hubitatConfig", config);
  }
}