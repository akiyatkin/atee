export const createPromise = (payload) => {
	let resolve, reject
	const promise = new Promise((r, j) => {
		resolve = r
		reject = j
	})
	promise.payload = payload
	promise.resolve = r => {
		promise.result = r
		promise.resolved = true
		promise.rejected = false
		promise.finalled = true
		resolve(r)
	}
	promise.reject = r => {
		promise.result = r
		promise.resolved = false
		promise.rejected = true
		promise.finalled = true
		reject(r)
	}
	promise.catch(e => null)
	return promise
}

export default createPromise