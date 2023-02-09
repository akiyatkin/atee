import fs from 'fs/promises'
import { pathToFileURL, fileURLToPath } from 'url'
const webresolve = search => import.meta.resolve(search, pathToFileURL('./').href).then(src => fileURLToPath(src))
const searchJSON = async src => JSON.parse(await fs.readFile(await webresolve(src)))
const importJSON = src => import(src, {assert:{type:'json'}}).then(e => e.default)
const readJSON = async src => JSON.parse(await fs.readFile(src))
//router loadJSON отличается тем, что поддерживает rest.js обработки

const store = {}
const config = (name = 'config', pub = false) => {
	store[name] ??= new Promise(async resolve => {	
		const file = '.' + name + '.json'
		const conf = await searchJSON('/-' + name + '/' + file).catch(e => ({}))
		for (const src of [file, 'auto/' + file, 'data/' + file]) {
			let data = await readJSON(src).catch(e => false)
			if (data) Object.assign(conf, data)
		}
		resolve(conf)
	})
	if (!pub) return store[name]
	return store[name].then(conf => {
		if (!conf.pub) return {}
		return conf.pub.reduce((pconf, key) => {
			pconf[key] = conf[key]
			return pconf
		}, {})
	})
}

export default config