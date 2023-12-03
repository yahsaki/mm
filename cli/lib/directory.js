const klaw = require('klaw')
const path = require('path')

supportedAudioFiles = ['.ogg']

module.exports = {
  scan: (dirName) => {
    const data = []
    const dirObj = path.parse(dirName)
    const promise = new Promise(resolve =>
      klaw(dirName)
        .on('data', item => {
          const fileObj = path.parse(item.path)
          if (fileObj.ext.length) {

            if (supportedAudioFiles.find(x => x === fileObj.ext.toLowerCase())) {
              data.push({
                path: item.path,
              })
            }
          }
        })
        .on('end', () => resolve(data)))
      return promise
  },
}
