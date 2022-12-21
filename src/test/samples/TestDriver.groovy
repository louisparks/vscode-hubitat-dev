metadata {
  definition(name: 'Sample Driver',
    namespace: 'hubitat-vscode-ext',
    author: 'Unknown') {
      capability 'Actuator'
      capability 'Switch'
    }

  preferences {
  }
}

void installed() {
  log.debug 'installed()'
}

void updated() {
  log.debug 'updated()'
}
