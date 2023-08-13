const spawn = require('child_process').spawn
const klaw = require('klaw')
const path = require('path')

module.exports = {
  template: {
    rating: -1,
    version: '0.0.0',
    tags: [],
    history: {
      tags: [],
      rating: [],
    },
  },
  scanDir: (dir) => {
    klaw(dir)
    .on('data', item => {
      const thing = path.parse(item.path)
      console.log(thing)
      // just realized I dont need to scan directory initially...
      process.exit()
    })
  },
  // doesnt support whitespaces in quotes unfortunately
  execute: (commandString) => {
    const args = commandString.split(' ')
    const command = args.splice(0, 1)[0]
    let txt = '' // append output here, for some reason?
    const promise = new Promise((resolve, reject) => {
      const p = spawn(command, args)
      p.stdout.on('data', (data) => {
        //console.log(`stdout: ${data}`)
        txt += `${data}\n`
      })
      p.stderr.on('data', (data) => {
        //console.error(`stderr: ${data}`)
        txt += `${data}\n`
      })
      p.on('close', (code) => {
        if (code === 0) resolve(txt)
        else {
          resolve(txt)
        }
      })
    })
    return promise
  },
}