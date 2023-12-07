const readline = require('node:readline')
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) { process.stdin.setRawMode(true) }

process.stdin.on('keypress', (str, key) => {
  console.log('string', str)
  console.log('key', key)
  if (key.name === 'c' && key.ctrl) {
    process.exit(0)
  }

})

