
import * as rm from 'typed-rest-client/RestClient';
import * as hm from 'typed-rest-client/HttpClient';
import * as vscode from 'vscode';
import { CodeType, HubitatCodeFile, HubitatConfigManager } from './ConfigManager';
import { logger } from './Logger';

interface CodeResponse {
    id: number;
    version: number;
    source: string;
    status: string;
}
interface UpdateResponse {
    id: number;
    version: number;
    status: string;
    errorMessage: string;
}

export enum PublishStatus { success, failure };
export enum PublishErrorReason { duplicate = 'duplicate', unknown = 'unknown' };

export interface PublishResult {
    status: PublishStatus;
    errorReason?: PublishErrorReason;
    errorMessage?: string | undefined;
    codeFile: HubitatCodeFile;
}

export class HubitatClient {
    configManager: HubitatConfigManager;
    rest: rm.RestClient;
    http: hm.HttpClient;

    constructor(configManager: HubitatConfigManager) {
        this.configManager = configManager;
        this.rest = new rm.RestClient('hubutat-dev', `http://${this.configManager.getActiveHub()}`, [], { socketTimeout: 10000 });
        this.http = new hm.HttpClient('hubutat', [], {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            socketTimeout: 10000,
            allowRedirects: false
        });
    }

    async publish(codeFile: HubitatCodeFile, force = false): Promise<PublishResult> {
        logger.debug(`publishing ${codeFile.codeType} ${codeFile.filepath} to ${this.configManager.getActiveHub()}`);
        try {
            if (this.configManager.forceHubitatUpdate() || force === true) {
                codeFile.version = (await this.loadExistingCodeFromHubitat(codeFile))?.version;
            }

            const sourceText = (await vscode.workspace.openTextDocument(codeFile.filepath!)).getText();
            const form = this.toFormBody({ id: codeFile.id, version: codeFile?.version, source: sourceText });
            let updateResponse = await this.http.post(`http://${this.configManager.getActiveHub()}/${codeFile.codeType}/ajax/update`, form);
            const result = JSON.parse(await updateResponse.readBody()) as UpdateResponse;
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

    async fileExistsOnHubitat(codeFile: HubitatCodeFile): Promise<boolean> {
        const found = (await this.loadExistingCodeFromHubitat(codeFile));
        return found ? true : false;
    }

    async loadExistingCodeFromHubitat(codeFile: HubitatCodeFile): Promise<HubitatCodeFile | undefined> {
        try {

            let infoRes = await this.http.get(`http://${this.configManager.getActiveHub()}/${codeFile.codeType}/ajax/code`, { queryParameters: { params: { "id": String(codeFile.id) } } });
            //Apps return 200 with empty payload even when not found, so lets check the id matches too.
            if (infoRes.message.statusCode === 200) {
                const codeResponse = JSON.parse(await infoRes.readBody()) as CodeResponse;
                return { id: codeResponse?.id, filepath: codeFile.filepath, version: codeResponse?.version, codeType: codeFile.codeType };
            }
            else if (infoRes.message.statusCode === 302 && infoRes.message.headers.location?.includes("loginRedirect")) {
                logger.debug("access denied");
            }
        }
        catch (error: any) {
            logger.debug(`error looking up file with id ${codeFile.id}`);
        }
        logger.debug(`no hubitat code exists for ${codeFile.codeType} with id ${codeFile.id}`);
        return undefined;

    }

    async createNewCodeOnHubitat(codeFile: HubitatCodeFile): Promise<HubitatCodeFile | undefined> {
        try {
            const body = this.toFormBody({ id: '', version: '', create: '', source: codeFile.source });
            let updateResponse = await this.http.post(`http://${this.configManager.getActiveHub()}/${codeFile.codeType}/save`, body);
            if (updateResponse.message.statusCode === 302) {
                logger.info(`created new ${codeFile.codeType} on hubitiat: [${updateResponse.message.statusCode}] at [${updateResponse.message.headers.location}]`);
                const newId = updateResponse.message.headers.location?.split("/").pop();
                return { ...codeFile, id: Number(newId), version: 1 };
            }
            logger.warn(`could not create new [${codeFile.codeType}] ${codeFile.filepath} http: [${updateResponse.message.statusCode}] [${updateResponse.message.statusMessage}]`);
        }
        catch (error: any) {
            logger.error("unknown error creating new code file:", error);
        }
        return undefined;
    }

    private toFormBody(body: any): string {
        const form = Object.keys(body).map(key => {
            return `${key}=${encodeURIComponent(body[key])}`;
        }).join("&");
        return form;
    }

}

