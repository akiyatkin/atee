import module from 'node:module'
module.register('./loader.js', import.meta.url)