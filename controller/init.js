
const sw = async () => {
	if (!navigator.serviceWorker) return
	//const { default: access_data } = await import('/-controller/access', {assert: { type: 'json' }})
	const access_data = await fetch('/-controller/access').then(res => res.json())
	navigator.serviceWorker.register('/-controller/sw?t', { scope:'/' });
	navigator.serviceWorker.addEventListener('message', event => {
		console.log('New version is ready. Reload please.', event.data)
    })
	if (navigator.serviceWorker.controller) { //В первый раз данные придут с кодом воркера
		await navigator.serviceWorker.ready
		navigator.serviceWorker.controller.postMessage(access_data)
	}
}

sw()

