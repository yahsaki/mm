const util = require('./lib/util')
const audio = require('./lib/audio')
const path = require('path')
const EventEmitter = require('node:events')
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter()
const readline = require('node:readline')
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) { process.stdin.setRawMode(true) }
const _ = {
  mode: null,
  subMode: null,
  current: null,
  log: null,
  info: {
    mode: {
      play: 'play',
    },
    subMode: {
      play: {
        tag: 'tag',
        navigate: 'navigate',
      },
    },
    songState: {
      playing: 'playing',
      paused: 'paused',
    }
  }
}

const logs = []
emitter.on('log', (data) => {
  log(data)
  updateView()
})
emitter.on('on_song_play', (data) => {
  const arr = data.split(' ')
  if (arr[1] && arr[1].length === 11) {
    const atTime = arr[1]
    _.atTime = atTime
    const endTime = arr[2].substring(1, arr[2].length-1)
    updateView()
  }
})
emitter.on('on_song_end', (data) => {
  if (_.current?.state !== _.info.songState.paused) {

  }
  updateView()
})

const input = []
process.stdin.on('keypress', (str, key) => {
  let inputMode = false
  if (key.name === 'c' && key.ctrl) {
    // TODO: save current state and shit so we can resume playing where we left off
    console.log(`mata atode`)
    process.exit(0)
  }
  switch(_.mode) {
    case _.info.mode.play: {
      if (!_.subMode && key.name === 'escape') { // kill
        audio.stop()
        clear()
        log('not playing music anymore')
      }
      switch (_.subMode) {
        case _.info.subMode.play.tag: {
          inputMode = true
          if (key.name === 'escape') {
            log(`exiting tag mode`)
            input.length = 0
            _.subMode = null
          }
          if (key.name === 'return') {
            log(`creating tag(s) '${input.join('')}'`)
            saveTags()
          }
        } break
        default: {
          if (key.name === 't') {
            log(`switching from '${_.subMode}' to tag mode`)
            _.subMode = _.info.subMode.play.tag
          }
          if (key.name === 'space') { // pause
            if (audio.playing()) {
              audio.stop()
              _.current.state = _.info.songState.paused
            } else {
              if (!_.current) { // nothing was playing
                return
              }
              audio.resume(_.current.path, _.atTime, emitter)
              _.current.state = _.info.songState.playing
              log('resuming song@!')
            }
          }
        } break
      }
    } break
    default: {
      // menu: refresh, random,
      if (key.name === 'return') {
        log('time to play something!')
        const randomSong = _.data.audioFiles[Math.floor(Math.random() * _.data.audioFiles.length)]
        _.current = {...randomSong}
        _.mode = _.info.mode.play
        _.atTime = null
        const trackData = util.fetchDataFile(_.current, emitter)
        if (trackData) { _.current.tags = trackData.tags }
        audio.play(_.current.path, emitter)
      }
    } break
  }

  if (inputMode) {
    // handle alphanumeric
    if (key.name && key.name.length === 1) input.push(key.sequence)
    // handle special chars
    if (!key.name && key.sequence.length === 1) input.push(key.sequence)
    // backspace
    if (key.name === 'backspace') input.pop()
    // space bar
    if (key.name === 'space') input.push(' ')
  }
  updateView()
})
function updateView() {
  const arr = []
  // only take first 5 elements of log array
  for (let i = 0; i < 5; i++) {
    if (logs[i]) { arr.push(logs[i]) }
  }
  const logText = `\n----------------------\nlogs: \n${arr.join('\n')}`

  let view = ''
  switch(_.mode) {
    case _.info.mode.play: {
      view += 'playing rando song'
      if (_.current.state === _.info.songState.paused) { view += '(paused)\n'}
      else { view += '\n' }
      view += `title: ${_.current.title}\n`
      if (_.current.album) {
        view += `album: ${_.current.album}\n`
      }
      view += `artist: ${_.current.artist}\n`
      if (_.current.tags) {
        view += `tags: ${_.current.tags.join(', ')}\n`
      }
      if (_.atTime) {
        view += `${_.atTime} - ${_.current.duration}\n`
      }
      if (_.subMode === _.info.subMode.play.tag) {
        view += `add tag> ${input.join('')}\n`
      }
    } break
    default: {
      view += `${_.mode} iirashaimase. press enter to play a random song`
    } break
  }
  view += logText

  print(view)
}

function saveTags() {
  if (!input.length) { log(`write some chars`);return }
  //if (input.find(x => x === ' ')) { log(`spaces not allowed`);return }
  const payload = []
  const tags = input.join('').split(' ')
  for (let tag in tags) {
    if (tags[tag].length) { payload.push(tags[tag].toLowerCase()) }
  }

  if (!payload.length) {
    log(`no tags to save(out of ${tags.length})`)
    return
  }
  util.saveTags(payload, _.current, emitter)
}
function print(value) {
  console.clear()
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(value)
}
function clear() {
  input.length = 0
  _.mode = null
  _.subMode = null
  _.current = null
  _.atTime = null
}
function log(text) {
  logs.splice(0, 0, text)
}
;(async () => {
  // TODO: return all the shits on initialize, not just an array of files
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  _.data = await util.initialize(musicDir, emitter)
  updateView()
})()

