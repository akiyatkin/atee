let createPromise = (callback) => { //Промис с вшнешним управлением promise.resolve()
	let resolve
	let promise = new Promise(r => resolve = r)
	promise.resolve = result => {
		if (callback) callback(promise, result)
		resolve(result)
	}
	return promise
}
let getContext = (that, name) => {  // Контекст событий name у объекта that. Метод приватный
	if (!that.__fire) that.__fire = {}
	if (that.__fire[name]) return that.__fire[name]
	return that.__fire[name] = new Context(that, name)
}
let allstack = async (lists, callback) => {
	let list = lists.find(list => list.length)
	if (!list) {
		if (callback) callback()
		return
	}
	let i = list.length - 1
	let el = list[i]
	let r = await el
	if (list[i] === el) list.splice(i, 1)
	await allstack(lists, (nr) => {
		if (r == null) r = nr
		if (callback) callback(r) //callback запустится без задержки
	})
	return r
}
let firerun = async (context, event, obj, opt) => {
	//once
	event.opt = opt

	context.stackevents.push(event.promise)
	context.startonce = true
	event.promise.start = true
	context.once.map(callback => context.stackonce.push(callback()))
	context.once.length = 0;


	//race
	await allstack([
		context.stackonce
	], () => {
		event.promise.startrace = true
		context.race.map(callback => callback(obj, opt))
	})


	//before till
	await allstack([
		context.stackonce
	], () => {
		event.promise.starttill = true
		event.promise.stacktill = context.till.map(callback => callback(obj, opt))
	})


	//hand
	await allstack([
		context.stackonce,
		event.promise.stacktill
	], () => {
		event.promise.starthand = true
		event.promise.stackhand = context.hand.map(callback => callback(obj, opt))
	})

	let result = await allstack([
		event.promise.stackhand
	])

	//after syne
	await allstack([
		context.stackonce,
		event.promise.stacktill,
		event.promise.stackhand
	], () => {
		event.promise.startsyne = true
		event.promise.stacksyne = context.syne.map(callback => callback(obj, result, opt))
	})


	//done нельзя делать await так как функция должна вернуть оригинальный event.promise а после resolve(result) может быть drop
	allstack([
		context.stackonce,
		event.promise.stacktill,
		event.promise.stackhand,
		event.promise.stacksyne
	], () => {
		event.promise.resolve(result) //Подписки на событие через then запустятся после after. Хочешь получить результат раньше подписывайся на after
		event.promise.startdone = true
		context.done.map(callback => callback(obj, result, opt))
	})
}
class Context {
	constructor(that, name) {
		this.res = new Map
		this.once = [] //одноразоыве события замедляющее генерацию, перед race
		this.race = [] //Запускаются первым без ожидания
		this.till = []
		this.hand = [] //Запускаются с ожиданием
		this.syne = []
		this.done = []
		this.stackonce = [] //Промисы событий на 1 раз
		this.stackevents = [] //Промисы всех запущенных событий
		this.that = that //Владелец контекста событий
		this.name = name //Имя контекста событий
		this.promise = createPromise() // промис с внешним управлением promise.resolve()

	}
	getEvent(obj) {
		let event = this.res.get(obj)
		if (!event) this.res.set(obj, event = new Event(this, obj))
		return event
	}
}

class Event {
	constructor(context, obj) {
		this.context = context
		this.obj = obj
		this.init()
	}
	init() {
		this.promise = createPromise((promise, result) => {
			promise.end = true
			promise.result = result
			this.context.promise.resolve()
		})
	}
	drop() {
		if (!this.promise.start) return //Событие итак дропнутое
		this.init()
	}
	whenfree(callback) {
		if (!this.promise.start) return callback()
		if (this.promise.end) return callback()
		this.promise.then(() => this.whenfree(callback) )
		return this.promise
	}
}



let Fire = {
	// getContext(name) {
	// 	return getContext(this, name)
	// },
	//depricated
	on(name, obj) { return this.fire(name, obj) },

	// puff(name, obj, opt) {
	// 	let context = getContext(this, name)
	// 	let event = context.getEvent(obj)

	// 	if (event.promise.end) event.drop()
	// 	event.promise.puff = { name, obj, opt }
		
	// 	clearTimeout(event.pufftimer)
	// 	event.pufftimer = setTimeout(() => {
	// 		if (!event.promise.puff) return //Может сработать предыдущий цикл и выполнить puff
	// 		let { name, obj, opt } = event.promise.puff
	// 		return this.emit(name, obj, opt)
	// 	}, 400)
	// 	return event.promise
	// },
	puff(name, obj, gr, opt) {
		if (!this.puff.storage) this.puff.storage = new Map()
		
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		if (event.promise.end) event.drop()

		let groups = this.puff.storage.get(name)
		if (!groups) this.puff.storage.set(name, groups = new Map())

		let group = groups.get(gr)
		if (!group) groups.set(gr, group = { timer: null, promise: createPromise() })

		const timer = group.timer ? 500 : 1
		clearTimeout(group.timer)
		group.timer = setTimeout(async () => {
			let res = this.emit(name, obj, opt)
			group.promise.resolve(res)
			group.promise = createPromise()
			group.timer = setTimeout(() => {
				group.timer = null
			}, 500)
		}, timer)	
		return group.promise
	},
	chil(name, obj, gr, opt) {
		if (!this.chil.storage) this.chil.storage = new Map()

		let groups = this.chil.storage.get(name)
		if (!groups) this.chil.storage.set(name, groups = new Map())

		let group = groups.get(gr)
		if (!group) groups.set(gr, group = { timer: null, promise: createPromise() })

		clearTimeout(group.timer)
		group.timer = setTimeout(async ()=> {
			let res = this.fire(name, obj, opt)
			group.promise.resolve(res)
			group.promise = createPromise()
		}, 400)

		return group.promise
	},
	emit(name, obj, opt) {
		const context = getContext(this, name)
		const event = context.getEvent(obj)
		return event.whenfree(() => {
			event.drop()
			return this.fire(name, obj, opt)
		})
	},
	
	
	fire(name, obj, opt) {
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		if (event.promise.start) return event.promise
		firerun(context, event, obj, opt)
		return event.promise
	},
	elan(name, obj, opt) {
		//fire и сбрасываются события для других объектов
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		if (event.promise.start) return event.promise

		allstack([context.stackevents], () => {
			for (let [obj, event] of context.res) {
				event.drop()
			}
			this.fire(name, obj, opt)
		})
		return event.promise
	},

	tick (name) {
		let context = getContext(this, name)
		return allstack([context.stackevents], () => {
			for (let [obj, event] of context.res) {
				event.drop()
			}
		})
	},
	tik(name) { //depricated
		return this.tick(name)
	},


	drop(name, obj) {
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		return event.whenfree(() => {
			event.drop()
		})
	},
	keep(name, obj, res, opt) {
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		return event.whenfree(() => {
			if (event.promise.start && event.promise.result === res) return 
			event.drop()
			context.startonce = true
			event.promise.start = true
			event.promise.startrace = true

			event.promise.starttill = true
			event.promise.stacktill = []

			event.promise.starthand = true
			event.promise.stackhand = []

			event.promise.startsyne = true
			event.promise.stacksyne = []

			event.promise.startdone = true
			event.promise.resolve(res)
		})
	},
	race(name, callback) {
		let context = getContext(this, name)
		context.race.push(callback)
		for (let [obj, event] of context.res) {
			if (!event.promise.startrace) continue
			allstack([
				context.stackonce
			], () => {
				callback(obj)
			})
		}
	},
	till (name, callback) { // before = till
		let context = getContext(this, name)
		context.till.push(callback)
		for (let [obj, event] of context.res) {
			if (!event.promise.starttill) continue
			allstack([
				context.stackonce
			], () => {
				callback(obj)
			})
		}
	},
	before(name, callback) { //depricated till
		return this.till(name, callback)
	},
	hand(name, callback) {
		let context = getContext(this, name)
		context.hand.push(callback)
		for (let [obj, event] of context.res) {
			if (!event.promise.starthand) continue //Ещё не закончился Push добавлен в список callback Запуститься со всеми
			allstack([
				context.stackonce,
				event.promise.stacktill
			], () => {
				callback(event.obj, event.opt)
			})
		}
	},
	syne(name, callback) { // syne = after
		let context = getContext(this, name)
		context.syne.push(callback);
		for (let [obj, event] of context.res) {
			if (!event.promise.startsyne) continue //Ещё не закончился Push добавлен в список callback Запуститься со всеми

			allstack([
				context.stackonce,
				event.promise.stacktill,
				event.promise.stackhand
			], () => {
				callback(event.obj, event.promise.result, event.opt)
			})
		}
	},
	after(name, callback) { //depricated syne
		return this.syne(name, callback)
	},

	done(name, callback) {
		let context = getContext(this, name)
		context.done.push(callback);
		for (let [obj, event] of context.res) {
			if (!event.promise.startdone) continue

			allstack([
				context.stackonce,
				event.promise.stacktill,
				event.promise.stackhand,
				event.promise.stacksyne
			], () => {
				callback(event.obj, event.promise.result, event.opt)
			})
		}
	},
	async once(name, callback) { //Промис подписыается на завершение следующего запуска, а callback сразу
		let context = getContext(this, name)
		if (callback) {
			if (context.startonce) {
				let r = callback()
				context.stackonce.push(r)
			} else {
				context.once.push(callback)
			}

		}
		await context.promise //Нужен любой запуск вообще
		await allstack([  //И только потом ждём что всё что запустилось выполнилось
			context.stackonce, //раз уж только что на once подписались
			context.stackevents
		])
	},
	wait(name, obj) {
		let context = getContext(this, name)
		let event = context.getEvent(obj)
		return event.promise

	}
}

export { Fire, createPromise }
export default Fire