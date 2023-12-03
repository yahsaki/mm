const fs = require('fs')

class Logger {
  constructor() {
    try { fs.mkdirSync('./logs') } catch(err) {}
    try { fs.writeFileSync('./logs/log.txt') } catch(err) {}
    // dont need to truncate, at least for now
    //try { fs.truncateSync('./logs/log.txt') } catch(err) {}
    
    this.log('logs initialized')
  }
  log(message) {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const string = `${new Date().toISOString()}-[HP-${Math.round(used * 100) / 100}MB] ${message}\n`
    fs.appendFileSync('./logs/log.txt', string, {encoding:'utf8'})
  }
}

module.exports = Logger