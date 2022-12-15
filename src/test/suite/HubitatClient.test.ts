import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { HubitatConfigManager } from '../../ConfigManager';
import { HubitatClient } from '../../HubitatClient';

suite('Hubitat Client Test Suite', () => {
	vscode.window.showInformationMessage('Start Hubitat Client Integration Tests.');
	//let mockConfig = new HubitatConfigManager();
	//let cut = new HubitatClient();
	test('Auth Test', () => {
		vscode.window.showInformationMessage('testing code.');
	});
});
