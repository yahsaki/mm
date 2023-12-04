// TODO: move initalize, save<things> and shit here, leaving stateless shit in util.js

const path = require('path')
const directory = require('./directory')
const metadata = require('./metadata')
const util = require('./util')
//const data = require('./data')

function initializeDataFile(track, emitter) {
  // track is a dependency, meaning we cant create data files without a track initially.
  // we might want to do that someday
  const date = new Date()
  const file = itself.template.base
  file.createDate = date.toISOString()
  file.updateDate = date.toISOString()
  initializeDataFileTrack(file, track, emitter)
  return file
}
function initializeDataFileTrack(file, track, emitter) {
  // if the track doesnt exist but the file does
  const date = new Date()
  file.track[track.title] = {
    ...itself.template.track,
    title: track.title,
    updateDate: date.toISOString(),
  }
  if (track.album) { file.album = track.album }
  if (track.albumArtist) {
    file.track[track.title].albumArtist = track.albumArtist
  }
  if (track.track) { file.track[track.title].number = track.track }
  return file
}
module.exports = {
  initialize: async function(musicDir, emitter) {
    let data = {}
    const pathObj = path.parse(__dirname)
    const dataDir = path.join(pathObj.dir, 'data')
    const playlistDir = path.join(dataDir, 'playlists')
    const filePath = path.join(dataDir, 'files.json')
    const tagPath = path.join(dataDir, 'tags.json')
    const statePath = path.join(dataDir, 'state.json')
    util.fs.mkdir(dataDir)
    util.fs.mkdir(playlistDir)

    // TODO: if state is dirty, regen everything

    // ==== settings/state setup
    // we dont have a skeleton settings defined anywhere yet
    let state = util.fs.readJson(statePath)
    if (!state) {
      state = {
        dirty: false, // when anything file related is updated, mark this true
        /*settings: { // puttings settings inside state like this SUCKS
          logSize: 5, // how many logs to show
        },*/
        //playlist: null, // fuck playlist too atm
      }
      util.fs.writeJson(statePath, state, true)
      emitter.emit('log', `state file created`)
      emitter.emit('state_initialize', state)
    }

    // ==== music files
    data.files = util.fs.readJson(filePath)
    data.tags = util.fs.readJson(tagPath)
    if (data.files && data.tags) {
      emitter.emit('log', 'data files already genereated')
      //return data
    }

    emitter.emit('log', `scanning for audio files`)
    data = await directory.scan(musicDir)
    emitter.emit('log', `${data.files.length} audio files found`)
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i]
      const audioFileData = await metadata.get(file.path)
      data.files[i] = {
        ...file,
        ...audioFileData,
      }
    }
    emitter.emit('log', `metadata fetched`)
    util.fs.writeJson(filePath, data.files)
    util.fs.writeJson(tagPath, data.tags)
    emitter.emit('log', `data saved to '${dataDir}'`)

    // ==== playlist
    // idk wtf its supposed to look like atm
    const allPlaylistPath = path.join(playlistDir, 'all.json')
    //const allPlaylist = this.shuffle(this.map(x => ({path: x.path}))

    // shit mayne I could just put the indexes in here pointing to files.json.
    // we could also go back to paths and ffmpeg data hot and live
    const allPlaylist = util.shuffle(data.files.map(x => ({ ...x }) ))
    util.fs.writeJson(allPlaylistPath, allPlaylist)
    emitter.emit('playlist_initialize', {
      index: 0,
      playlistPath: allPlaylistPath,
    })
    emitter.emit('log', 'everything playlist generated')

    return data
  },
  fetchDataFile: function(track, emitter) {
    const pathObj = path.parse(track.path)
    let file = util.fs.readJson(path.join(pathObj.dir, util.dataFileName))
    if (!file) {
      emitter.emit('log', `no data file for track '${track.title}'`)
      return
    }
    return file.track[track.title]
  },
  saveComment: function(comment, track, emitter) {
    // TODO: support deleting comments and CD'ing comments on albums
    const date = new Date()
    const pathObj = path.parse(track.path)
    let file = util.fs.readJson(path.join(pathObj.dir, util.dataFileName))
    if (file) {
      const date = new Date()
      file.updateDate = date.toISOString()
      if (!file.track[track.title]) {
        initializeDataFileTrack(file, track, emitter)

        file.track[track.title].comments = [comment]
        util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
        emitter.emit('log', 'track added')
        return file.track[track.title].comments
      }

      file.track[track.title].comments.push(comment)
      file.track[track.title].updateDate = date.toISOString()
      util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
      emitter.emit('log', 'comment added')
      return file.track[track.title].comments
    }

    file = initializeDataFile(track, emitter)
    file.track[track.title].comments = [comment]
    util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
    emitter.emit('log', 'file created')
    return file.track[track.title].comments
  },
  deleteTags: function(tags, track, emitter) {
    const date = new Date()
    const pathObj = path.parse(track.path)
    let file = util.fs.readJson(path.join(pathObj.dir, util.dataFileName))
    // you can run the delete command even though no tags exist for file/track
    if (!file) {
      emitter.emit('log', `deleting tags '${tags}' even though file '${track.path}' does not exist`);return
    }
    if (!file.track[track.title]) {
      emitter.emit('log', `file '${track.path}' exists but track '${track.title}' not found`);return
    }
    const removedTags = []
    for (let tag in tags) {
      const index = file.track[track.title].tags.findIndex(x => x === tags[tag])
      if (index > -1) {
        file.track[track.title].tags.splice(index, 1)
        removedTags.push(tags[tag])
      }
    }
    if (removedTags.length) {
      util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
      emitter.emit('log', `tags removed: ${removedTags.join(', ')}`)
    } else {
      emitter.emit('log', 'no tags removed')
    }
    return file.track[track.title].tags
  },
  saveTags: function(tags, track, emitter) {
    const date = new Date()
    // get current data file
    const pathObj = path.parse(track.path)
    // data files should be stored in the same dir as the audio files
    let file = util.fs.readJson(path.join(pathObj.dir, util.dataFileName))

    if (file) {
      file.updateDate = date.toISOString()
      // update file
      if (!file.track[track.title]) {
        initializeDataFileTrack(file, track, emitter)
        file.track[track.title].tags = tags // already lowered

        util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
        emitter.emit('log', 'track added')
        return file.track[track.title].tags
      }

      // check for existing
      const tagsAdded = []
      for (let tag in tags) {
        if (!file.track[track.title].tags.find(x => x === tags[tag])) {
          file.track[track.title].tags.push(tags[tag])
          tagsAdded.push(tags[tag])
        } else {
          // if rating, replace rating if exists and log history,
          // otherwise nothing? not exactly but whatever
          // NOTE: ratings moved into its own function
        }
      }

      if (tagsAdded.length) {
        file.track[track.title].updateDate = date.toISOString()
        util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
        emitter.emit('log', 'track updated')
        return file.track[track.title].tags
      } else {
        emitter.emit('log', 'no tags added')
        return file.track[track.title].tags
      }
    }

    // create file
    file = initializeDataFile(track, emitter)
    file.track[track.title].tags = tags

    util.fs.writeJson(path.join(pathObj.dir, util.dataFileName), file, true)
    emitter.emit('log', `file created`)
    return file.track[track.title].tags
  },
  refresh: function() {
    // rescan files n shit
  },
  helpers: {
    initialize: {
      // unbelievable hack having to pass 'this' as 'itself' to these methods but whatever.
      // I need to split out super logic-y functions like initialize and save<thing> from
      // generic things like this, fs, shuffle, etc anyway
      dataFile: function(itself, track, emitter) {
        // track is a dependency, meaning we cant create data files without a track initially.
        // we might want to do that someday
        const date = new Date()
        const file = itself.template.base
        file.createDate = date.toISOString()
        file.updateDate = date.toISOString()
        itself.helpers.initialize.dataFileTrack(itself, file, track, emitter)
        return file
      },
      dataFileTrack: function(itself, file, track, emitter) {
        // if the track doesnt exist but the file does
        const date = new Date()
        file.track[track.title] = {
          ...itself.template.track,
          title: track.title,
          updateDate: date.toISOString(),
        }
        if (track.album) { file.album = track.album }
        if (track.albumArtist) {
          file.track[track.title].albumArtist = track.albumArtist
        }
        if (track.track) { file.track[track.title].number = track.track }
        return file
      }
    },
  },
  temp: {
    getPlaylistTrack: function(playlistFilePath, index, emitter) {
      const playlist = util.fs.readJson(playlistFilePath)
      if (!playlist) {
        emitter.emit('log', `could not find playlist at dir '${playlistFilePath}'`);return
      }
      const track = playlist[index]
      if (!track) {
        emitter.emit('log', `no track at index ${index}, playlist track count: ${playlist.length}`)
        return
      }

      return track
    },
  },
}
