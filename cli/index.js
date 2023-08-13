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
      logs.splice(0, 0, 'no spaces in tags please')
      _.mode = modes.tag;clear();updateView();return;
    }
  } else {
    if (key.name === 'escape') {
      log(`switched from mode '${_.mode}' to... none I guess`, true)
      _.mode=null;clear();updateView();return;
    }
    if (key.name === 'return') {
      let s = input.join('')
      if (s.startsWith('rm ')) {
        s = s.split('rm ')[1]
        log(`removing tags '${s}'`)
        removeTags(s.split(' '))
      } else {
        log(`adding tags '${s}'`)
        addTags(s.split(' '))
      }
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
  switch(_.mode) {
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
tags: ${_.current.tags.join(', ')}
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
    _.current.tags = data.album.track[data.key].tags
  } else {
    // no need to re-set these values if they havent changed, worthless else atm
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
async function removeTags(tags) {
  const data = await fetchAlbumData()
  const date = new Date()

  const existingTags = []
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].toLowerCase()
    const index = data.album.track[data.key].tags.findIndex(x => x === tag)
    if (index > -1) {
      data.album.track[data.key].tags.splice(index, 1)
      existingTags.push(tag)
    }
  }
  if (!existingTags.length) {
    log('nothing to modify');return;
  }
  log(`tags '${existingTags.join(', ')}' will be removed`, true)
  for (let i = 0; i < existingTags.length; i++) {
    data.album.track[data.key].history.tags.splice(0, 0, {
      ...util.template.tagHistory,
      date: new Date().toISOString(),
      action: util.tagAction.remove,
      tag: existingTags[i],
    })
  }
  data.album.updateDate = date.toISOString()
  data.album.track[data.key].updateDate = date.toISOString()
  // update current view's tags
  _.current.tags = data.album.track[data.key].tags

  log(`data file updated at '${data.dataFilePath}'`, true)
  fs.writeFileSync(data.dataFilePath, JSON.stringify(data.album,' ',2),{encoding:'utf-8'})
  updateView()
}

async function addTags(tags) {
  // spaces not allowed in tag names
  const data = await fetchAlbumData()
  const date = new Date()

  const uniqueTags = []
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].toLowerCase()
    if (!data.album.track[data.key].tags.find(x => x === tag)) uniqueTags.push(tag)
  }
  if (!uniqueTags.length) {
    log('nothing to modify');return;
  }
  log(`tags '${uniqueTags.join(', ')}' will be added`, true)
  data.album.track[data.key].tags = data.album.track[data.key].tags.concat(uniqueTags)
  for (let i = 0; i < uniqueTags.length; i++) {
    data.album.track[data.key].history.tags.splice(0, 0, {
      ...util.template.tagHistory,
      date: date.toISOString(),
      action: util.tagAction.add,
      tag: uniqueTags[i],
    })
  }
  data.album.updateDate = date.toISOString()
  data.album.track[data.key].updateDate = date.toISOString()
  // update current view's tags
  _.current.tags = data.album.track[data.key].tags

  log(`data file updated at '${data.dataFilePath}'`, true)
  fs.writeFileSync(data.dataFilePath, JSON.stringify(data.album,' ',2),{encoding:'utf-8'})
  updateView()
}
async function fetchAlbumData() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  const playlist = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/playlist.json'))
  //console.log('playlist', playlist.children.find(x => x.name === 'Playlist'))
  const node = playlist.children.find(x => x.name === 'Playlist')
  let track = node.children.find(x => x.id === `${status.currentplid}`)
  // this will probably never happen
  if (!track) { throw Error(`faled to find track '${status.information.category.meta.title}' plid ${status.currentplid} in playlist`) }
  const fp = decodeURIComponent(track.uri.split('file:///')[1])
  const fpObj = path.parse(fp)
  const dataFilePath = path.join(fpObj.dir, util.dataFileName)
  if (fs.existsSync(dataFilePath)) {
    return {
      album: JSON.parse(fs.readFileSync(dataFilePath)),
      currentTrack: status.information.category.meta,
      key: `${status.information.category.meta.track_number}:${status.information.category.meta.title}`,
      dataFilePath,
    }
  }

  // build data
  //const tracks = await util.getTracks(fpObj.dir)
  const date = new Date()
  const data = {
    album: {
      ...util.template.base,
      createDate: date.toISOString(),
      updateDate: date.toISOString(),
    },
    currentTrack: status.information.category.meta,
    key: `${status.information.category.meta.track_number}:${status.information.category.meta.title}`,
    dataFilePath,
  }
  data.album.track[data.key] = {
    ...util.template.track,
    createDate: date.toISOString(),
    updateDate: date.toISOString(),
    trackNumber: status.information.category.meta.track_number,
    title: status.information.category.meta.title,
  }
  return data
}