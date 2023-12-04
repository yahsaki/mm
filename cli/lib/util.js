const fs = require('fs')
const path = require('path')
const directory = require('./directory')
const metadata = require('./metadata')

module.exports = {
  dataFileName: '.m3d', // music metadata manager data
  delimiter: '¦¦',
  template: {
    base: {
      version: '0.0.0',
      createDate: null,
      updateDate: null,
      track: {},
      tags:[],
      comments:[],
      history: {tags:[],ratings:[]},
    },
    track: {
      played: false,
      updateDate: null,
      //number: null, // only applies to albums
      title: null,
      tags: [],
      comments:[],
      history: {tags:[],ratings:[]},
    }
  },
  delay: ms =>
    new Promise(resolve =>
      setTimeout(() => resolve(), ms)),
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
    writeJson: function(filePath, data, formatted = false) {
      if (!filePath?.length || typeof data !== 'object') {
        throw new Error(`writeJson: invalid args`)
      }
      const parsed = path.parse(filePath)
      //this.fs.mkdir(parsed.dir)
      // other tools seem to add a newline char at the end
      if (formatted) {
        fs.writeFileSync(filePath, JSON.stringify(data,' ',2)) // more readable
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data))
      }
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
