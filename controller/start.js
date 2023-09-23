import Server from '/-controller/Server.js'
import config from '/-config'

const conf = await config('controller')
const PORT = process.env[conf.port.env] || conf.port.def
const IP = process.env[conf.ip.env] || conf.ip.def

Server.follow(PORT, IP)