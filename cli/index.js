
const util = require('./lib/util')
const readline = require('node:readline')
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) { process.stdin.setRawMode(true) }
const input = []
let mode
const modes = { tag: 'tag' }
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) process.exit(0)
  if (!mode) {
    if (key.name === 'escape') process.exit(0)
    if (key.name === 't' || key.name === '1') { mode = modes.tag;clear();updateView();return; }
  } else {
    if (key.name === 'escape') {mode=null;clear();updateView();return;}
    if (key.name === 'return') {
      log(`adding tags here now: '${input.join('')}'`)
      clear()
      return
    }
    // handle alphanumeric
    if (key.name && key.name.length === 1) input.push(key.sequence)
    // handle special chars
    if (!key.name && key.sequence.length === 1) input.push(key.sequence)
    // backspace
    if (key.name === 'backspace') input.pop()
    // space bar
    if (key.name === 'space') input.push(' ')
    updateView()
  }
})

let intervalTime = 1000
const logs = []

/*
#0: show current playing song
#1: listen for when song changes
*/

let intervalId = setInterval(async () => {
  await checkCurrentSong()
  updateView()
}, intervalTime)
const current = { title: null, album: null, artist: null }

;(async () => {
  await checkCurrentSong()
  updateView()
})()

function updateView() {
  // drawing a serious blank on a cleaner way to take the first 5 elements of an array
  const arr = []
  // only take first 5 elements of log array
  for (let i = 0; i < 4; i++) {
    if (logs[i]) arr.push(logs[i])
  }
  const logText = `logs: \n${arr.join('\n')}`
  // change text for mode
  let modeText = ''
  switch(mode) {
    case modes.tag: {
      modeText = `
mode: CRUD tags
> ${input.join('')}
      `
    } break
    default: {
      modeText = `
options:
  1(t) - add tags
      `
    } break
  }
  print(`
album: ${current.album}
title: ${current.title}
artist: ${current.artist}
${modeText}
${logText}
  `)
}
async function checkCurrentSong() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  //if (currentSong.title !== songTitle) {}
  current.title = status.information.category.meta.title
  current.album = status.information.category.meta.album
  current.artist = status.information.category.meta.artist
}

function print(message) {
  console.clear()
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(message)
}
function clear() {
  input.length = 0
}
function log(text) {
  logs.splice(0, 0, text)
}