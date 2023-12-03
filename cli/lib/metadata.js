const spawn = require('child_process').spawn

// TODO: support bpm
module.exports = {
  get: (audioFilePath) => {
    const promise = new Promise((resolve, reject) => {
      let text = ''
      const data = {}
      const p = new spawn('ffmpeg', ['-i', `${audioFilePath}`, '-f', 'ffmetadata'])
      p.stdout.on('data', data => {
        console.log('stdout', data)
      })
      p.stderr.on('data', data => {
        const string = Buffer.from(data).toString('utf8')
        //console.log('stderr', string)
        text += string
      })
      p.on('close', code => {
        // code is 1 because the command is missing the file name prop
        //console.log('code', code)
        //console.log('res', text)
        const arr = text.split('\n')
        //console.log('ln', arr.length)
        for (let i = 0; i < arr.length; i++) {
          const trimmed = arr[i].trim()
          if (trimmed.startsWith('Duration: ')) {
            const durationString = trimmed.split('Duration: ')[1].split(',')[0]
            data.duration = durationString
          }
          if (trimmed.startsWith('TITLE')) {
            const title = trimmed.split(': ')[1]
            data.title = title
          }
          if (trimmed.startsWith('ARTIST')) {
            const artist = trimmed.split(': ')[1]
            data.artist = artist
          }
          if (trimmed.startsWith('DATE')) {
            const date = trimmed.split(': ')[1]
            data.date = date
          }
          if (trimmed.startsWith('ALBUM')) {
            const album = trimmed.split(': ')[1]
            data.album = album
          }
          if (trimmed.startsWith('track')) {
            const track = trimmed.split(': ')[1]
            data.track = parseInt(track)
          }
          if (trimmed.startsWith('album_artist')) {
            const albumArtist = trimmed.split(': ')[1]
            data.albumArtist = albumArtist
          }
        }
        resolve(data)
      })
    })
    return promise
  }
}
