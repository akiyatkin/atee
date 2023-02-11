class ViewException { 
	status
	ext
	nostore
	msg
	ans
	constructor (msg) {
		this.msg = msg
	}
}
export class View {
	nostore = false
	status = 200
	ext = 'json'
	headers = {}
	proc = []
	store = {}
	getStore (name, args) {
		const hash = JSON.stringify(args)
		const STORE = this.store
		if (!STORE[name]) STORE[name] = {}
		if (!STORE[name][hash]) STORE[name][hash] = {}
		return STORE[name][hash]
	}
	once (name, args, callback) {
		const store = this.getStore(name, args)
		if (store.ready) return store.promise
		store.promise = callback(...args)
		store.ready = true
		return store.promise
	}
	constructor (rest, action, req = {}) {
		const view = this
		view.action = action
		view.req = req
		view.rest = rest
		view.ans = {}
	}
	async getopt (opt, parentvalue = null, parentname = null) { //для выполнения replaced
		const view = this
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
		for (const n of opt.before || []) {
			const r = await view.get(n, res, forname);
			if (r != null) res = r;
		}
		
		if (opt['required']) {
			if (res === null) return view.err(`rest.required ${pname}`);
		}

		if (opt.func) {
			const r = await opt.func(view, res, forname, opt.replaced)
			//if (r != null) res = r
			res = r
		}
		for (const n of opt['after'] || []) {
			const r = await view.get(n, res, pname);
			if (r != null) res = r;
		}
		return res
	}
	
	async get (pname, parentvalue = null, parentname = null) {
		const view = this
		const rest = view.rest
		const opt = rest.findopt(pname)
		if (!opt) return view.err(`rest.notfound ${pname}`, 500)
		if (!view.proc[pname]) view.proc[pname] = {
			'ready': false,
			'result': false,
			'process': false
		}
		const proc = view.proc[pname]
		if (opt['once'] && proc['ready']) return proc['result'];
		if (proc['process']) return view.err(`rest.recursion ${pname}`);
		proc['process'] = true;
		
		const res = await view.getopt(opt, parentvalue, parentname)
		
		proc['ready'] = true
		proc['result'] = res
		proc['process'] = false

		return proc['result'];
	}

	async gets (pnames) {
		const view = this
		const res = { }
		for (const pname of pnames ?? []) {
			const vname = pname.split(/[\#\*@\?]/)[0]
			res[vname] = await view.get(pname)
		}
		return res
	}
	end (ext = {}) {
		const reans = new ViewException()
		Object.assign(this, ext)
		throw reans
	}
	#ready (msg, status, result, nostore = null) {
		const view = this
		view.ans.result = result
		if (msg) view.ans.msg = msg
		if (status != null) view.status = status
		if (nostore != null) view.nostore = nostore
		else if (view.status == 403) view.nostore = true
		else if (view.status == 500) view.nostore = true
		throw new ViewException()
	}

	err (msg, status = 422, nostore = null) {//result 0, но вообще фигня, такое не должно быть
		//Только 404, 403, 500, 422
		//403 - forbidden
		//422 - пользователь может исправить, 
		//500 - пользователь исправить ошибку не сможет
		return this.#ready(msg, status, 0, nostore)
	}
	nope (msg, status = 200, nostore = null) { //result 0, но вообще ок, такое бывает
		return this.#ready(msg, status, 0, nostore)
	}
	ret (msg, status = 200, nostore = null) { //Ништяк
		return this.#ready(msg, status, 1, nostore)
	}

	afterlisteners = []
	after(callback) {
		this.afterlisteners.push(callback)
	}
}
export class Rest {
	afterlisteners = []
	after(callback) {
		this.afterlisteners.push(callback)
	}

	list = []
	extras = []
	constructor (...extras) {
		this.extras = []
		for (const m of extras) {
			if (this.findextra(m)) continue
			this.extras.push(m)
		}
		this.after((view, reans = {}) => {
			reans.nostore = ~view.action.indexOf('set-') || reans.nostore
		})
	}
	findextra ( m ) {
		for (const e of this.extras) {
			if (e === m) return true
			const r = e.findextra(m)
			if (r) return true
		}
	}
	findopt (pname) {
		if (this.list[pname]) return this.list[pname]
		for (const m of this.extras) {
			const opt = m.findopt(pname)
			if (opt) return opt
		}
		return false
	}
	async get (action, req = {}, visitor) {
		if (visitor) req = {...req, visitor}
		const rest = this
		const view = new View(rest, action, req)

		try {
			const opt = rest.findopt(view.action)
			if (!opt?.response && !opt?.request) return view.err('rest.badrequest', 404)

			const res = await view.get(action)
			const reans = res != null ? res : {
				ans: view.ans, 
				nostore: view.nostore, 
				status: view.status,
				ext: view.ext,
				headers: view.headers
			}
			for (const callback of view.afterlisteners) await callback(view, reans)
			for (const callback of rest.afterlisteners) await callback(view, reans)
			return reans
		} catch (e) {
			if (e instanceof ViewException) {
				const reans = {
					ans:view.ans, 
					nostore: view.nostore,
					status: view.status,
					ext: view.ext,
					headers: view.headers
				}
				for (const callback of view.afterlisteners) await callback(view, reans) //выход из базы
				for (const callback of rest.afterlisteners) await callback(view, reans) //постанализ ответа
				return reans
			}
			for (const callback of view.afterlisteners) await callback(view) 
			//for (const callback of rest.afterlisteners) await callback(view)

			//Ошибки могут быть 500, когда сервер себя винит и 422, когда сервер винит пользователя
			//422 возможная ситуация, типа замечание пользователю, почему ты фигню спрашиваешь
			
			//Нет соеденинеия с базой данных.. ну что же мы тут поделаем, пользователь бессилен 500
			//Запрошенного пользователя нет в базе данных 422 - ответить данными пользователя не можем, но проблема не наша.

			//ЗАЧЕМ РАЗЛИЧАТЬ?
			throw e
		}
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
		if (after === true) replace = true

		
		const opt = this.findopt(pname)
		if (opt) { //replace handler
			if (!replace) throw new Error(`Имя обработки уже занято ${pname}`)
		} else {
			if (replace) throw new Error(`Имя обработки не найдено, невозможно заменить ${pname}`)
		}

		this.list[pname] = {
			'name': pname,
			//'process': false,
			'request': false, //Нужно ли брать из REQUEST
			'required': false, //Нужно ли выкидывать исключение если нет request
			'response': false,
			// 'result': null,
			// 'ready': false,
			'once': null,
			'type': null,
			'func': func,
			'after': after,
			'before': before
		}
		return this.list[pname]
	}
	addResponse (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'action'
		opt['response'] = true
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
		return opt
	}
	addHandler (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'handler'
		opt['response'] = false
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
	}
	addArgument (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'argument'
		opt['response'] = false
		opt['request'] = true
		opt['once'] = true
		opt['required'] = true
	}
	addVariable (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'variable'
		opt['response'] = false
		opt['request'] = false
		opt['once'] = true
		opt['required'] = false
	}
	addFunction (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'function'
		opt['response'] = false
		opt['request'] = false
		opt['once'] = false
		opt['required'] = false
	}
}
export default Rest