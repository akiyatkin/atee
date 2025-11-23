//depricated use start.js с --import

import module from 'node:module';
module.register('../overriding/loader.js', import.meta.url);

const Server = await import('./Server.js').then(r => r.default)
const config = await import('@atee/config').then(r => r.default)

await import('/-rest.js').then(r => r.default).catch(e => console.log('/rest.js в корне не найден или в нём есть ошибка', e))

const conf = await config('controller')
const PORT = process.env[conf.port.env] || conf.port.def
const IP = process.env[conf.ip.env] || conf.ip.def

Server.follow(PORT, IP)



