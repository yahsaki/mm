const util = require('./lib/util')
const fs = require('fs')

;(async () => {
  console.log('test')
  //console.log(fs.statSync(`C:\\Users\\yahsaki\\projects\\mm`))
  //await scanDirectory('')
  //process.exit()

  await writeSomethingInSongDirectory()
  //await getCurrentSongStatus()
})()

async function writeSomethingInSongDirectory() {
  const status = JSON.parse(await util.execute('curl -s -u :password http://127.0.0.1:8080/requests/status.json'))
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
