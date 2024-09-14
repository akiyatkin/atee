import unique from '/-nicked/unique.js'
class ViewException { 
	status
	ext
	nostore
	msg
	ans
	constructor (msg, view) {
		this.msg = msg
		this.view = view
	}
}
class RecView {
	constructor (view, pproc) {
		this.view = view
		this.pproc = pproc
		this.replaced = pproc.opt.replaced //Может быть только одна подмена в папке проекта
	}
	get (name, parentvalue = null, parentname = null) {
		
		return this.view.get(name, this.pproc, parentvalue, parentname)
	}

	gets (ar) {
		return this.view.gets(ar, this.pproc)
	}
	// catch (...args) {
	// 	return this.view.catch(...args)
	// }
	err (...args) {
		return this.view.err(...args)
	}
	ret (...args) {
		return this.view.ret(...args)
	}
	fin (...args) {
		return this.view.fin(...args)
	}
	nope (...args) {
		return this.view.nope(...args)
	}
	end (...args) {
		return this.view.end(...args)
	}
	reset (...args) {
		return this.view.reset(...args)
	}
	after (...args) {
		return this.view.after(...args)
	}
	setCookie (...args) {
		return this.view.setCookie(...args)
	}
	delCookie (...args) {
		return this.view.delCookie(...args)
	}
	set db(value) {
		this.view.db = value
	}
	get db() {
		return this.view.db
	}
	set req(value) {
		this.view.req = value
	}
	get req() {
		return this.view.req
	}
	set rest(value) {
		this.view.rest = value
	}
	get rest() {
		return this.view.rest
	}
	set nostore(value) {
		this.view.nostore = value
	}
	get nostore() {
		return this.view.nostore
	}
	set action(value) {
		return this.view.action = value
	}
	get action() {
		return this.view.action
	}
	set visitor(value) {
		return this.view.visitor = value
	}
	get visitor() {
		return this.view.visitor
	}
	set headers(value) {
		this.view.headers = value
	}
	get headers() {
		return this.view.headers
	}
	set status(value) {
		this.view.status = value
	}
	get status() {
		return this.view.status
	}
	set ext(value) {
		this.view.ext = value
	}
	get ext() {
		return this.view.ext
	}
	set ans(value) {
		this.view.ans = value
	}
	get ans() {
		return this.view.ans
	}
}
export class View {
	nostore = null
	status = 200
	ext = 'json'
	headers = {}
	proc = {}
	store = {}
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
	constructor (rest, action, req = {}, opt, visitor) {
		const view = this
		view.visitor = visitor
		view.action = action
		view.req = req
		view.rest = rest
		view.ans = {}
		view.opt = opt
	}
	async reset(pname) {
		const view = this
		const proc = view.proc[pname]
		if (!proc) return
		proc.ready = false
		for (const pname in proc.parents) {	//Может быть разрыв в родителях если обработчик завершается недожидаясь внутренних своих процессов. setTimeout не поддерживается.
			this.reset(pname)
		}
	}
	async getProc (opt, parentvalue) {
		const mainview = this
		//function кэш с учётом parentvalue.toString(), variable кэш только по name
		const key = opt.once !== 'parentvalue' ? opt.name : opt.name + ':' + parentvalue

		
		const proc = mainview.proc[key]
		if (proc) return proc

		

		
		if (opt['once'] === true && mainview.opt != opt) { //Для главного action запроса раз пришёл ещё один запрос значит есть отличие в реквестах и объединения не должно быть
			//proc может быть общим или у каждого view свой. Для всех rest в extras view один.
			//proc общий если у него нет в childs обработки отличающегося request в массиве view.req
			const views = mainview.rest.getViews(mainview)
			for (const view of views) {
				const otherproc = view.proc[key]
				if (!otherproc) continue
				await otherproc.init
				if (otherproc.process) { //Другой proc сейчас выполняется и всех детей ещё не собрал, надо его дождаться
					await otherproc.promise.catch(r => false)
				}
				let r
				r = mainview.rest.runChilds(otherproc, proc => {
					const popt = proc.opt
					if (popt.request && view.req[popt.name] != mainview.req[popt.name]) return true
				})
				if (r) continue; //Нельзя объединять так как в зависимостях есть разные request	

				return otherproc
			}
		}
		mainview.proc[key] = {
			'counter': ++mainview.rest.counter,
			'opt': opt,
			'parents': {},
			'childs': {},
			'promise': false,
			'ready': false,
			'result': false,
			'process': false
		}
		let resolve
		mainview.proc[key].init = new Promise(r => resolve = r)
		mainview.proc[key].init.resolve = resolve
		
		return mainview.proc[key]
	}	
	async #exec (proc, parentvalue = null, parentname = null) {
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
			if (opt.nostore && view.nostore == null) view.nostore = true
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
	// 		if (e instanceof ViewException) return e.ans
	// 		throw e
	// 	}
	// }
	async get (pname, pproc, parentvalue = null, parentname = null) {
		const view = this

		const rest = view.rest
		const opt = rest.findopt(pname)//, pproc)
				
		if (!opt) return view.err(`rest.notfound ${pname}`, 500)
		
		const proc = await view.getProc(opt, parentvalue)

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
		proc['promise'] = view.#exec(proc, parentvalue, parentname)
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
		view.ans.result = result
		if (msg) view.ans.msg = msg
		if (status != null) view.status = status
		if (nostore != null) view.nostore = nostore
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
export class Rest {
	counter = 0
	afterlisteners = []
	after(callback) {
		this.afterlisteners.push(callback)
	}
	beforelisteners = []
	before(callback) {
		this.beforelisteners.push(callback)
	}

	list = {}
	extras = []
	constructor (...extras) {
		this.extras = []
		for (const rest of extras) {
			if (this.findextra(rest)) continue
			this.extras.push(rest)
		}
	}
	extra(rest) {
		if (this.findextra(rest)) return
		this.extras.push(rest)
	}
	findextra (m) {
		for (const e of this.extras) {
			if (e === m) return true
			const r = e.findextra(m)
			if (r) return true
		}
	}
	async runextras (fn) {
		const r = await fn(this)
		if (r != null) return r
		for (const e of this.extras) {	
			const r = await e.runextras(fn)
			if (r != null) return r
		}
	}

	
	runChilds (proc, fn) { //включая себя
		const r = fn(proc)
		if (r != null) return r
		for (const pname in proc.childs) {
			const p = proc.childs[pname]
			const r = this.runChilds(p, fn)
			if (r != null) return r
		}
	}
	runParents (proc, fn) { //не включая себя
		for (const p in proc.parents) {
			const pproc = proc.parents[p]
			let r = fn(pproc)
			if (r != null) return r
			r = this.runParents(pproc, fn)	
			if (r != null) return r
		}
	}
	runRests (fn) {
		const r = fn(this)
		if (r != null) return r
		for (const rest of this.extras) {
			const r = rest.runRests(fn)
			if (r != null) return r
		}
	}
	findopt (pname) {
		if (Object.hasOwn(this.list, pname)) return this.list[pname]
		for (const m of this.extras) {
			const opt = m.findopt(pname)
			if (opt) return opt
		}
		return false
	}
	findrest (pname) {
		if (Object.hasOwn(this.list, pname)) return this
		for (const m of this.extras) {
			const opt = m.findrest(pname)
			if (opt) return opt
		}
		return false
	}

	getRestStore (visitor) {
		return visitor.relate(this).once('rest visitor store', () => ({sync:false, views: []}))
	}
	// findsync (visitor) {
	// 	const is = this.getRestStore(visitor)
	// 	if (is.sync) return is.sync
	// 	for (const rest of this.extras) {
	// 		const sync = rest.findsync(visitor)
	// 		if (sync) return sync
	// 	}
	// }
	// delsync (visitor) {
	// 	const is = this.getRestStore(visitor)
	// 	if (is.sync) is.sync = false
	// 	for (const rest of this.extras) {
	// 		rest.delsync(visitor)
	// 	}
	// }
	// setsync (visitor, sync) {
	// 	const is = this.getRestStore(visitor)
	// 	is.sync = sync
	// 	for (const rest of this.extras) { //Нужно заблокировать и вложенные, так как они без текущего могут быть где-то использованы
	// 		rest.setsync(visitor, sync)
	// 	}
	// }
	
	getViews(view) {
		const visitor = view.visitor
		const views = []
		this.runRests(rest => {
			const list = rest.getRestStore(visitor).views
			for (const view of list) views.push(view)
		})
		return unique(views)
	}
	addViews(view) {
		const visitor = view.visitor
		const views = []
		this.runRests(rest => {
			const list = rest.getRestStore(visitor).views
			list.push(view)
		})
	}



	async get (action, req = {}, visitor) {
		if (visitor) req = {...req, visitor}
		const rest = this
		const orest = rest.findrest(action) //before и after только для addAction
		const opt = orest ? orest.list[action] : false
		const view = new View(rest, action, req, opt, visitor) //Создаётся у родительского реста

		const views = rest.addViews(view)
		
		//console.log('rest', view.action, req.m)
		let reans

		try {

			/*
				Некоторые create-update обработки могут быть только в самостоятельном set запросе. 
				Нельзя чтобы считывание было до создание, и гарантировать, что такого запроса в мульти режиме контроллера нельзя
				даже при правильной последовательности запросов при асинхронном выполнении
				Таким образом других работ с этим rest в этом visitor не может быть, если выполняется create или любой set
				Также создание пользователя возможно только в set запросах, тоесть в самостоятельных запросах, хотя set может быть и в контроллере, 
				но это будет скрытый set в get или когда других работ с этим рестом нет, например - но это трудно представимо
				ИТОГО Любой set должен блокировать параллельную работу и быть cproc если пользователь жмёт всё подряд
				Обработка должна сообщить что она только для set режима, просто проверив свой action.
			*/
			
			// visit.counter++
			// if (/^set\-/.test(action)) visit.sync = true
			// if (visit.sync && visit.counter > 1) return view.err('rest.badrequest', 500)

			
			//if (!opt?.response && !opt?.request) return view.err('rest.badrequest', 404)
			if (!opt?.response) return view.err('rest.badrequest', 404)

			
			
			for (const callback of orest.beforelisteners) await callback(view)
			const res = await view.get(action)

			for (const callback of orest.afterlisteners) await callback(view)
			
			
			reans = res != null ? res : {
				ans: view.ans, 
				nostore: view.nostore, 
				status: view.status,
				ext: view.ext,
				headers: view.headers
			}
			
		} catch (e) {
			//if (e instanceof ViewException) {

				//const oview = view.nostore ? view : e.view //Исключение могло быть из другова view в одном visitor сохранено в promise proc и передано сейчас
				const oview = e.view //Если обработка once:false или req будет различаться, то исключение будет своё в каждом view, так как промисом не воспользуемся
				if (!oview) throw e
				try {			
					if (orest) for (const callback of orest.afterlisteners) await callback(view)
					for (const callback of view.afterlisteners) await callback(view) //выход из базы
					reans = {
						ans: oview.ans, 
						nostore: oview.nostore,
						status: oview.status,
						ext: oview.ext,
						headers: oview.headers
					}
				} catch (e) {
					if (e instanceof ViewException) {
						reans = {
							ans: oview.ans, 
							nostore: oview.nostore,
							status: oview.status,
							ext: oview.ext,
							headers: oview.headers
						}
					} else {	

						throw e
					}
				}		
			// } else {	

			// 	throw e
			// }
		}

		for (const callback of view.afterlisteners) await callback(view) //выход из базы
		return reans
	}
	add (pname, a1, a2, a3, a4) {
		let before, func, after, replace
		if (a1 instanceof Function) {
			func = a1
			after = a2
			replace = a3
		} else if (a2 instanceof Function) {
			before = a1
			func = a2
			after = a3
			replace = a4
		} else if (a2 || a3) {
			before = a1
			after = a2
			replace = a3
		} else {
			before = a1
		}
		if (after === true) {
			after = null
			replace = true
		}


		
		const opt = this.findopt(pname)
		if (opt) { //replace handler
			if (!replace) throw new Error(`Имя обработки уже занято ${pname}`)
		} else {
			if (replace) throw new Error(`Имя обработки не найдено, невозможно заменить ${pname}`)
		}

		this.list[pname] = {
			'replaced': opt,
			'name': pname,
			//'process': false,
			'request': false, //Нужно ли брать из REQUEST
			'required': false, //Нужно ли выкидывать исключение если нет request
			'response': false, //Без этой метки нельзя обратиться из адресной строки
			// 'result': null,
			// 'ready': false,
			'once': null,
			'type': null,
			'nostore': null,
			'func': func,
			'after': after,
			'before': before
		}
		return this.list[pname]
	}
	// addSet (...args) { //Для всех set- обычно
	// 	const opt = this.add(...args)
	// 	opt['type'] = 'set'
	// 	opt['nostore'] = true 
	// 	opt['response'] = true
	// 	opt['request'] = false
	// 	opt['once'] = true
	// 	opt['required'] = false
	// }
	// addGet (...args) { //Для всех set- обычно
	// 	const opt = this.add(...args)
	// 	opt['type'] = 'get'
	// 	opt['nostore'] = false
	// 	opt['response'] = true
	// 	opt['request'] = false
	// 	opt['once'] = true
	// 	opt['required'] = false
	// }
	addAction (pname, a1, a2, a3) { //Для всех set- обычно
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'action'
		opt['nostore'] = true 
		/*
			Параллельный action и response с rest исключается. Сами обработки остаются асинхронынми, но не со своими дублями. 
			В контроллере будет exception если два action вызова - последовательного выполнения не будет, но response будут ждать и последовательно выполнятся. 
			При двух запросах вне котроллера будет последовательное выполнение action cproc и последовательное выполнение response?
		*/
		opt['response'] = true
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
	}
	addResponse (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'response'
		opt['nostore'] = false
		opt['response'] = true
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
	}
	
	addArgument (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'argument'
		opt['nostore'] = false
		opt['response'] = false
		opt['request'] = true
		opt['once'] = true
		opt['required'] = true
	}

	addVariable (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'variable'
		opt['nostore'] = false
		opt['response'] = false
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
	}
	// addAppointment (pname, a1, a2, a3) {
	// 	const opt = this.add(pname, a1, a2, a3)
	// 	opt['type'] = 'function'
	// 	opt['nostore'] = false
	// 	opt['response'] = false
	// 	opt['request'] = false
	// 	opt['once'] = false     //Если function вызовется для обработки once:true то повторного function не будет
	// 	opt['required'] = false
	// }
	addFunction (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'function'
		opt['nostore'] = false
		opt['response'] = false
		opt['request'] = false
		opt['once'] = 'parentvalue'     
		opt['required'] = false
	}

	// addHandler (pname, a1, a2, a3) {
	// 	const opt = this.add(pname, a1, a2, a3)
	// 	opt['type'] = 'handler'
	// 	opt['nostore'] = true
	// 	opt['response'] = false
	// 	opt['request'] = false
	// 	opt['once'] = true
	// 	opt['required'] = false
	// }
	
	// addHandler (pname, a1, a2, a3) {
	// 	const opt = this.add(pname, a1, a2, a3)
	// 	opt['type'] = 'handler'
	// 	opt['nostore'] = false
	// 	opt['response'] = false
	// 	opt['request'] = false
	// 	opt['once'] = false
	// 	opt['required'] = false
	// }

	// addSetting (pname, a1, a2, a3) {
	// 	const opt = this.add(pname, a1, a2, a3)
	// 	opt['type'] = 'setting'
	// 	opt['nostore'] = true
	// 	opt['response'] = false
	// 	opt['request'] = false
	// 	opt['once'] = true
	// 	opt['required'] = false
	// }
	

	
}
export default Rest