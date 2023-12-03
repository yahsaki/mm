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
  current: null,
  log: null,
  info: {
    mode: {
      play: 'play',
    },
    songState: {
      playing: 'playing',
      paused: 'paused',
    }
  }
}

emitter.on('log', (data) => {
  _.log = data
  updateView()
})
emitter.on('on_song_play', (data) => {
  //console.log('song playing', data)
  const arr = data.split(' ')
  if (arr[1].length === 11) {
    const atTime = arr[1]
    _.atTime = atTime
    const endTime = arr[2].substring(1, arr[2].length-1)
    //console.log(atTime)
    updateView()
  }
})
emitter.on('on_song_end', (data) => {
  if (_.current.state !== _.info.songState.paused) {
    _.mode = null
    _.current = null
    _.atTime = null
  }
  updateView()
})

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) {
    // TODO: save current state and shit so we can resume playing where we left off
    console.log(`mata atode`)
    process.exit(0)
  }
  switch(_.mode) {
    case _.info.mode.play: {
      if (key.name === 'escape') { // kill
        audio.stop()
        _.mode = null
        _.current = null
        _.atTime = null
        _.log = 'not playing music anymore'
      }
      if (key.name === 'space') { // pause
        _.log = `playing>? ${audio.playing()}`
        if (audio.playing()) {
          audio.stop()
          _.current.state = _.info.songState.paused
        } else {
          if (!_.current) { // nothing was playing
            return
          }
          audio.resume(_.current.path, _.atTime, emitter)
          _.current.state = _.info.songState.playing
          _.log = 'resuming song@!'
        }
      }
    } break
    default: {
      // menu: refresh, random,
      if (key.name === 'return') {
        console.log('time to play something!')
        const randomSong = _.data.audioFiles[Math.floor(Math.random() * _.data.audioFiles.length)]
        _.current = {...randomSong}
        _.mode = _.info.mode.play
        _.atTime = null
        audio.play(_.current.path, emitter)
      }
    } break
  }
  updateView()
})
function updateView() {
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
      if (_.atTime) {
        view += `${_.atTime} - ${_.current.duration}\n`
      }
    } break
    default: {
      view += `${_.mode} iirashaimase. press enter to play a random song`
    } break
  }
  if (_.log) { view += `\n\nlog: ${_.log}`}
  print(view)
}

function print(value) {
  console.clear()
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(value)
}

;(async () => {
  // TODO: return all the shits on initialize, not just an array of files
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  _.data = await util.initialize(musicDir, emitter)
  updateView()
})()

