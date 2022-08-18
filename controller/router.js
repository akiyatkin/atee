import { rest as controller } from './rest.js'
import { file, files, filesw } from './files.js'
import { whereisit } from './whereisit.js'
import { pathparse, split } from "./Spliter.js" 
import { ReadStream } from 'fs'
import { pathToFileURL, fileURLToPath } from 'url'


import path from 'path'
import fs from 'fs/promises'

const getExt = (str) => {
	const i = str.lastIndexOf('.')
	return ~i ? str.slice(i + 1) : ''
}
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
		innodemodules = name == 'node_modules' ? true : innodemodules
		await searchRest(path.posix.join(source, name), file, RESTS, newparent, innodemodules)
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
	 return await import.meta.resolve(search, pathToFileURL('./').href).then(src => fileURLToPath(src)).catch(() => false)
}

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



const getRoot = (str) => {
	const i = str.indexOf('/',1)
	return ~i ? str.slice(1, i) : ''
}

export const loadJSON = async (src, client) => {
	return load(src, client, 'json')
}
export const loadTEXT = async (src, client) => {
	return load(src, client, 'txt')
}
const load = async (src, client, type) => {
	let res = { ans: '', status: 200, nostore: false } //, headers: { }, ext: type
	const {
		search, secure, get,
		rest, query, restroot
	} = await router(src)

    if (!rest) throw { status: 500, src, type }

	res = {...res, ...(await rest(query, get, client))}
    if (res.status != 200) throw { status: res.status, src, res, type }

	let data = res.ans
	if (data instanceof ReadStream) {
		data = await readTextStream(data)
		if (type == 'json') data = JSON.parse(data)
	}
	return {data, nostore:res.nostore}
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



export const router = async (search) => {
	//У search всегда есть ведущий /слэш
	//if (search.indexOf('/-') === 0) search = search.slice(1)
	let { secure, path, crumbs, ext, get} = pathparse(search)
	let query = false
	let restroot = ''
	let root = ''
	let rest = false
	let cont = false
	if (ext) {
		const src = await webresolve(search)
		if (src) { //найден файл
			if (ext == 'json') { //json файлы возвращаются объектом, //с хранением в оперативной памяти
				rest = async () => {
					const { default: ans } = await import(search, {assert: { type: "json" }})
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
				cont, root, crumbs
			}
		}
	}

	if (path[0] == '-') { //Обязательный rest и без контроллера
		for (const v of REST_HYPHENS) {
			if (path.indexOf(v.part) === 1 || !v.part) {
				if (	
						(path == '-' + v.part)  //-params = params
						|| path[v.part.length + 1] == '/' || !v.part //-params-list != params, -params/list = params
				) { 
					if (v.innodemodules) rest = (await import(v.rest)).rest
					else rest = (await import(IMPORT_APP_ROOT + '/' + v.rest)).rest                
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
					if (v.innodemodules) rest = (await import(v.rest)).rest
					else rest = (await import(IMPORT_APP_ROOT + '/' + v.rest)).rest
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
					cont = true
					root = v.part
					path = path.slice(root.length + (root ? 1 : 0))
					crumbs = split('/', path)
					break;
				}

			}
			
		}
	}
	return {
		search, secure, get, path, ext,
		rest, query, restroot,
		cont, root, crumbs
	}
}
