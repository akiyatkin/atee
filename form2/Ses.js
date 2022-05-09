/*
Ses.set('test','a', val) //(space, name, value)
const val = await Ses.get('test','a', null)  //(space, name, def)
*/
const Ses = {
	db: () => {
		if (Ses.db.promise) return Ses.db.promise;
		Ses.db.promise = new Promise((resolve, reject) => {
			const request = window.indexedDB.open("Ses", 7)
			request.onerror = event => {
				console.log('indexedDB error', event.target.error.message)
				reject()
			}
			request.onsuccess = event => {
				const db = event.target.result
				db.onerror = event => console.log("Database error: " + event.target.errorCode)
				resolve(db)
			}
			request.onupgradeneeded  = event => {
				const db = event.target.result
				if (db.objectStoreNames.contains('Ses')) db.deleteObjectStore('Ses');
				if (!db.objectStoreNames.contains('data')) {
					db.createObjectStore('data', { 
						keyPath: ["space","name"] 
					})
				}
				console.log('indexedDB upgrade')
			}
		})
		return Ses.db.promise
	},
	store: type => Ses.db().then(db => {
		if (!db) return false
		return db.transaction(['data'], type).objectStore('data')
	}),

	read: () => Ses.store("readonly"),
	edit: () => Ses.store("readwrite"),
	set: (space, name, val) => Ses.edit().then(store => {
		const request = store.put({space, name, val})
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})	
	}).catch(() => null),
	get: async (space, name, def) => Ses.read().then(store => {
		const request = store.get([space, name])
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(event.target.result ? event.target.result.val : def)
			request.onerror = reject
		})	
	}).catch(() => null),
	del: async (space, name) => Ses.edit().then(store => {
		const request = store.delete([space, name])
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})	
	}).catch(() => null),
	clear: space => Ses.edit().then(store => {
		const request = store.delete([space])
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})
	}).catch(() => null),
	logout: () => Ses.edit().then(store => {
		const request = store.clear()
		return new Promise((resolve, reject) => {
			request.onsuccess = event => resolve(true)
			request.onerror = reject
		})
	}).catch(() => null)
}

export { Ses }