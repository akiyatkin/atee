class Relate {
	store = {}
	konce (fname, kname, fn) {
		if (!this.store[fname]) this.store[fname] = {}
		if (this.store[fname][kname]) return this.store[fname][kname].result
		this.store[fname][kname] = {}
		this.store[fname][kname].result = fn()
		return this.store[fname][kname].result
	}
	once (name, fn) {
		if (this.store[name]) return this.store[name].result
		this.store[name] = {}
		this.store[name].result = fn()
		return this.store[name].result
	}
	get (name) {
		return this.store[name]?.result
	}
	kget (fname, kname) {
		return this.store[fname]?.[kname]?.result
	}
	set (name, val) {
		if (!this.store[name]) this.store[name] = {}
		this.store[name].result = val
	}
	kset(fname, kname, val) {
		if (!this.store[fname]) this.store[fname] = {}
		this.store[fname][kname] = {}
		this.store[fname][kname].result = val	
	}
	clear (name) {
		if (name) delete this.store[name]	
		else this.store = {}
	}
	kclear (fname, kname) {
		if (kname) {
			if (!this.store[fname]) return
			delete this.store[fname][kname]
		} else if (fname) {
			delete this.store[kname]
		} else {
			this.store = {}
		}
	}
}

export default Relate