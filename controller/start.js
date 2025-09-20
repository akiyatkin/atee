import Server from '/-controller/Server.js'
import config from '/-config'




import('/rest.js').then(r => r.default).catch(e => console.log('/rest.js в корне не найден или в нём есть ошибка'))

const conf = await config('controller')
const PORT = process.env[conf.port.env] || conf.port.def
const IP = process.env[conf.ip.env] || conf.ip.def

Server.follow(PORT, IP)



