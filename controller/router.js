import { rest as controller } from './rest.js'
import { file, files } from './files.js'
//import layers from '../layers.json' assert { type: "json" }
import { whereisit } from './whereisit.js'
import { parse } from './headers.js'

import { pathToFileURL, fileURLToPath } from 'url'


import path from 'path'
import fs from 'fs/promises'

import { createRequire } from "module";

const require = createRequire(import.meta.url);

// const getHyphen = async (source, HYPHEN, needpackage, dir) => {
//     const files = await fs.readdir(source, { withFileTypes: true })
//     const dirs = files.filter(dirent => {
//         return !dirent.isFile()
//     }).map(dirent => dirent.name)
//     const res = { }
//     for (const name of dirs) {
//         if (needpackage) {
//             const src = path.join(source, name, 'package.json')
//             if (!await fs.access(path.join(src)).then(() => true).catch(() => false)) continue
//         } else {
//             if (name[0] == '.') continue
//             if (~['node_modules','data'].indexOf(name)) continue
//         }
//         res[name] = [path.posix.join(dir, name)]
//     }
//     for (const r in res) {
//         if (HYPHEN[r]) HYPHEN[r] = [...HYPHEN[r], ...res[r]]
//         else HYPHEN[r] = res[r]
//     }
//
// }
// //Папки которые могут быть сокращены дефисом
// const HYPHEN = {}
// await getHyphen('.', HYPHEN, false, '')
// await getHyphen('node_modules', HYPHEN, true, '')
// await getHyphen('node_modules/@atee', HYPHEN, true, '@atree')
// console.log(HYPHEN)

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
    if (RESTS[r]['innodemodules'] && !REST_DIRECTS[RESTS[r]['direct']])
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

const explode = (sep, str) => {
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
const getRoot = (str) => {
    const i = str.indexOf('/',1)
    return ~i ? str.slice(1, i) : ''
}
const pathparser = request => { //request всегда со слэшом в начале
    request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    const [path, params] = explode('?', request)
    const get = parse(params || '', '&');
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')
    return {secure, crumbs, path, ext, get}
}




export const router = async (search) => {
    //У search всегда есть ведущий /слэш
    if (search.indexOf('/-') === 0) search = search.slice(1)
    let { secure, path, crumbs, ext, get} = pathparser(search)
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
                rest = file(src, ext)
            }
            const query = ''
            return {
                search, secure, get,
                rest, query, restroot,
                cont, root, crumbs
            }
        }
    }
    if (search[0] == '-') { //Обязательный rest и без контроллера
        for (const v of REST_HYPHENS) {
            if (path.indexOf(v.part) === 0) {
                //const test = await import('@atee/controller/rest')
                //console.log('asdf', v.rest, test)
                if (v.innodemodules) rest = (await import(v.rest)).rest
                else rest = (await import(IMPORT_APP_ROOT + '/' + v.rest)).rest
                //rest = require(v.rest).rest
                restroot = v.part
                query = path.slice(v.part.length + 1)
                break;
            }
        }
    } else { //Может быть rest и может быть контроллер
        for (const v of REST_DIRECTS) {
            if (path.indexOf(v.part) === 0) {
                if (v.innodemodules) rest = (await import(v.rest)).rest
                else rest = (await import(IMPORT_APP_ROOT + '/' + v.rest)).rest
                //rest = (await import(IMPORT_APP_ROOT + '/' + v.rest)).rest
                restroot = v.part
                query = path.slice(v.part.length + 1)
                break;
            }
        }
        for (const v of CONT_DIRECTS) {
            if (path.indexOf(v.part) === 0) {
                //layers = (await import(IMPORT_APP_ROOT + '/' + v.rest, {assert: { type: "json" }})).default
                cont = true
                root = v.part
                crumbs = path.slice(v.part.length).split('/')
                break;
            }
        }

    }
    return {
        search, secure, get,
        rest, query, restroot,
        cont, root, crumbs
    }
}
