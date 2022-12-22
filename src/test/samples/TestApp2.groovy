definition(
    name: 'Sample App2',
    namespace: 'hubitat-vscode-ext',
    author: 'Unknown',
    description: 'Sample App to Test VSCodplugin',
    category: 'Convenience',
    iconUrl: '',
    iconX2Url: '')

preferences {
}

void installed() {
  log.debug 'installed()'
}

void updated() {
  log.debug 'updated2()'
  runIn(5, 'handler')
}

void handler() {
  log.debug('handlermyow')
  runIn(60, 'handler')
}
void uninstalled() {
  log.debug 'uninstalled()'
}
