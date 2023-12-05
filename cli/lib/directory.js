const klaw = require('klaw')
const path = require('path')
const util = require('./util')
supportedAudioFiles = ['.ogg']

module.exports = {
  scan: (dirName) => {
    const res = { files: [], tags: {} }
    const dirObj = path.parse(dirName)
    const promise = new Promise(resolve =>
      klaw(dirName)
        .on('data', item => {
          const fileObj = path.parse(item.path)
          //console.log(fileObj)

          if (fileObj.name === util.dataFileName) {
            const file = util.fs.readJson(item.path)
            for (let title in file.track) {
              let key = title
              if (file.album) { key = `${file.album}${util.delimiter}${key}` }
              for (let i in file.track[title].tags) {
                const tag = file.track[title].tags[i]
                if (!res.tags[tag]) { res.tags[tag] = {files:[]} }
                if (!res.tags[tag].files.find(x => x === key)) {
                  // should gen uuids for every audio file or whatever. key is better
                  // than raw title compares but not perfect and will collide
                  res.tags[tag].files.push(key)
                }
              }
            }
          }

          if (fileObj.ext.length) {
            if (supportedAudioFiles.find(x => x === fileObj.ext.toLowerCase())) {
              res.files.push({
                path: item.path,
              })
            }
          }
        })
        .on('end', () => resolve(res)))
      return promise
  },
}
