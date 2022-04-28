import { files } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta, View } from "./Meta.js"
import { parse } from './headers.js'
import { whereisit } from './whereisit.js'
import { router } from './router.js'
import { Access } from '@atee/controller/Access.js'

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



export const meta = new Meta()

meta.addAction('access', view => {
    view.ans['UPDATE_TIME'] = Access.getUpdateTime()
    view.ans['ACCESS_TIME'] = Access.getAccessTime()
    return view.ret()
})
// meta.addAction('set-access', view => {
//     Access.setAccessTime()
//     return view.ret()
// })
meta.addAction('set-update', async view => {
    const time = new Date();
    await utimes('../reload', time, time)
    return view.ret()
})

meta.addArgument('cookie', (view, cookie) => {
    return parse(cookie, '; ')
})
meta.addFunction('int', n => Number(n))
meta.addFunction('array', n => explode(',', n))
meta.addArgument('host')
meta.addArgument('prev')
meta.addArgument('next')
meta.addArgument('root')
meta.addArgument('update_time', ['int'])
meta.addArgument('access_time', ['int'])
meta.addArgument('globals','array')


meta.addAction('sw', async view => {
    const res = await view.get('access')
    const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
    const ans = `
        let UPDATE_TIME = ${res.UPDATE_TIME}
        let ACCESS_TIME = ${res.ACCESS_TIME}
        ${script}`
    return ans
})

const interpolate = function(strings, params) {
    const names = Object.keys(params)
    const vals = Object.values(params)
    return new Function(...names, `return \`${strings}\``)(...vals)
}

meta.addAction('layers', async view => {
    const {
        prev, next, host, cookie, root, access_time, update_time, globals 
    } = await view.gets(['prev', 'next', 'host', 'cookie', 'root', 'access_time', 'update_time', 'globals'])
    //next и prev globals не содержат, был редирект на без globals
    if (update_time < Access.getUpdateTime()) {
        //update_time - reload
        return view.err()
    }
    if (access_time < Access.getAccessTime()) {
        //access_time - все слои надо показать заного
        return view.err() //Ну или перезагрузиться
    }
    if (globals.length) {
        
        
    }
    
    //Нужно сообщить какие globals update_time access_time обработал данный запрос
    //Пока не придёт ответ со старшими update_time и access_time клиент свои не поменяет
    //Если придут старшие значит именно в этом запросе есть нужные слои в момент когда пришли старшие, для всех предыдущих 
    view.ans.globals = globals
    view.ans.update_time = Access.getUpdateTime()
    view.ans.access_time = Access.getAccessTime()
    const {
        search, secure, get,
        rest, query, restroot,
        cont, root: nextroot, crumbs
    } = await router(next)


    /*
        globals чтобы обновить те слои которые уже показаны в prev, новые слои всегда обновляются через fetch
        
        
        Global проверить, который теперь только на сервере, по сути это тотже Acesss.
        Скрипты на клиенте могут вызывать Global.set('controller'), 
        при переходе всплывут слои из prev, что надо их обновить
   
        клик, реакция, фоновая правка, потом ответ с быстрым применением
        клик, реакция, фоновая правка, переход, ответ уже для перехода

    

        Правка влияет на всё. Ответ может касаться много чего.

        Update_time нужно проверить и отправить в sw а потом обновить
        sw инициализируется сам, layers грузятся только после клика
        Если путь до файла то reload, но с ответом-проверкой от layers, 
        браузер ничего не анализирует а сразу спрашивает
        
        показывает всё, что получено от layers, о кеше браузера думает сервер
        с import кэшем для путей с расширением и запросами за остальным

    */

    if (rest || secure || root != nextroot) return view.err()

    const { default: origlayers } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
    //const layers = structuredClone(origlayers)
    const layers = {...origlayers}
    if (layers.root.jsontpl) {
        layers.root.json = interpolate(layers.root.jsontpl, {get, host, cookie, root })
    }
    view.ans.layers = layers.root
    return view.ret()
})

export const rest = async (query, get) => {
    if (query == 'init.js') return file(FILE_MOD_ROOT + 'init.js', 'js')
    if (query == 'test.js') return files(FILE_MOD_ROOT + 'test.js', 'js')

    const ans = await meta.get(query, get)   
    if (query == 'sw') {
        return { ans, ext: 'js', status: 200, nostore: false, headers: { 'Service-Worker-Allowed': '/' }}
    } else if (~query.indexOf('set-') || ~['access','layers'].indexOf(query)) {
        return { ans, status: 200, nostore: true, ext: 'json' }
    } else {
        return { ans, status: 200, nostore: false, ext: 'json' }
    }
}
