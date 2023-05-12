import Dialog from '/-dialog/Dialog.js'


export default async (form, userlayer = {}) => {
	const goal = form.dataset.goal
	const submit = form.action
	for (const inp of form.elements) if (inp.tagName == 'BUTTON') inp.disabled = true
	const body = new URLSearchParams(new FormData(form))
	const response = await fetch(submit, {
		method: 'POST',
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	}).catch(e => console.error(e))	
	const layer = {tpl: '/-dialog/msg.html.js', sub: 'MSG'}
	Object.assign(layer, userlayer)
	try {
		layer.data = await response.clone().json()
		if (layer.data.result) {
			if (goal) {
				const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
				if (metrikaid) {
					console.log('Goal.reach ' + goal)
					ym(metrikaid, 'reachGoal', goal);
				}
			}
		}
	} catch (e) {
		let text = await response.text()
		console.error(e, text)
		layer.data = {msg:'Произошла ошибка на сервере. Попробуйте позже'}
	} finally {
		setTimeout(() => {
			for (const inp of form.elements) if (inp.tagName == 'BUTTON') inp.disabled = false
		}, 2000)
	}
	await Dialog.open(layer)
	return layer.data
}


