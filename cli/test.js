const dir = require('./lib/directory')
const metadata = require('./lib/metadata')
const audio = require('./lib/audio')
const util = require('./lib/util')
const path = require('path')
const EventEmitter = require('node:events')
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter()

let globalAtTime
emitter.on('log', (data) => {
  console.log(data)
})
emitter.on('on_song_play', (data) => {
  //console.log('song playing', data)
  const arr = data.split(' ')
  if (arr[1].length === 11) {
    const atTime = arr[1]
    globalAtTime = atTime
    const endTime = arr[2].substring(1, arr[2].length-1)
    console.log(atTime)
  }
})
emitter.on('on_song_end', (data) => {
  console.log('song ended')
})

;(async () => {
  //await scanDir()
  //await getMetadata()
  //await startAndStopSong()
  //await startStopAndResumeSong()
  await initialize()
})()

async function initialize() {
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  await util.initialize(musicDir, emitter)
}

async function startStopAndResumeSong() {
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  const data = await dir.scan(musicDir)


  audio.play(data[2].path, emitter)
  setTimeout(() => {
    audio.stop()
  }, 5000)
  setTimeout(() => {
    audio.resume(data[2].path, globalAtTime, emitter)
  }, 7000)
}

async function startAndStopSong() {
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  const data = await dir.scan(musicDir)


  audio.play(data[2].path, emitter)
  setTimeout(() => {
    audio.stop()
  }, 36000)
}

async function getMetadata() {
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  const data = await dir.scan(musicDir)

  const md = await metadata.get(data[2].path)
  console.log('metadata', md)
}

async function scanDir() {
  const pathObj = path.parse(__dirname)
  const musicDir = path.join(pathObj.dir, 'example')
  const data = await dir.scan(musicDir)
  console.log(`found ${data.length} audio files(will support otehr shit one day)`)
}
