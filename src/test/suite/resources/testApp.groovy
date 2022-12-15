definition(
    name: 'Sample App2',
    namespace: 'louisparks',
    author: 'Louis Parks',
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
}

void uninstalled() {
  log.debug 'uninstalled()'
}
