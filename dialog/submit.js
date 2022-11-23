const popup_success = document.createElement('div')
const popup_error = document.createElement('div')
document.body.append(popup_success)
document.body.append(popup_error)
const forms = new WeakSet()
let addinputs = async (form) => {
	if (forms.has(form)) return
	forms.add(form)
	const utms = document.createElement("input")
	utms.type = "hidden"
	utms.name = "utms"
	form.appendChild(utms)
	const UTM = await import('/-form/UTM.js').then(r => r.default)
	const res = await UTM.get()
	utms.value = JSON.stringify(res)

	const conf = await import('/-config/get?name=recaptcha',{assert:{type:'json'}}).then(r => r.default.conf)
	const captha = document.createElement("input")
	captha.type = "hidden"
	captha.name = "g-recaptcha-response"
	form.appendChild(captha)
	await new Promise(async resolve => {
		const src = 'https://www.google.com/recaptcha/api.js?render=' + conf.sitekey
		const s = document.createElement("script")
		s.type = "text/javascript"
		s.crossorigin = "anonymous"
		s.onload = () => grecaptcha.ready(resolve)
		s.src = src
		document.head.append(s)
	})
	
}
const recaptcha = async form => {
	const captha = form.elements["g-recaptcha-response"]
	const conf = await import('/-config/get?name=recaptcha',{assert:{type:'json'}}).then(r => r.default.conf)
	captha.value = await grecaptcha.execute(conf.sitekey, { action: 'dialog' })	
}

let globalonceafter = async () => {
	globalonceafter = () => ({})
	const tplobj = await import('/-dialog/contacts.html.js').then(r => r.default)
	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	await Dialog.frame(popup_success, tplobj.SUCCESS())
	await Dialog.frame(popup_error, tplobj.ERROR())
}

export default async (form, submit, goal = 'contacts') => {
	for (const inp of form.elements) if (inp.tagName == 'BUTTON') inp.disabled = true
	await addinputs(form)
	await recaptcha(form)
	const body = new URLSearchParams(new FormData(form))
	for (const inp of form.elements) inp.disabled = true
	const response = await fetch(submit, {
		method: 'POST',
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	}).catch(e => console.error(e))
	await globalonceafter()
	

	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	const error_msg = popup_error.getElementsByClassName('msg')[0]
	try {
		const res = await response.clone().json()
		if (res.result) {
			Dialog.show(popup_success)
			if (window.dataLayer) {
				console.log('Goal.reach ' + goal);
				dataLayer.push({'event': goal});
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


