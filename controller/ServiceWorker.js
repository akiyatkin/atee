const access_data_promise = fetch('/-controller/access').then(res => res.json())
export const ServiceWorker = {
	register: async (fn) => {
		if (!navigator.serviceWorker) return
		navigator.serviceWorker.register('/-controller/sw.js', { scope:'/' });
		navigator.serviceWorker.addEventListener('message', async event => {
			console.log('New version is ready. Reload please.', event.data)
			fn(event.data)
		})
	},
	postMessage: async (access_data) => {
		if (!navigator.serviceWorker) return
		await navigator.serviceWorker.ready
		navigator.serviceWorker.controller.postMessage(access_data)
	}
}