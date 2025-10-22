import unique from '/-nicked/unique.js'
import Visitor from '/-controller/Visitor.js'
import ViewException from '/-rest/ViewException.js'
import View from '/-rest/View.js'


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
	extra (rest) {
		if (this.findextra(rest)) return
		const allreadyopt = rest.runRests(rest => {
		 	for (const pname in rest.list) {
		 		//if (rest.list[pname].replaced) continue
		 		const oldrest = this.findrest(pname)
		 		if (!oldrest) continue
		 		if (oldrest.list[pname].replaced) continue
		 		if (oldrest !== rest) return oldrest.list[pname]
		 	}
		})
		if (allreadyopt) {
			//console.log('При добавлении свойства найдено уже используемое имя ' + allready)
			throw 'При добавлении свойства найдено уже используемое имя ' + allreadyopt.name
		}
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

	
	runProcChilds (proc, fn) { //включая себя
		const r = fn(proc)
		if (r != null) return r
		for (const pname in proc.childs) {
			const p = proc.childs[pname]
			const r = this.runProcChilds(p, fn)
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
	
	getViews (visitor) {
		const views = []
		this.runRests(rest => {
			const list = rest.getRestStore(visitor).views
			for (const view of list) views.push(view)
		})
		return unique(views)
	}
	addView (view) {
		const visitor = view.visitor
		// this.runRests(rest => {
		// 	const list = rest.getRestStore(visitor).views
		// 	list.push(view)
		// })
		const list = this.getRestStore(visitor).views
		list.push(view)
	}
	// delView (view) {
	// 	const visitor = view.visitor
	// 	const list = this.getRestStore(visitor).views
	// 	const index = list.indexOf(view)
	// 	list.splice(index, 1);
	// }
	static makeReans (view) {
		return {
			data: view.data ?? 'Internal Server Error', 
			nostore: view.nostore ?? true, 
			status: view.status || 500,
			ext: view.ext ?? 'txt',
			headers: view.headers ?? []
		}
	}
	static async catchReans (view, fn) {
		return fn().catch(e => {
			if (e instanceof ViewException) {
				return Rest.makeReans(e.view)
			} else {
				console.log(e)
				return Rest.makeReans({data: {msg: 'Internal Server Error', result: 0}, status: 500, ext: 'json'})
			}
		})
	}
	async exec (view) {
		let reans = await Rest.catchReans(view, async () => {
			const res = await view.get(view.action)
			if (res != null) view.data = res
			return Rest.makeReans(view)
		})
		
		view.executed = true
		const list = view.rest.getViews(view.visitor)
		const not_executed_view = list.find(view => !view.executed)
		if (not_executed_view) {
			not_executed_view.after(async () => {
				reans = await Rest.catchReans(view, async () => {
					for (const callback of view.afterlisteners) await callback(view) //выход из базы
					return reans
				})
			})
		} else {
			reans = await Rest.catchReans(view, async () => {
				for (const callback of view.afterlisteners) await callback(view) //выход из базы
				return reans
			})
		}
		return reans
	}
	async req (action, req = {}, visitor) { //reans request и action 
		const rest = this
		const orest = rest.findrest(action) //before и after только для addAction
		if (!orest) return Rest.makeReans({data: {msg: 'Not Found', result: 0}, status: 404, ext: 'json',})
		const opt = orest.list[action]
		if (!opt?.response) return Rest.makeReans({data: {msg: 'Method Not Allowed', result: 0}, status: 405, ext: 'json'})
		const view = new View(orest, opt, req, visitor)
		orest.addView(view)

		
		// const views = view.rest.getViews(view.visitor)
		// console.log('req', rest.name, orest.name, views.length, req)
		
		return rest.exec(view)
	}
	data (action, req = {}, visitor = false) { //ans любой
		return this.get(action, req, visitor).then(reans => reans.data)
	}
	get (action, req = {}, visitor = false) { //ans любой

		if (!visitor) visitor = new Visitor()
		const rest = this
		
		const orest = rest.findrest(action) //before и after только для addAction
		
		if (!orest) return Promise.resolve(Rest.makeReans({data: {msg: 'Not Found', result: 0}, status: 404, ext: 'json',}))
		const opt = orest.list[action]
		const view = new View(orest, opt, req, visitor) //Создаётся у родительского реста
		orest.addView(view)
		// const views = view.rest.getViews(view.visitor)
		// console.log('get', rest.name, orest.name, views.length, req)
		// return
		
		return rest.exec(view)
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
			if (!replace) {
				console.log(`Имя обработки уже занято ${pname}`)
				throw new Error()
			}
		} else {
			if (replace) {
				console.log(`Имя обработки не найдено, нечего заменять ${pname}`)
				throw new Error()
			}
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
		opt['nostore'] = null
		opt['response'] = false
		opt['request'] = true
		opt['once'] = true
		opt['required'] = true
	}

	addVariable (pname, a1, a2, a3) {
		const opt = this.add(pname, a1, a2, a3)
		opt['type'] = 'variable'
		opt['nostore'] = null
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
		opt['nostore'] = null
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