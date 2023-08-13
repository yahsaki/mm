const path = require('path')
const fs = require('fs')
const util = require('./lib/util')
const readline = require('node:readline')
const Logger = require('./lib/Logger')
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) { process.stdin.setRawMode(true) }
const _ = {
  mode: null,
  currentTitle: null,
  current: { title: null, album: null, artist: null },
}
const logger = new Logger()
const input = []
const modes = { tag: 'tag' }
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) {
    log(`*** process stopped ***`, true)
    process.exit(0)
  }
  if (!_.mode) {
    if (key.name === 'escape') process.exit(0)
    if (key.name === 't' || key.name === '1') {
      log(`switched from mode '${_.mode}' to '${modes.tag}'`, true)
      _.mode = modes.tag;clear();updateView();return;
    }
  } else {
    if (key.name === 'escape') {
      log(`switched from mode '${_.mode}' to... none I guess`, true)
      _.mode=null;clear();updateView();return;
    }
    if (key.name === 'return') {
      log(`adding tags here now: '${input.join('')}'`, true)
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

;(async () => {
  // TODO: initialize log file here
  await checkCurrentSong()
  updateView()
})()

function updateView() {
  // drawing a serious blank on a cleaner way to take the first 5 elements of an array
  const arr = []
  // only take first 5 elements of log array
  for (let i = 0; i < 5; i++) {
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
album: ${_.current.album}
title: ${_.current.title}
artist: ${_.current.artist}
${modeText}
${logText}
  `)
}
async function checkCurrentSong() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  //if (currentSong.title !== songTitle) {}
  if (_.currentTitle !== status.information.category.meta.title) {
    log(`song changed from '${_.currentTitle}' to '${status.information.category.meta.title}'`, true)
    _.currentTitle = status.information.category.meta.title
    _.current = {
      title: status.information.category.meta.title,
      album: status.information.category.meta.album,
      artist: status.information.category.meta.artist,
    }
    // check for tags
    const data = await fetchAlbumData()
    
  } else {
    _.current.title = status.information.category.meta.title
    _.current.album = status.information.category.meta.album
    _.current.artist = status.information.category.meta.artist
  }
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
function log(text, debug = false) {
  if (!debug) logs.splice(0, 0, text)
  // TODO: write to log file, cant take this shit no mo
  logger.log(text)
}
async function fetchAlbumData() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  const playlist = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/playlist.json'))
  //console.log('playlist', playlist.children.find(x => x.name === 'Playlist'))
  const node = playlist.children.find(x => x.name === 'Playlist')
  let song = node.children.find(x => x.id === `${status.currentplid}`)
  // this will probably never happen
  if (!song) { throw Error(`faled to find song '${status.information.category.meta.title}' plid ${status.currentplid} in playlist`) }
  const fp = decodeURIComponent(song.uri.split('file:///')[1])
  const fpObj = path.parse(fp)
  const dfp = path.join(fpObj.dir, util.dataFileName)
  if (fs.existsSync(dfp)) {
    return JSON.parse(fs.readFileSync(dfp))
  }
  return
}
function addTags(tags) {
  
}