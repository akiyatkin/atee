class ViewException { 
	constructor (msg) {
		this.msg = msg
	}
}
export class View {
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
    constructor (meta, action, req = {}) {
        const view = this
        view.action = action
        view.req = req
        view.meta = meta
        view.ans = {}
    }
    async getopt (opt, parentvalue = null, parentname = null) { //для выполнения replaced
    	const view = this
    	const pname = opt.name
		const forname = parentname || pname;
        let res = parentvalue
        if (opt['request']) {
            if (pname in view.req) {
                res = view.req[pname]
                //if (res == null) res = null
            } else {
                res = null
            }
        }
        for (const n of opt['before'] || []) {
            const r = await view.get(n, res, forname);
			if (r != null) res = r;
        }
		
		if (opt['required']) {
			if (res === null) return view.err(`meta.required ${pname}`);
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
        const meta = view.meta
		if (!meta.list[pname]) return view.err(`meta.notfound ${pname}`)
		const opt = meta.list[pname]
        if (!view.proc[pname]) {
            view.proc[pname] = {
                'ready': false,
                'result': false,
                'process': false
            }
        }
        
        const proc = view.proc[pname]
		if (opt['once'] && proc['ready']) return proc['result'];
		if (proc['process']) return view.err(`meta.recursion ${pname}`);
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
	end () {
		throw new ViewException()
	}
    err (msg) {
        const view = this
        view.ans.result = 0
		if (msg) view.ans.msg = msg
		throw new ViewException(msg);
	}
    ret (msg) {
        const view = this
        view.ans.result = 1
		if (msg) view.ans.msg = msg
		//throw new ViewException();
        return view.ans
	}
	afterlisteners = []
	after(callback) {
		this.afterlisteners.push(callback)
	}
}
export class Meta {
    list = []
    constructor () { }
    async get (action, req = {}) {
        const meta = this
        const view = new View(meta, action, req)

        try {
    		if (!meta.list[view.action]?.response
            && !meta.list[view.action]?.request) {
            	view.ans.status = 404
            	for (const callback of view.afterlisteners) await callback()
    			return view.err('meta.badrequest')
    		}

    		const res = await view.get(action)
    		const ans = res === null ? view.ans : res
    		for (const callback of view.afterlisteners) await callback()
            return ans
        } catch (e) {
        	for (const callback of view.afterlisteners) await callback()
            if (e instanceof ViewException) return view.ans
            throw e
        }
	}
    add (pname, a1, a2, a3) {
		let after, before, func
		if (a1 instanceof Function) {
			func = a1;
			after = a2;
		} else if (a2 instanceof Function) {
			func = a2;
			before = a1;
			after = a3;
		} else if (typeof a1 == 'string') {
			after = a2;
		} else if (typeof a2 == 'string') {
			before = a1;
			after = a3;
		} else {
			if (a2) {
				before = a1;
				after = a2;
			} else {
				before = a1;
			}
		}
		const replaced = this.list[pname] ? this.list[pname] : false
		//if (this.list[pname]) throw `double handler ${pname}`; //подмены разрешены
		this.list[pname] = {
			replaced,
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
    addAction (pname, a1, a2, a3) {
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
export default Meta