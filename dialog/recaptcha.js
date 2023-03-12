import action from "/-dialog/action.js"

const forms = new WeakSet()

const conf = await fetch('/-config/get?name=recaptcha').then(r => r.json()).then(r => r.conf)

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
	for (const inp of form.elements) if (inp.tagName == 'BUTTON') inp.disabled = true
	await addinputs(form)
	const captha = form.elements["g-recaptcha-response"]
	captha.value = await grecaptcha.execute(conf.sitekey, { action: 'dialog' })	
}


export default recaptcha


