const spawn = require('child_process').spawn
const klaw = require('klaw')
const path = require('path')

module.exports = {
  dataFileName: '.mm_test_data',
  template: {
    base: {
      version: '0.0.0',
      createDate: null,
      updateDate: null,
      track: {},
    },
    track: {
      updateDate: null,
      trackNumber: null,
      title: '',
      rating: null,
      tags: [],
      history: {
        tags: [],
        rating: [],
      },
    },
    tagHistory: {
      date: null,
      action: null,
      tag: null,
    }
  },
  tagAction: {add:'add',remove:'remove'},
  getTracks: (dir) => {
    // the way we are using it wont work if album stuffs tracks in folders(IE cd1, cd2, etc)
    const types = ['.ogg','.mp3','.flac','.wav']
    const data = []
    return new Promise((resolve, reject) => {
      klaw(dir)
      .on('data', item => {
        const thing = path.parse(item.path)
        console.log(thing)
        if (thing.ext.length && types.find(x => x === thing.ext.toLowerCase())) {

          process.exit()
        }
      })
      .on('end', () => { resolve(data) })
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