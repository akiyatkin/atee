// import url from 'node:url'



// import { createRequire } from 'node:module';
// const project_root = url.pathToFileURL(process.cwd()).href + '/'
// const projectRequire = createRequire(project_root);
// const src = projectRequire.resolve('file-icon-vectors/dist/icons/vivid/pdf.svg');



//const src = await import.meta.resolve('file-icon-vectors/dist/icons/vivid/pdf.svg')
//const src = await import.meta.resolve('file-icon-vectors', project_root) ///gulpfile.js

//const href = new URL('file-icon-vectors/dist/icons/vivid/pdf.svg', project_root).href;
//console.log(src)

import Server from '/-controller/Server.js'
import config from '@atee/config'


import('/rest.js').then(r => r.default).catch(e => console.log('/rest.js в корне не найден или в нём есть ошибка', e))

const conf = await config('controller')
const PORT = process.env[conf.port.env] || conf.port.def
const IP = process.env[conf.ip.env] || conf.ip.def

Server.follow(PORT, IP)



