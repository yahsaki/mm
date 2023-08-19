const spawn = require('child_process').spawn
const klaw = require('klaw')
const path = require('path')

module.exports = {
  dataFileName: '.mm_data',
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
  delay: ms =>
  new Promise(resolve =>
    setTimeout(() => resolve(), ms)),
  scanMusicDir: (dir) => {
    // the way we are using it wont work if album stuffs tracks in folders(IE cd1, cd2, etc)
    const trackTypes = ['.ogg','.mp3','.flac','.wav']
    const imageTypes = ['.jpg','.png']
    const response = {}
    const warnings = []
    const baseObj = path.parse(dir)
    const divider = baseObj.root === 'C:\\' ? '\\' : '/'
    console.log('baseObj', baseObj, divider)

    return new Promise((resolve, reject) => {
      klaw(dir)
      .on('data', item => {
        const itemObj = path.parse(item.path)
        const itemArr = item.path.split(dir)[1].split(divider)

        // this is my bandcamp specific setup... might need to revise for other sources,
        // change other sources to use the same setup or create a different fn for other sources
        if (itemArr.length === 1) {
          // root dir
          return
        }
        if (itemArr.length === 2) {
          // label
          const label = itemArr[1]
          if (!response[label]) {
            console.log(`label '${label}' created`)
            response[label] = { logo: null, banner: null }
          }
          return
        }
        if (itemArr.length === 3) {
          // album, logo or banner
          const label = itemArr[1]
          if (itemObj.ext.length) {
            // logo or banner
            if (imageTypes.find(x => x === itemObj.ext.toLowerCase())) {
              if (itemObj.name.toLowerCase() === 'banner') response[label].banner = item.path
              if (itemObj.name.toLowerCase() === 'logo') response[label].logo = item.path
              // I keep naming these covers...
              if (itemObj.name.toLowerCase() === 'cover') {
                const warning = `found cover where logo should be '${item.path}'`
                console.error(`WARN: ${warning}`)
                warnings.push(warning)
              }
            }
          } else {
            const album = itemArr[2]
            if (!response[label][album]) {
              console.log(`album '${album}' created`)
              response[label][album] = { cover: null, track: {} }
            }
          }
          return
        }
        //console.log('ia', itemArr)
        
        // labels, albums, logos and banners handled already at this point. if
        // we find a folder here, thats an issue. we should always have a cover,
        // and the files should only be supported audo files

        const label = itemArr[1]
        const album = itemArr[2]
        // order isnt promised, recheck if label/album initialized
        if (!response[label]) {
          console.log(`label '${label}' created`)
          response[label] = { logo: null, banner: null }
        }
        if (!response[label][album]) {
          console.log(`album '${album}' created`)
          response[label][album] = { cover: null, track: {} }
        }

        if (!itemObj.ext.length && itemObj.name !== '.mm_data') {
          const warning = `found folder '${itemObj.name}' in album '${album}'`
          console.error(`WARN: ${warning}`)
          warnings.push(warning)
          return
        }
        
        // no folders beyond this point
        if (trackTypes.find(x => x === itemObj.ext.toLowerCase())) {
          // I swear I intended for more to be here? might as well be an array
          response[label][album].track[itemObj.name] = {path:item.path}
          // quick check if its one of those files I fucked up and renamed. this
          // is a temp check, not even close to accurate
          if ('01'.includes(itemObj.name[0]) && '123456789'.includes(itemObj.name[1])) {
            reject(`track might be one of those fucked up renames '${item.path}' delete this check when folder purged`)
          }
        }
        if (imageTypes.find(x => x === itemObj.ext.toLowerCase()) && itemObj.name === 'cover') {
          response[label][album].cover = item.path
        }
      })
      .on('end', () => { resolve({warnings,data:response}) })
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