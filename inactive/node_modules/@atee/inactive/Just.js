const Just = {
	store: new WeakMap(),
	getStore: (el) => {
		if (Just.store.has(el)) return Just.store.get(el)
		const store = { }
		Just.store.set(el, store)
		return store
	},
	once: (el, name, fn) => {
		const store = Just.getStore(el, name)
		if (store[name]) return
		store[name] = true
		fn()
	}
}
export { Just }