const util = require('./lib/util')
const fs = require('fs')
const url = require('url')
const path = require('path')

;(async () => {
  console.log('test')
  //console.log(fs.statSync(`C:\\Users\\yahsaki\\projects\\mm`))
  //await scanDirectory('')
  //process.exit()
  //console.log('ad', await fetchAlbumData())
  //await saveTags()
  await removeTags()
  process.exit()
  await writeSomethingInSongDirectory()
  //await getCurrentSongStatus()
})()

async function removeTags() {
  const tags = ['does_not_exist', 'BUTT']
  let data = await fetchAlbumData()
  const date = new Date()

  const existingTags = []
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].toLowerCase()
    const index = data.album.track[data.key].tags.findIndex(x => x === tag)
    if (index > -1) {
      data.album.track[data.key].tags.splice(index, 1)
      existingTags.push(tag)
    }
  }
  if (!existingTags.length) {
    console.log('nothing to modify');return;
  }

  for (let i = 0; i < existingTags.length; i++) {
    data.album.track[data.key].history.tags.splice(0, 0, {
      ...util.template.tagHistory,
      date: new Date().toISOString(),
      action: util.tagAction.remove,
      tag: existingTags[i],
    })
  }
  data.album.updateDate = date.toISOString()
  data.album.track[data.key].updateDate = date.toISOString()
  console.log('latest album data', JSON.stringify(data.album, ' ', 2))
  fs.writeFileSync(data.dataFilePath, JSON.stringify(data.album,' ',2),{encoding:'utf-8'})
}

async function saveTags() {
  // make sure to lower all provided tags at this point
  // spaces not allowed in tag names
  const tags = ['test', 'butt']
  let data = await fetchAlbumData()
  console.log('album data', data.album)
  console.log('current track', data.currentTrack)

  const uniqueTags = []
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].toLowerCase()
    console.log('tag', tag)
    if (!data.album.track[data.key].tags.find(x => x === tag)) uniqueTags.push(tag)
  }
  if (!uniqueTags.length) {
    console.log('nothing to modify');return;
  }
  console.log('unighq', uniqueTags)
  data.album.track[data.key].tags = data.album.track[data.key].tags.concat(uniqueTags)
  for (let i = 0; i < uniqueTags.length; i++) {
    data.album.track[data.key].history.tags.splice(0, 0, {
      ...util.template.tagHistory,
      date: new Date().toISOString(),
      action: util.tagAction.add,
      tag: uniqueTags[i],
    })
  }
  data.album.updateDate = date.toISOString()
  data.album.track[data.key].updateDate = date.toISOString()
  console.log('latest album data', JSON.stringify(data.album, ' ', 2))
  fs.writeFileSync(data.dataFilePath, JSON.stringify(data.album,' ',2),{encoding:'utf-8'})
}

async function getCurrentTrack() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  const playlist = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/playlist.json'))
  //console.log('playlist', playlist.children.find(x => x.name === 'Playlist'))
  const node = playlist.children.find(x => x.name === 'Playlist')
  let track = node.children.find(x => x.id === `${status.currentplid}`)
  if (track) {
    return status.information.category.meta
  }
  return
}
async function fetchAlbumData() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  const playlist = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/playlist.json'))
  //console.log('playlist', playlist.children.find(x => x.name === 'Playlist'))
  const node = playlist.children.find(x => x.name === 'Playlist')
  let track = node.children.find(x => x.id === `${status.currentplid}`)
  // this will probably never happen
  if (!track) { throw Error(`faled to find track '${status.information.category.meta.title}' plid ${status.currentplid} in playlist`) }
  const fp = decodeURIComponent(track.uri.split('file:///')[1])
  const fpObj = path.parse(fp)
  const dataFilePath = path.join(fpObj.dir, util.dataFileName)
  if (fs.existsSync(dataFilePath)) {
    console.log('file exists', dataFilePath)
    return {
      album: JSON.parse(fs.readFileSync(dataFilePath)),
      currentTrack: status.information.category.meta,
      key: `${status.information.category.meta.track_number}:${status.information.category.meta.title}`,
      dataFilePath,
    }
  }

  console.log('data file does not eixst', fpObj.dir)
  // build data
  //const tracks = await util.getTracks(fpObj.dir)
  const date = new Date()
  const data = {
    album: {
      ...util.template.base,
      createDate: date.toISOString(),
      updateDate: date.toISOString(),
    },
    currentTrack: status.information.category.meta,
    key: `${status.information.category.meta.track_number}:${status.information.category.meta.title}`,
    dataFilePath,
  }
  data.album.track[data.key] = {
    ...util.template.track,
    createDate: date.toISOString(),
    updateDate: date.toISOString(),
    trackNumber: status.information.category.meta.track_number,
    title: status.information.category.meta.title,
  }
  return data
}

async function writeSomethingInSongDirectory() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
  const playlist = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/playlist.json'))
  //console.log('playlist', playlist.children.find(x => x.name === 'Playlist'))
  const node = playlist.children.find(x => x.name === 'Playlist')
  let song = node.children.find(x => x.id === `${status.currentplid}`)
  if (!song) { throw Error('faled to find song') }
  console.log('found song', song)
}

// I dont want to use klaw anymore for some reason, so lets implement our own
async function scanDirectory(folderPath) {
  // I gave up for now, just need this tool created asap
}

async function getCurrentSongStatus() {
  const res = await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json')
  console.log('res', JSON.parse(res))
  console.log(res)
}
//const http = require('http')
/*
;(async () => {
  console.log('test')
  
  const res = await request('http', {
    method: 'GET',
    host: 'localhost',
    path: '/',
    port: 8080,
  })
  const result = await request('http', {
    method: 'GET',
    host: 'localhost',
    path: '/requests/status.json',
    port: 8080,
    //auth: 'password:password',
    headers: {
      Authorization: `Basic :password`,
    },
  })
  console.log('login res', result)
})()


function request(type, request, payload = false) {
  return new Promise((resolve, reject) => {
    const query = Object.assign({}, request);
    if (payload) {
      query.headers = {
        ...query.headers,
        'Content-Length': Buffer.byteLength(payload),
      };
    }
    const client = type === 'https' ? https : http
    const req = client.request(query, res => {
      if (res.statusCode < 200 || res.statusCode > 399) {
        //console.log('response', Buffer.from(Buffer.concat(body)).toString('utf8'))
        reject(Object.assign(new Error(`Failed to load page, status code: ${res.statusCode}`), {
          context: {
            body: payload,
            request,
          },
        }));
      }
      const body = [];
      res.on('data', body.push.bind(body));
      res.on('end', () => {
        resolve(Buffer.concat(body))
      });
    });
    req.on('error', err => reject(err));
    req.on('socket', socket => {
      socket.setTimeout(30000);
      socket.on('timeout', () => {
        req.abort();
      });
    });
    if (payload) req.write(payload);
    req.end();
  })
}*/
