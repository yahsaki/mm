const spawn = require('child_process').spawn
const _ = { p: null }

module.exports = {
  playing: () => !!_.p,
  play: (audioFilePath, emitter) => {
    if (_.p) { _.p.kill();_.p = null }
    const promise = new Promise((resolve, reject) => {
      _.p = new spawn('play', [`${audioFilePath}`])
      _.p.stdout.on('data', data => {})
      _.p.stderr.on('data', data => {
        emitter.emit('on_song_play', Buffer.from(data).toString('utf8'))
      })
      _.p.on('close', code => {
        emitter.emit('on_song_end')
        resolve()
      })
    })
    return promise
  },
  resume: (audioFilePath, atTime, emitter) => {
    if (_.p) { _.p.kill();_.p = null }
    const promise = new Promise((resolve, reject) => {
      _.p = new spawn('play', [`${audioFilePath}`, 'trim', `${atTime}`])
      _.p.stdout.on('data', data => {})
      _.p.stderr.on('data', data => {
        emitter.emit('on_song_play', Buffer.from(data).toString('utf8'))
      })
      _.p.on('close', code => {
        emitter.emit('on_song_end')
        resolve()
      })
    })
    return promise
  },
  stop: () => {
    if (_.p) {
      _.p.kill()
      _.p = null
    }
  }
}
