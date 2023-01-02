
import * as vscode from 'vscode';
import { HubInfo, HubitatCodeFile, HubitatConfigManager } from './ConfigManager';
import { logger } from './Logger';
import { parse } from 'node-html-parser';
import axios, { Axios } from 'axios';
import { isLoginRedirect } from './Utils';

interface CodeResponse {
  id: number;
  version: number;
  source: string;
  status: string;
}
interface HubDataResponse {
  hubId: string;
  ipAddress: string;
  name: string;
}
interface HubConnectionResponse {
  status: HubConnectionStatus;
  reason?: HubConnectionFailureReason;
  hubData?: HubDataResponse;
}
interface UpdateResponse {
  id: number;
  version: number;
  status: string;
  errorMessage: string;
}

export enum HubConnectionStatus { success = "sucess", failure = "failure" };
export enum HubConnectionFailureReason { authentication = "authentication", timeout = "timeout", unknown = "unknown" };

export enum PublishStatus { success = "success", failure = "failure" };
export enum PublishErrorReason { duplicate = 'duplicate', unknown = 'unknown' };

export interface PublishResult {
  status: PublishStatus;
  errorReason?: PublishErrorReason;
  errorMessage?: string;
  codeFile: HubitatCodeFile;
}

export interface ConnectionCheckResult {
  status: HubConnectionStatus;
  hubData: HubDataResponse;
  reason?: string;
}

export class HubitatClient {
  configManager: HubitatConfigManager;
  httpClient: Axios;
  authCookie?: string;
  hubInfo: HubInfo;

  constructor(configManager: HubitatConfigManager) {
    this.configManager = configManager;
    this.hubInfo = configManager.getActiveHubInfo();
    this.httpClient = this.createNewClient();
    this.init();
  }

  async init() {
    if (this.hubInfo.username && this.hubInfo.password) {
      this.authCookie = await this.getLoginToken();
      // eslint-disable-next-line @typescript-eslint/naming-convention
      let cookies = { "Cookie": this.authCookie };
      this.httpClient = this.createNewClient(cookies);
    }
  }

  createNewClient(cookies: any = {}) {
    const httpClient = axios.create({
      baseURL: `http://${this.hubInfo.host}`,
      timeout: 10000,
      maxRedirects: 0,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', ...cookies },
      validateStatus: (status) => { return [200, 302].includes(status); }
    });
    httpClient.interceptors.response.use(
      (successfulRes) => {
        if (successfulRes.status === 302 && isLoginRedirect(successfulRes.headers.location)) {
          return Promise.reject(new Error("authentication error with hub"));
        }
        return successfulRes;
      },
      (error) => {
        logger.error("unexpected error: ", error);
        return Promise.reject(error);
      }
    );

    return httpClient;
  }

  async publish(codeFile: HubitatCodeFile, force = false): Promise<PublishResult> {
    logger.debug(`publishing ${codeFile.codeType} ${codeFile.filepath} to ${this.configManager.getActiveHubInfo().host}`);
    try {
      if (this.configManager.forceHubitatUpdate() || force === true) {
        codeFile.version = (await this.loadExistingCodeFromHubitat(codeFile))?.version;
      }

      const sourceText = (await vscode.workspace.openTextDocument(codeFile.filepath!)).getText();
      const form = this.toFormBody({ id: codeFile.id, version: codeFile?.version, source: sourceText });
      let updateResponse = await this.httpClient.post<UpdateResponse>(`/${codeFile.codeType}/ajax/update`, form);
      const result = updateResponse.data;
      codeFile.version = (codeFile.version || 0) + 1;
      let publishResult: PublishResult = { status: result.status === 'success' ? PublishStatus.success : PublishStatus.failure, codeFile };
      if (publishResult.status === PublishStatus.failure) {
        publishResult.errorMessage = result.errorMessage.replace("java.sql.SQLException:", "");
        publishResult.errorReason = result.errorMessage.includes("Version does not match") ? PublishErrorReason.duplicate : PublishErrorReason.unknown;
      }
      return publishResult;
    }
    catch (error) {
      let message = 'Unknown Error';
      if (error instanceof Error) {
        message = error.message;
      }
      logger.error(`failed to publish ${codeFile.codeType} ${codeFile.filepath}`, message);
      return { status: PublishStatus.failure, codeFile, errorMessage: message };
    }
  }

  async getLoginToken() {
    const hubInfo = this.configManager.getActiveHubInfo();
    const username = hubInfo.username;
    const password = hubInfo.password;
    try {
      const response = await this.httpClient.post("/login",
        {
          'username': username,
          'password': password,
          'submit': 'Login'
        },
        { validateStatus: (status) => { return status === 302; } });
      const sessionCookie = response.headers["set-cookie"];
      return sessionCookie ? sessionCookie[0] : undefined;
    }
    catch (error) {
      logger.warn("error authenticating to hub" + error);
    }
  }

  async fileExistsOnHubitat(codeFile: HubitatCodeFile): Promise<boolean> {
    const found = (await this.loadExistingCodeFromHubitat(codeFile));
    return found ? true : false;
  }

  async checkHubConnection(): Promise<HubConnectionResponse> {
    try {
      let hdr = await this.httpClient.get<HubDataResponse>("/hub2/hubData", {
        validateStatus: (status) => [200, 302].includes(status)
      });
      if (hdr.status !== 200) {
        const { location } = hdr.headers;
        if (isLoginRedirect(location)) {
          logger.warn(`detected security redirect to: ${location} `);
          return { status: HubConnectionStatus.failure, reason: HubConnectionFailureReason.authentication };
        }
        return { status: HubConnectionStatus.failure, reason: HubConnectionFailureReason.unknown };
      }
      return { status: HubConnectionStatus.success, hubData: hdr.data };
    }
    catch (error) {
      logger.error("error in checking hub connection", error);
      return { status: HubConnectionStatus.failure };
    }

  }

  async loadExistingCodeFromHubitat(codeFile: HubitatCodeFile): Promise<HubitatCodeFile | undefined> {
    try {
      let infoRes = await this.httpClient.get<CodeResponse>(`/${codeFile.codeType}/ajax/code`, { params: { "id": String(codeFile.id) } });
      //Apps return 200 with empty payload even when not found, so lets check the id matches too.
      if (infoRes.status === 200 && infoRes.data.id === codeFile.id) {
        const codeResponse = infoRes.data;
        return { id: codeResponse?.id, filepath: codeFile.filepath, version: codeResponse?.version, codeType: codeFile.codeType };
      }
      else if (infoRes.status === 302 && isLoginRedirect(infoRes.headers.location)) {
        logger.debug("access denied");
      }
    }
    catch (error: any) {
      logger.debug(`error looking up file with id ${codeFile.id}`);
    }
    logger.debug(`no hubitat code exists for ${codeFile.codeType} with id ${codeFile.id}`);
    return undefined;
  }

  async createNewCodeOnHubitat(codeFile: HubitatCodeFile): Promise<PublishResult> {
    let errorMessage = undefined;
    try {
      const body = this.toFormBody({ id: '', version: '', create: '', source: codeFile.source });
      let updateResponse = await this.httpClient.post(`/${codeFile.codeType}/save`, body);
      if (updateResponse.status === 302) {
        logger.info(`created new ${codeFile.codeType} on hubitat: [${updateResponse.status}] at [${updateResponse.headers.location}]`);
        const newId = updateResponse.headers.location?.split("/").pop();
        const newCodeFile = { ...codeFile, id: Number(newId), version: 1 };
        const result: PublishResult = { codeFile: newCodeFile, status: PublishStatus.success };
        return result;
      }
      errorMessage = this.parseCreateNewErrorFromHTML(await updateResponse.data);
      logger.warn(`could not create new [${codeFile.codeType}] ${codeFile.filepath} errorMessage:[${errorMessage}] http: [${updateResponse.status}] [${updateResponse.status}]`);

    }
    catch (error: any) {
      logger.error("unknown error creating new code file:", error);
      errorMessage = error.message;
    }
    return { status: PublishStatus.failure, codeFile: codeFile, errorMessage: errorMessage };
  };

  private toFormBody(body: any): string {
    const form = Object.keys(body).map(key => {
      return `${key}=${encodeURIComponent(body[key])}`;
    }).join("&");
    return form;
  }

  private parseCreateNewErrorFromHTML(responseBody: string): string {
    try {
      const html = parse(responseBody);
      const errors = html.querySelector('#errors');
      const errorMessage = errors?.textContent.trim() || "unparseable";
      return errorMessage;
    }
    catch (error) {
      logger.error("error", error);
    }
    return "UNKOWN";
  }

}

