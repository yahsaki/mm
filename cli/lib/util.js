const fs = require('fs')
const path = require('path')
const directory = require('./directory')
const metadata = require('./metadata')
//const data = require('./data')

module.exports = {
  dataFileName: '.m3d', // music metadata manager data
  template: {
    base: {
      version: '0.0.0',
      createDate: null,
      updateDate: null,
      track: {},
    },
    track: {
      updateDate: null,
      number: null,
      title: null,
      tags: [],
    }
  },
  delay: ms =>
    new Promise(resolve =>
      setTimeout(() => resolve(), ms)),
  initialize: async function(musicDir, emitter) {
    const data = {}
    const pathObj = path.parse(__dirname)
    const dataDir = path.join(pathObj.dir, 'data')
    const audioFilePath = path.join(dataDir, 'files.json')
    this.fs.mkdir(dataDir)
    // first check if thang exists
    data.audioFiles = this.fs.readJson(audioFilePath)
    if (data.audioFiles) {
      emitter.emit('log', 'files json already genereated')
      return data
    }

    emitter.emit('log', `scanning for audio files`)
    data.audioFiles = await directory.scan(musicDir)
    emitter.emit('log', `${data.audioFiles.length} audio files found`)
    for (let i = 0; i < data.audioFiles.length; i++) {
      const file = data.audioFiles[i]
      const audioFileData = await metadata.get(file.path)
      data.audioFiles[i] = {
        ...file,
        ...audioFileData,
      }
    }
    emitter.emit('log', `metadata fetched`)
    this.fs.writeJson(audioFilePath, data.audioFiles)
    emitter.emit('log', `files saved to '${audioFilePath}'`)
    return data
  },
  fetchDataFile: function(track, emitter) {
    const pathObj = path.parse(track.path)
    let file = this.fs.readJson(path.join(pathObj.dir, this.dataFileName))
    if (!file) {
      emitter.emit('log', `no data file for track '${track.title}'`)
      return
    }
    return file.track[track.title]
  },
  saveTags: function(tags, track, emitter) {
    const date = new Date()
    // at this point we assume everything we require is present

    // get current data file
    const pathObj = path.parse(track.path)
    // data files should be stored in the same dir as the audio files
    let file = this.fs.readJson(path.join(pathObj.dir, this.dataFileName))
    if (file) {
      file.updateDate = date.toISOString()
      // update file
      if (!file.track[track.title]) {
        file.track[track.title] = {
          title: track.title,
          updateDate: date.toISOString(),
          number: track.track,
          tags: tags // already lowered
        }
        emitter.emit('log', 'track added')
        this.fs.writeJson(path.join(pathObj.dir, this.dataFileName), file)
        return file.track[track.title].tags
      }

      // check for existing
      for (let tag in tags) {
        if (!file.track[track.title].tags.find(x => x === tags[tag])) {
          file.track[track.title].tags.push(tags[tag])
        } else {
          // if rating, replace rating if exists and log history,
          // otherwise nothing? not exactly but whatever
        }
      }
      emitter.emit('log', 'track updated')
      this.fs.writeJson(path.join(pathObj.dir, this.dataFileName), file)
      return file.track[track.title].tags
    }

    // create file
    file = this.template.base
    file.createDate = date.toISOString()
    file.updateDate = date.toISOString()
    file.track[track.title] = {
      title: track.title,
      updateDate: date.toISOString(),
      number: track.track,
      tags: tags // already lowered
    }
    if (track.album) { file.album = track.album }
    if (track.albumArtist) {
      file.track[track.title].albumArtist = track.albumArtist
    }
    emitter.emit('log', 'track created')
    this.fs.writeJson(path.join(pathObj.dir, this.dataFileName), file)
    return file.track[track.title].tags
  },
  refresh: function() {
    // rescan files n shit
  },
  fs: {
    mkdir: (dir) => {
      try {
        fs.mkdirSync(dir, {recursive: true})
      } catch (err) {
        if (err.code !== 'EEXIST') { throw err }
      }
      return
    },
    readJson: (filePath) => {
      if (!filePath?.length) { throw new Error('readJson: invalid args') }
      let binary
      try {
        // I dont think this is binary... whatever
        binary = fs.readFileSync(filePath)
      } catch(err) {
        return
      }

      if (!binary) { return }
      try {
        return JSON.parse(Buffer.from(binary).toString())
      } catch(err) { throw err }
    },
    writeJson: function(filePath, data) {
      if (!filePath?.length || typeof data !== 'object') {
        throw new Error(`writeJson: invalid args`)
      }
      const parsed = path.parse(filePath)
      //this.fs.mkdir(parsed.dir)
      // other tools seem to add a newline char at the end
      //fs.writeFileSync(filePath, JSON.stringify(data,' ',2)) // more readable
      fs.writeFileSync(filePath, JSON.stringify(data))
      return
    },
  },
  shuffle: (array) => {
    let currentIndex = array.length, temporaryValue, randomIndex
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
  },
}
