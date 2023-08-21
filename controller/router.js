import controller from './rest.js'
import { file, files, filesw } from './files.js'
import { whereisit } from './whereisit.js'
import { ReadStream } from 'fs'
import { pathToFileURL, fileURLToPath } from 'url'

import Theme from '/-controller/Theme.js'

import config from '/-config'
import path from 'path'
import fs from 'fs/promises'

const conf = await config('controller')

const searchRest = async (source, file, RESTS, parent = source, innodemodules = false) => {
	const src = path.posix.join(source, file)
	if (await fs.access(src).then(() => true).catch(() => false)) {
		const restpath = parent + '/' + file
		RESTS[restpath] = { direct: parent == '.' ? '' : parent }
		RESTS[restpath]['innodemodules'] = innodemodules
		if (innodemodules) {
			RESTS[restpath]['hyphen'] = RESTS[restpath]['direct'].replace('@atee/','')
		} else {
			RESTS[restpath]['hyphen'] = RESTS[restpath]['direct']
		}
	}
	const files = await fs.readdir(source, { withFileTypes: true })
	const dirs = files.filter(dirent => {
		return !dirent.isFile()
	}).map(dirent => dirent.name)
	for (const name of dirs) {
		if (name[0] == '.') continue
		const newparent = name == 'node_modules' ? parent : path.posix.join(parent, name)
		const innode = name == 'node_modules' ? true : innodemodules
		await searchRest(path.posix.join(source, name), file, RESTS, newparent, innode)
	}
}
const fnsort = (a, b) => {
	return b.part.length - a.part.length
}

const RESTS = {}
await searchRest('.', 'rest.js', RESTS)

let REST_DIRECTS = {}
let REST_HYPHENS = {}
for (const r in RESTS) { //Напрямую можно обратиться только к элементам в node_modules, rest проекта только через дефис
	// && (RESTS[r]['innodemodules'] || RESTS[r]['ext'])
	if (!REST_DIRECTS[RESTS[r]['direct']])
		REST_DIRECTS[RESTS[r]['direct']] = {part: RESTS[r]['direct'], rest:r, innodemodules: RESTS[r]['innodemodules']}
	if (!REST_HYPHENS[RESTS[r]['hyphen']])
		REST_HYPHENS[RESTS[r]['hyphen']] = {part: RESTS[r]['hyphen'], rest:r, innodemodules: RESTS[r]['innodemodules']}
}
REST_HYPHENS = Object.values(REST_HYPHENS)
REST_DIRECTS = Object.values(REST_DIRECTS)
REST_HYPHENS.sort(fnsort)
REST_DIRECTS.sort(fnsort)

const CONTS = {}
await searchRest('.', 'layers.json', CONTS)
let CONT_DIRECTS = {}
for (const r in CONTS) {
	if (!CONT_DIRECTS[CONTS[r]['direct']]) CONT_DIRECTS[CONTS[r]['direct']] = {part: CONTS[r]['direct'], rest:r, innodemodules: CONTS[r]['innodemodules']}
}
CONT_DIRECTS = Object.values(CONT_DIRECTS)
CONT_DIRECTS.sort(fnsort)


const webresolve = async search => {
	const href = pathToFileURL('./').href
	const src = await import.meta.resolve(search, href)
	return fileURLToPath(src)
}

// const webresolve = async search => {
// 	try {
// 		const src = await import.meta.resolve(search, pathToFileURL('./').href)
// 		return fileURLToPath(src)
// 	} catch (e) {
// 		return false
// 	}
// }
//const webresolve = async search => {
	//return await import.meta.resolve(search, pathToFileURL('./').href).then(src => fileURLToPath(src)).catch(() => false)

	//В адресах в layers.json относительные пути не поддерживаются
	//console.log(search)

	// return await import.meta.resolve(search, pathToFileURL('./').href).then(async src => {
	// 	src = fileURLToPath(src)
	// 	if ((await fs.lstat(src)).isFile()) { //Нелепый фикс... resolver на папку возвращает иногда путь до файла
	// 		return src
	// 	}
	// 	return false
	// }).catch(() => false)
//}

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)


//Подходит только если json нужен через rest.js
export const loadJSON = (src, visitor) => {
	return load(src, visitor, 'json')
}
export const loadTEXT = (src, visitor) => {
	return load(src, visitor, 'txt')
}
const load = (src, visitor, ext) => { //ext формат требуемых данных
	const store = visitor.relate(load)
	const name = src+':'+ext
	return store.once(name, async () => {
		let reans = { ans: '', status: 200, nostore: false } //, headers: { }, ext: ext
		
		// const {
		// 	search, secure, get,
		// 	rest, query, restroot
		// } = await router(src)
		//404, 422, 200, 500, 501 method not emplimented, 403 

		const route = await router(src, true) //debug
		
		if (!route.rest) throw { status: 500, src, ext }
		const r = typeof(route.rest) == 'function' ? route.rest(route.query, route.get, visitor) : route.rest.get(route.query, route.get, visitor)
		reans = {...reans, ...(await r)}
		//if (reans.status != 200 && reans.status != 422 && reans.status != 403) throw { status: reans.status, src, reans, ext, from:'router.load', toString: () => route.query + ' ' + reans.status}
		if (reans.status >= 500) throw { status: reans.status, src, reans, ext, from:'router.load', toString: () => route.query + ' ' + reans.status}

		let ans = reans.ans
		if (ans instanceof ReadStream) {
			ans = await readTextStream(ans)
			if (ext == 'json') ans = JSON.parse(ans)
		}
		return {...reans, ans}
	})
}

export const readTextStream = stream => {
	return new Promise((resolve, reject) => {
		let data = ''
		stream.on('readable', () => {
			const d = stream.read()
			if (d === null) return
			data += d
		})
		stream.on('error', reject)
		stream.on('end', () => {
			resolve(data)
		})
	})
}


const getSrcName = (str) => {
	const i = str.lastIndexOf(path.sep)
	const name = ~i ? str.slice(i + 1) : ''
	return ~i && !name ? '' : name
}
const getExt = (str) => {
	const i = str.lastIndexOf('.')
	return ~i ? str.slice(i + 1) : ''
}

const explode = (sep, str) => {
	if (!str) return []
	const i = str.indexOf(sep)
	return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const userpathparse = (search) => {
	//У request всегда есть ведущий /слэш
	search = search.slice(1)
	try { search = decodeURI(search) } catch { }
	let [path = '', params = ''] = explode('?', search)
	const get = Theme.parse(params, '&')
	const secure = !!~path.indexOf('/.') || path[0] == '.'
	return {secure, path, get}
}
export const router = async (search, debug) => {
	//У search всегда есть ведущий /слэш
	//if (search.indexOf('/-') === 0) search = search.slice(1)
	let { secure, path, get} = userpathparse(search)
	let query = false
	let restroot = ''
	let root = ''
	let rest = false
	let cont = false

	//if (ext) {
	const src = await webresolve('/' + path).catch(e => false)
	const name = src ? getSrcName(src) : ''

	if (src && name) { //найден файл
		const ext = getExt(src)
		if (~conf['403']['indexOf'].indexOf(name)) secure = true
		if (conf['403']['search'].some(pattern => ~('/'+name).search(pattern))) secure = true

		if (ext == 'json') { //json файлы возвращаются объектом, //с хранением в оперативной памяти
			rest = async () => {
				const ans = await import(search, {assert: { type: "json" }}).then(r => r.default)
				return { ans, ext }
			}
		} else { //файлы передаются стримом
			if (search == '/-controller/sw.js') rest = filesw(src, ext)
			else rest = file(src, ext)
		}
		const query = ''
		return {
			search, secure, get, path, ext,
			rest, query, restroot,
			cont, root
		}
	}

	//}
	const ext = getExt(path)

	if (path[0] == '-') { //Обязательный rest и без контроллера
		for (const v of REST_HYPHENS) {
			if (path.indexOf(v.part) === 1 || !v.part) {
				if (	
						(path == '-' + v.part)  //-params = params
						|| path[v.part.length + 1] == '/' || !v.part //-params-list != params, -params/list = params
				) { 
					const src = v.innodemodules ? v.rest : IMPORT_APP_ROOT + '/' + v.rest
					
					rest = await import(src).then(r => r.default || r.rest)
					restroot = v.part
					query = path.slice(v.part.length + (v.part ? 2 : 1)) //Отрезаем - и последний /
					break;
				}
			}
		}


	} else {

		if (ext) { //Без дефиса подходит только rest в корне для файлов
			for (const v of REST_DIRECTS) {
				//if (!v.part && !ext) continue //rest в корне только при наличии расширения
				if (v.part) continue
				if (path.indexOf(v.part) === 0) {
					rest = await import(v.innodemodules ? v.rest : IMPORT_APP_ROOT + '/' + v.rest).then(r => r.default || r.rest)
					restroot = v.part
					query = path.slice(v.part.length)
					break;
				}
			}
		}

		if (!rest) {
			for (const v of CONT_DIRECTS) {
				if (path.indexOf(v.part) === 0) {
					//layers = (await import(IMPORT_APP_ROOT + '/' + v.rest, {assert: { type: "json" }})).default
					if (path.length == v.part.length || path[v.part.length] == '/' || !v.part.length) {
						cont = true
						root = v.part
						path = path.slice(root.length + (root ? 1 : 0))
						break;
					}
				}

			}
		}
	}

	return {
		search, secure, get, path, ext,
		rest, query, restroot,
		cont, root
	}
}
