# Hubitat Developer Tools extension README

Edit your Hubitat drivers and applications in Visual Studio Code and easliy publish them to your hubitat.

## Features

* 1-click publishing of hubitat drivers, apps and libraries .groovy files
* Version tracking to make sure you don't overwrite a newer version on the hub
* Local file will auto-save when publishing

The extension needs the IP/hostname of the hub.  If it's not already set in the settings, you will be prompted to enter the IP address when you first try to publish.
When you publish for the first time, a new driver, app or library will be created on the hubitat.  The new hubitat assigned id of the code will be stored in a .hubitat/metadata.json file at the root of your workspace folder.  It shouldn't be neccessary to edit this file manually, however, if you want to associate a driver already deployed on the hubitat with a local file, you may change the id in this file to make the association.

\!\[Publishing Code To The Hubitat\]\(images/hubitat_publish_new.gif\)

> To publish, have the file open in the VSCode editor and type Control-Shift-P (Command-Shift-P on mac).  Start typing in Hubitat - Publish.  Click on the Hubitat - Publish option and your code will published to the hubitat.

## Requirements

Hubitat hub required

## Extension Settings

This extension contributes the following settings:

* `hubitat.hub.hostname`: Hostname or IP address of hubitat hub.
* `hubitat.misc.overwriteHubitatVersion`: Set to `true` to always overwrite the version on the hubitat.

## Known Issues
None
## Release Notes

See CHANGELOG.md

## For more information

* [Hubitat Developer Documentation](https://docs2.hubitat.com/en/developer)

**Enjoy!**
