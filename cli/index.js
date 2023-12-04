const lib = require('./lib')
const audio = require('./lib/audio')
const path = require('path')
const EventEmitter = require('node:events')
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter()
const readline = require('node:readline')
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) { process.stdin.setRawMode(true) }

/*
231203:
  tags.json and tags in memory will be out of date as soon as one is added/removed,
  and we have no recourse except to rescan everything. im a bit too lazy to try and
  keep it in sync, or more likely I dont want to add such dirty code to this pile of
  shit as is
*/
const _ = {
  mode: null,
  subMode: null,
  current: null,
  locked: false,
  info: {
    mode: {
      play: 'play',
    },
    subMode: {
      play: {
        input: 'input',
        navigate: 'navigate',
      },
    },
    songState: {
      playing: 'playing',
      paused: 'paused',
    }
  },
  // updateView() gets called before we hit disk making any code that depends
  // on it fail. lots of fixes to this, but here we go for now
  state: {},
  settings:{logSize:5},
  // lots o data to hit
  // TODO: dont let commands like play work until its finished
  initializationComplete: false,
  callback: {
    onSongEnd: null,
  }
}

const logs = []
emitter.on('log', (data) => {
  log(data)
  updateView()
})
emitter.on('state_initialize', data => { _.state = data })
emitter.on('playlist_initialize', data => { _.state.playlist = data })
emitter.on('on_song_play', (data) => {
  const arr = data.split(' ')
  if (arr[1] && arr[1].length === 11) {
    const atTime = arr[1]
    _.atTime = atTime
    const endTime = arr[2].substring(1, arr[2].length-1)

    /*if (!_.callback.onSongEnd) {
      _.callback.onSongEnd = () => { changeTrack({seek:1}) }
    }*/
    updateView()
  }
})
emitter.on('on_song_end', (data) => {
  if (_.mode === _.info.mode.play && _.state?.playlist) {
    // TODO: mark track as played herez
    changeTrack({seek:1})
  }
  /*if (typeof _.callback.onSongEnd === 'function') {
    _.callback.onSongEnd()
    _.callback.onSongEnd = null
  }*/
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
        case _.info.subMode.play.input: {
          inputMode = true
          if (key.name === 'escape') {
            log(`exiting input mode`)
            input.length = 0
            _.subMode = null
          }
          if (key.name === 'return') {
            log(`doing something with this input '${input.join('')}'`)
            onSubmit()
          }
        } break
        default: {
          // need to learn what the arrow names are
          if (key.name === 'n') {
            changeTrack({seek:1,manual:true})
          }
          if (key.name === 'p') {
            changeTrack({seek:-1,manual:true})
          }
          if (key.name === 'i') {
            log(`(((d)elete)t)ag, (((d)elete)c)omment, (((d)elete)r)ating`)
            _.subMode = _.info.subMode.play.input
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
      if (key.name === 'return' || key.name === 'space' || key.name === '0') {
        // basically any input goes here for now
        if (!_.state || !_.state.playlist) {
          throw Error(`state not in correct format`)
        }

        const track = lib.temp.getPlaylistTrack(
          _.state.playlist.playlistPath,
          _.state.playlist.index,
          emitter
        )
        if (track) {
          clear()
          _.current = {...track,tags:[],comments:[]}
          playCurrent()
        }
      }
      if (false) {
        log('time to play something!')
        const randomSong = _.data.files[Math.floor(Math.random() * _.data.files.length)]
        _.current = {...randomSong}
        _.mode = _.info.mode.play
        _.atTime = null
        const trackData = lib.fetchDataFile(_.current, emitter)
        if (trackData) { _.current.tags = trackData.tags }
        else { _.current.tags = [] }
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
  for (let i = 0; i < _.settings.logSize; i++) {
    if (logs[i]) { arr.push(logs[i]) }
  }
  const logText = `\n-------------logs-------------\n${arr.join('\n')}`

  let view = ''
  switch(_.mode) {
    case _.info.mode.play: {
      if (_.state?.playlist) {
        view += `playing ${_.state.playlist.index}`
      } else {
        view += 'playing rando song'
      }

      if (_.current.state === _.info.songState.paused) { view += '(paused)\n'}
      else { view += '\n' }
      view += `title: ${_.current.title}\n`
      if (_.current.album) {
        view += `album: ${_.current.album}\n`
      }
      view += `artist: ${_.current.artist}\n`
      if (_.current.tags) {
        view += `tags: ${_.current.tags.join(', ')}\n`
      } else {
        view += `tags: N/A\n`
      }
      if (_.atTime) {
        view += `${_.atTime} - ${_.current.duration}\n`
      }
      if (_.subMode === _.info.subMode.play.input) {
        view += `input> ${input.join('')}\n`
      }
    } break
    default: {
      view += `${_.mode} iirashaimase. press enter,space or something to play playlist`
    } break
  }
  view += logText

  print(view)
}

function onSubmit() {
  if (!input.length) { log(`no input provided`);return }

  // this only applies to play mode
  const request = input.join('').split(' ')
  switch (request[0]) {
    case 't':
    case 'dt': {
      saveTags()
    } break
    case 'c':
    case 'dc': {
      saveComment()
    } break
    case 'r':
    case 'dr': {
      saveRating()
    } break
    default: {
      log(`command '${request[0]}' unknown. accepted commands: [d]t, [d]c, [d]r`)
    } break
  }
}

function changeTrack(args) {
  if (_.locked === true) return
  _.locked = true
  const seek = args.seek
  const tempIndex = _.state.playlist.index + seek
  const track = lib.temp.getPlaylistTrack(
    _.state.playlist.playlistPath,
    tempIndex,
    emitter
  )
  if (!track) {
    log(`no track at index ${tempIndex}, seeked ${seek}.(resetting everything now)`)
    clear();return
  }

  _.state.playlist.index = tempIndex
  audio.stop()
  _.current = {...track,tags:[],comments:[]}
  playCurrent(args)
}
function playCurrent(args) {
  // dont really want to call clear() since subModes and others can be removed
  // when we dont want that
  audio.stop()
  const trackData = lib.fetchDataFile(_.current, emitter)
  if (trackData) {
    _.current.tags = trackData.tags
    _.current.comments = trackData.comments
    //_.current.ratings = trackData.ratings
  }
  _.mode = _.info.mode.play
  audio.play(_.current.path, emitter)
  if (args?.manual === true) {
    log(`you hit the button!`)
  }
  setTimeout(() => { _.locked = false }, 500)
}
function saveRating() {
  log('saving ratings unsupported')
}
function saveComment() {
  log('saving comments unsupported')
}
function saveTags() {
  //if (!input.length) { log(`write some chars`);return }
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
  // leaving splicing up to the nested function in case of multiple args
  const command = payload.splice(0, 1)[0]
  if (command === 'dt') {
    log(`attempting to delete tags ${payload.join(', ')}`)
    _.current.tags = lib.deleteTags(payload, _.current, emitter)
  } else {
    _.current.tags = lib.saveTags(payload, _.current, emitter)
  }
  input.length = 0
}
function print(value) {
  console.clear()
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(value)
}
function clear() {
  audio.stop()
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
  const musicDir = path.join(pathObj.dir, 'example1')
  _.data = await lib.initialize(musicDir, emitter)
  updateView()
})()

