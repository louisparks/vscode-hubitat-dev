
import * as rm from 'typed-rest-client/RestClient';
import * as hm from 'typed-rest-client/HttpClient';
import * as vscode from 'vscode';

const hubitatHost = "192.168.125.20";

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
            socketTimeout: 5000
        });
    }

    async publish(id: number, filePath: string): Promise<PublishResult> {
        console.log("publishing ", filePath, " to ", this.hostname);
        try {
            let infoRes: rm.IRestResponse<CodeResponse> = await this.rest.get<CodeResponse>(`/driver/ajax/code`, { queryParameters: { params: { "id": id } } });
            const sourceText = (await vscode.workspace.openTextDocument(filePath)).getText();
            let body: any = { id: id, version: infoRes.result?.version, source: sourceText };

            const form = Object.keys(body).map(key => {
                return `${key}=${encodeURIComponent(body[key])}`;
            }).join("&");

            let updateResponse = await this.http.post(`http://${this.hostname}/driver/ajax/update`, form);
            console.log(updateResponse.message.statusCode);
            const result = JSON.parse(await updateResponse.readBody());
            return { status: result.status === 'success' ? PublishStatus.success : PublishStatus.failure };
        }
        catch (e) {
            console.log("error", e);
            return { status: PublishStatus.failure };
        }
    }
}

