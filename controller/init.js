
const sw = async () => {
	if (!navigator.serviceWorker) return
	const AccessData = await import('/-controller/access', {assert: { type: 'json' }})
	navigator.serviceWorker.register('/-controller/sw?t', { scope:'/' });
	navigator.serviceWorker.addEventListener('message', event => {
		console.log('New version is ready. Reload please.', event.data)
    })
	if (navigator.serviceWorker.controller) { //В первый раз данные придут с кодом воркера
		navigator.serviceWorker.controller.postMessage(AccessData)
	}
}

sw()

