import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as hubExt from '../../extension';
import * as fs from "fs";
import * as path from 'path';
import { CodeType } from '../../ConfigManager';
import { determineCodeTypeByContent } from '../../Utils';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Code Parser - App', async () => {
    const codeFile = fs.readFileSync(path.join(__dirname, "../../../", "src/test/samples/TestApp.groovy"), { encoding: 'utf8', flag: 'r' });
    const type = determineCodeTypeByContent(codeFile);
    assert.strictEqual(type?.codeType, CodeType.app);
  });
  test('Code Parser - Driver', async () => {
    const codeFile = fs.readFileSync(path.join(__dirname, "../../../", "src/test/samples/TestDriver.groovy"), { encoding: 'utf8', flag: 'r' });
    const type = determineCodeTypeByContent(codeFile);
    assert.strictEqual(type?.codeType, CodeType.driver);
  });
  test('Code Parser - Library', async () => {
    const codeFile = fs.readFileSync(path.join(__dirname, "../../../", "src/test/samples/TestLibrary.groovy"), { encoding: 'utf8', flag: 'r' });
    const type = determineCodeTypeByContent(codeFile);
    assert.strictEqual(type?.codeType, CodeType.library);
  });

  test('Extension test', async () => {
    //const testApp = path.join(__dirname, "../../../", "temp/workspace1/TestApp.groovy");
    //const doc = await vscode.workspace.openTextDocument(testApp);
    //try {
    //  await vscode.commands.executeCommand('hubitat-dev.publish');
    //}
    //catch (error) {
    //  console.log(error);
    //}


    //console.log(vscode.workspace.workspaceFile?.path);
    //const tempWorkspaceTestFileUri = vscode.Uri.file(tempWorkspaceFolder);
    //if (!fs.existsSync(tempWorkspaceFolder)) {
    //		fs.mkdirSync(tempWorkspaceFolder, { recursive: true });
    //		}
    //		await vscode.workspace.fs.writeFile(tempWorkspaceTestFileUri, new TextEncoder().encode("//groover dude"));
    //await vscode.workspace.updateWorkspaceFolders(0, null, { uri: tempWorkspaceFolderUri });
    //await vscode.window.showTextDocument(doc);
    //await vscode.workspace.getConfiguration().update("hubitat.hub.hostname", "192.168.125.30", vscode.ConfigurationTarget.Global);
    //console.log(await vscode.workspace.getConfiguration().get("hubitat.hub.hostname"));
  });
});
