import RecView from '/-rest/RecView.js'
import ViewException from '/-rest/ViewException.js'
export class View {
	nostore = null
	status = 200
	ext = 'json'
	headers = {}
	proc = {}
	store = {}
	static counter = 0
	constructor (rest, opt, req = {}, visitor) {
		const view = this
		view.counter = ++View.counter
		view.visitor = visitor
		view.action = opt.name //action
		view.req = {...req} //structuredClone
		view.rest = rest
		view.data = {}
		view.ans = view.data
		view.opt = opt
	}
	set db(value) {
		this.visitor.db = value
	}
	get db() {
		return this.visitor.db
	}
	setCookie (name, value) {
		const view = this
		const cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT`
		view.headers['Set-Cookie'] = view.headers['Set-Cookie'] ? view.headers['Set-Cookie'] + ';' + cookie : cookie
		const client = view.visitor.client
		client.cookie = client.cookie ? client.cookie + ';' + cookie : cookie
	}
	delCookie (name, value) {
		const view = this
		const cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Strict; expires=Fri, 31 Dec 2000 23:59:59 GMT`
		view.headers['Set-Cookie'] = view.headers['Set-Cookie'] ? view.headers['Set-Cookie'] + ';' + cookie : cookie
		const client = view.visitor.client
		client.cookie = client.cookie.replace(new RegExp(`(^|;)?${name}=([^;]*)(;|$)`), '')
	}
	getStore (name, args) {
		const hash = JSON.stringify(args)
		const STORE = this.store
		if (!STORE[name]) STORE[name] = {}
		if (!STORE[name][hash]) STORE[name][hash] = {}
		return STORE[name][hash]
	}
	// once (name, args, callback) {
	// 	const store = this.getStore(name, args)
	// 	if (store.ready) return store.promise
	// 	store.promise = callback(...args)
	// 	store.ready = true
	// 	return store.promise
	// }
	
	async reset(pname) {
		const view = this
		const proc = view.proc[pname]
		if (!proc) return
		proc.ready = false
		for (const pname in proc.parents) {	//Может быть разрыв в родителях если обработчик завершается недожидаясь внутренних своих процессов. setTimeout не поддерживается.
			this.reset(pname)
		}
	}
	async getOrCreateProc (opt, parentvalue) {
		const view = this

		//function кэш с учётом parentvalue.toString(), variable кэш только по name
		const key = opt.once !== 'parentvalue' ? opt.name : opt.name + ':' + parentvalue

		if (view.proc[key]) return view.proc[key]

		let proc
		if (opt['once'] === true) {  // && view.opt != opt если по rest различать кэши
			//proc может быть общим или у каждого view свой. Для всех rest в extras view один.
			//proc общий если у него нет в childs обработки отличающегося request в массиве view.req
			const views = view.rest.getViews(view.visitor)
			
			for (const nview of views) {
				const otherproc = nview.proc[key]
				if (!otherproc) continue
				await otherproc.init
				if (otherproc.process) { //Другой proc сейчас выполняется и всех детей ещё не собрал, надо его дождаться
					await otherproc.promise.catch(r => false)
				}
				let r
				r = view.rest.runProcChilds(otherproc, proc => {
					const popt = proc.opt
					if (popt.request && nview.req[popt.name] != view.req[popt.name]) return true
				})
				if (r) continue; //Нельзя объединять так как в зависимостях есть разные request	

				proc = otherproc
				break
			}
		}
		if (!proc) {
			view.proc[key] = {
				'counter': ++view.rest.counter,
				'opt': opt,
				'parents': {},
				'childs': {},
				'promise': false,
				'ready': false,
				'result': false,
				'process': false
			}
			let resolve
			view.proc[key].init = new Promise(r => resolve = r)
			view.proc[key].init.resolve = resolve
			proc = view.proc[key]
		}
		
		return proc
	}	
	async _exec (proc, parentvalue = null, parentname = null) {
		const opt = proc.opt
		const view = this
		const rest = view.rest //Будет родительский рест, от которого запрос. Но могут быть запросы по другим рестам с использованием вложенных тут рестов.
		const pname = opt.name
		const forname = parentname || pname;
		let res = parentvalue
		if (opt.request) {
			if (pname in view.req) {
				res = view.req[pname]
				//if (res == null) res = null
			} else {
				res = null
			}
		}
		
		for (const n of opt['before'] || []) {
			const r = await view.get(n, proc, res, opt.name);
			//if (r != null) 
			res = r;
		}

		
		// if (opt['required']) {
		// 	if (res == null) return view.err(`rest.required ${pname}`);
		// }
		
		if (opt.func) {	
			const rview = new RecView(view, proc)
			if (opt.nostore && view.nostore === null) view.nostore = true
			if (!opt.nostore && view.nostore === null) view.nostore = false
			const r = opt.func(rview, res, forname)
			res = await r
		}

		for (const n of opt['after'] || []) {
			const r = await view.get(n, proc, res, opt.name);
			//if (r != null) 
			res = r;
		}
		return res
	}
	// async catch(pname) {
	// 	const view = this
	// 	try {
	// 		const data = await view.get(pname)
	// 		return data
	// 	} catch (e) {
	// 		if (e instanceof ViewException) return e.data
	// 		throw e
	// 	}
	// }
	async get (pname, pproc, parentvalue = null, parentname = null) {
		const view = this

		//const views = view.rest.getViews(view.visitor)


		const rest = view.rest
		const opt = rest.findopt(pname)//, pproc)


		if (!opt) return view.err(`rest.notfound ${pname}`, 500)
		
		const proc = await view.getOrCreateProc(opt, parentvalue)

		if (pproc) {
			proc.parents[pproc.opt.name] = pproc //Тест рекурсии
			pproc.childs[proc.opt.name] = proc //Для мёрджа разных view если нет разный request в childs

		}		
		
		if (proc['process']) {
			const r = rest.runParents(proc, pproc => pproc == proc)
			if (r) return view.err(`rest.recursion ${pname}`, 500)
		}
		//if (opt['nostore'] && !view.opt['nostore']) return view.err(`rest.action required ${pname}`, 500)
		//

		if (opt['once'] === true && proc['promise']) return proc['promise']
		
		proc['process'] = true
		proc['promise'] = view._exec(proc, parentvalue, parentname)
		proc.init.resolve()
		proc['result'] = await proc['promise']
		proc['ready'] = true		
		proc['process'] = false

		return proc['result']
	}

	async gets (pnames, pproc) {
		const view = this
		const res = { }
		const list = []

		for (const pname of pnames ?? []) {
			//const vname = pname.split(/[\#\*@\?]/)[0]
			const vname = pname.split(/[\#]/)[0]

			const promise = view.get(pname, pproc)
			promise.vname = vname
			list.push(promise)
		}
		const listres = await Promise.all(list)
		for (const i in list) {
			const promise = list[i]
			const r = listres[i]
			res[promise.vname] = r
		}
		
		return res
	}
	fin (result) {
		const msg = result ? 'Готово' : 'Ошибка'
		return this.#ready(msg, null, result)
	}
	end (ext = {}) {
		const view = this
		const reans = new ViewException('end', view)
		Object.assign(view, ext)
		throw reans
	}
	#ready (msg, status, result, nostore) {
		const view = this
		view.data.result = result
		if (msg) view.data.msg = msg
		if (status !== null) view.status = status
		if (nostore !== null) view.nostore = nostore
		else if (view.status == 403) view.nostore = true
		else if (view.status == 500) view.nostore = true

		if (!view.status) view.status = 200
		throw new ViewException('ready ' + msg, view)
	}

	err (msg, status = 422, nostore = null) {//result 0, но вообще фигня, такое не должно быть
		//Только 404, 403, 500, 422
		//403 - forbidden
		//422 - пользователь может исправить, 
		//500 - пользователь исправить ошибку не сможет
		return this.#ready(msg, status, 0, nostore)
	}
	nope (msg, status = null, nostore = null) { //result 0, но вообще ок, такое бывает
		return this.#ready(msg, status, 0, nostore)
	}
	ret (msg, status = null, nostore = null) { //Ништяк
		return this.#ready(msg, status, 1, nostore)
	}

	afterlisteners = []
	after (callback) {
		this.afterlisteners.push(callback)
	}

}

export default View