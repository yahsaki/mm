const fs = require('fs')
const path = require('path')
const directory = require('./directory')
const metadata = require('./metadata')
//const data = require('./data')

module.exports = {
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
