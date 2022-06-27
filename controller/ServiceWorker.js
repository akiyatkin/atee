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
		const serviceWorkerRegistration = await navigator.serviceWorker.ready

		if (serviceWorkerRegistration.pushManager && serviceWorkerRegistration.pushManager.getSubscription) {
			const subscription = await serviceWorkerRegistration.pushManager.getSubscription()
			//if (!subscription) return
		}
		if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(access_data)
	}
}