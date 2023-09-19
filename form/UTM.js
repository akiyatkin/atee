const UTM = {	
	write: async () => {
		const time = new Date().getTime()
		const href = location.href
		return UTM.update({ time, referrer: document.referrer || location.href, href })
	},
	get: async () => UTM.read().then(store => {
		const request = store.getAll()
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(request.result)
			request.onerror = reject
		})
	}).catch(() => null),
	update: (val) => UTM.edit().then(store => {
		const request = store.put(val)
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})
	}).catch(() => null),
	db: () => {
		if (UTM.db.promise) return UTM.db.promise;
		UTM.db.promise = new Promise((resolve, reject) => {
			const request = window.indexedDB.open("UTM", 1) //версия указана
			request.onerror = event => {
				console.log('UTM indexedDB error', event.target.error.message)
				reject()
			}
			request.onsuccess = event => {
				const db = request.result
				db.onerror = event => console.log("UTM Database error: " + event.target.errorCode)
				resolve(db)
			}
			request.onupgradeneeded  = event => {
				const db = request.result
				if (!db.objectStoreNames.contains('data')) {
					db.createObjectStore('data', { 
						keyPath: ["time"] 
					})
				}
				console.log('UTM indexedDB upgrade')
			}
		})
		return UTM.db.promise
	},
	parse: utms => {
		try {
			utms = JSON.parse(utms)
		} catch (e) {
			console.error(e)
			utms = []
		}
		if (!Array.isArray(utms)) utms = []
		utms = utms.reverse()

		utms = utms.filter(utm => {
			if (!utm.href) return false
			if (!utm.referrer) return false
			
			try {
				utm.ref = new URL(utm.referrer)
				utm.url = new URL(utm.href)
				if (!utm.url.host) return false
				if (!utm.ref.host) return false
			} catch (e) {
				return false
			}
			
			try {	
				utm.q = utm.ref.searchParams.get('q') || ''
				utm.q = utm.q.replace(/<\/?[^>]+>/gi, "")
			} catch(e) {
				console.error(e, utm)
				return false
			}

			return true
		})
		return utms
	},
	store: type => UTM.db().then(db => {
		if (!db) return false
		return db.transaction(['data'], type).objectStore('data')
	}),
	read: () => UTM.store("readonly"),
	edit: () => UTM.store("readwrite"),
	logout: () => UTM.edit().then(store => {
		const request = store.clear()
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})
	}).catch(() => null)
}
export default UTM
export { UTM }
