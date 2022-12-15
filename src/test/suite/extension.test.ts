import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as hubExt from '../../extension';
import * as fs from "fs";
import * as path from 'path';
import { homedir } from 'os';
import { HUB_HOSTNAME_KEY } from '../../ConfigManager';
import { TextEncoder } from 'util';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Resource Dir Test', async () => {
		//const testSuitRootFolder = __dirname;
		//const resourceFolder = testSuitRootFolder + "/../resources";
		//if (!fs.existsSync(resourceFolder)) {
		//	fs.mkdirSync(resourceFolder);
		//}
		//vscode.window.showInformationMessage(homedir());
		//const testFilePath = path.join(resourceFolder, "testApp.groovy");
		//const uri = vscode.Uri.file(testFilePath);

	});

	test('Extenstion test', async () => {
		//console.log(vscode.workspace.workspaceFile?.path);
		//const tempWorkspaceFolder = path.join(__dirname, "../../../", "temp/workspace1");
		//const tempWorkspaceFolderUri = vscode.Uri.parse(tempWorkspaceFolder);
		//const tempWorkspaceTestFileUri = vscode.Uri.file(path.join(tempWorkspaceFolder, "test.Groovy"));

		//if (!fs.existsSync(tempWorkspaceFolder)) {
		//		fs.mkdirSync(tempWorkspaceFolder, { recursive: true });
		//		}
		//		await vscode.workspace.fs.writeFile(tempWorkspaceTestFileUri, new TextEncoder().encode("//groover dude"));




		//await vscode.workspace.updateWorkspaceFolders(0, null, { uri: tempWorkspaceFolderUri });
		//const doc = await vscode.workspace.openTextDocument(tempWorkspaceTestFileUri);
		//await vscode.window.showTextDocument(doc);
		//await vscode.workspace.getConfiguration().update(HUB_HOSTNAME_KEY, "192.168.125.30", vscode.ConfigurationTarget.Global);
		//await vscode.commands.executeCommand('hubitat-dev.publish');
	});
});
