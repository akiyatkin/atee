const popup_success = document.createElement('div')
const popup_error = document.createElement('div')
document.body.after(popup_success)
document.body.after(popup_error)

let globalonceafter = async () => {
	globalonceafter = () => ({})
	const tplobj = await import('/-dialog/contacts.html.js').then(r => r.default)
	const Dialog = await import('/@atee/dialog/Dialog.js').then(r => r.default)
	await Dialog.frame(popup_success, tplobj.SUCCESS())
	await Dialog.frame(popup_error, tplobj.ERROR())
}

export default async (form, submit, goal) => {
	for (const inp of form.elements) if (inp.tagName == 'BUTTON') inp.disabled = true
	const body = new URLSearchParams(new FormData(form))
	for (const inp of form.elements) inp.disabled = true
	const response = await fetch(submit, {
		method: 'POST',
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	}).catch(e => console.error(e))
	await globalonceafter()
	

	const Dialog = await import('/@atee/dialog/Dialog.js').then(r => r.default)
	const error_msg = popup_error.getElementsByClassName('msg')[0]
	try {
		const res = await response.clone().json()
		if (res.result) {
			Dialog.show(popup_success)
			if (goal) {
				const metrikaid = window.Ya?._metrika.getCounters()[0].id
				if (metrikaid) {
					console.log('Goal.reach ' + goal)
					ym(metrikaid, 'reachGoal', goal);	
				}
			}
		} else {
			error_msg.innerHTML = res.msg
			Dialog.show(popup_error)
		}
	} catch (e) {
		let text = await response.text()
		console.error(e, text)
		error_msg.innerHTML = 'Произошла ошибка на сервере. Попробуйте позже'
		Dialog.show(popup_error)
	} finally {
		setTimeout(() => {
			for (const inp of form.elements) inp.disabled = false
		}, 2000)
	}
}


