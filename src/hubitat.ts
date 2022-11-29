
import * as rm from 'typed-rest-client/RestClient';
import * as hm from 'typed-rest-client/HttpClient';
import * as vscode from 'vscode';
import { CodeType, HubitatCodeFile } from './config';

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

export interface PublishResult {
    status: PublishStatus;
    errorMessage: string | undefined;
    codeFile: HubitatCodeFile;
}

export class HubitatClient {
    hostname: string;
    rest: rm.RestClient;
    http: hm.HttpClient;

    constructor(hostname: string) {
        this.hostname = hostname;
        this.rest = new rm.RestClient('hubutat-dev', `http://${this.hostname}`, [], { socketTimeout: 5000 });
        this.http = new hm.HttpClient('hubutat', [], {
            headers: {
                "Accept": 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            socketTimeout: 10000,
            allowRedirects: false
        });
    }

    async publish(codeFile: HubitatCodeFile): Promise<PublishResult> {
        console.log(`publishing ${codeFile.filepath} to ${this.hostname}`);
        try {
            try {
                let infoRes: rm.IRestResponse<CodeResponse> = await this.rest.get<CodeResponse>(`/${codeFile.codeType}/ajax/code`, { queryParameters: { params: { "id": codeFile.id } } });
                codeFile.version = infoRes.result?.version as number;
            }
            catch (error: any) {
                if (error['statusCode'] === 500) {
                    //existing id was not found, creating a new one
                    codeFile = await this.createNewId(codeFile);
                }

            }

            const sourceText = (await vscode.workspace.openTextDocument(codeFile.filepath)).getText();

            const form = this.createForm({ id: codeFile.id, version: codeFile.version, source: sourceText });

            let updateResponse = await this.http.post(`http://${this.hostname}/${codeFile.codeType}/ajax/update`, form);
            const result = JSON.parse(await updateResponse.readBody()) as UpdateResponse;
            codeFile.version = codeFile.version + 1;
            return { status: result.status === 'success' ? PublishStatus.success : PublishStatus.failure, codeFile, errorMessage: undefined };
        }
        catch (error) {
            let message = 'Unknown Error';
            if (error instanceof Error) {
                message = error.message;
            }
            console.log("error", error);
            return { status: PublishStatus.failure, codeFile, errorMessage: message };
        }
    }
    async createNewId(codeFile: HubitatCodeFile): Promise<HubitatCodeFile> {
        const sourceText = (await vscode.workspace.openTextDocument(codeFile.filepath)).getText();
        const body = this.createForm({ id: '', version: '', create: '', source: sourceText });
        let updateResponse = await this.http.post(`http://${this.hostname}/${codeFile.codeType}/save`, body, { Authorization: "Basic YWRtaW46YWRtaW4=" });
        console.log(updateResponse.message.statusCode, updateResponse.message.statusMessage, updateResponse.message.headers.location);
        const newId = updateResponse.message.headers.location?.split("/").pop();
        codeFile.id = Number(newId);
        codeFile.version = 1;
        return codeFile;
    }

    createForm(body: any): string {
        const form = Object.keys(body).map(key => {
            return `${key}=${encodeURIComponent(body[key])}`;
        }).join("&");
        return form;
    }
}

