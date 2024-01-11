import action from "/-dialog/action.js"

const forms = new WeakSet()

const conf = await fetch('/-config/get?name=recaptcha').then(r => r.json()).then(r => r.conf)

let addinputs = async (form) => {
	if (forms.has(form)) return
	forms.add(form)
	

	//Заглушка чтобы ничего не сломалось. UTM в письмо подставлять тупо, так как на письма отвечают. 
	//Метки нужно сохранять и показывать в админке. Пример Basket.js setUtms.
	const utms = document.createElement("input")
	utms.type = "hidden"
	utms.name = "utms"
	utms.value = "[]"
	form.appendChild(utms)
	
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
recaptcha.getToken = async (action = 'dialog') => {
	await new Promise(async resolve => {
		const src = 'https://www.google.com/recaptcha/api.js?render=' + conf.sitekey
		const s = document.createElement("script")
		s.type = "text/javascript"
		s.crossorigin = "anonymous"
		s.onload = () => grecaptcha.ready(resolve)
		s.src = src
		document.head.append(s)
	})
	const value = await grecaptcha.execute(conf.sitekey, { action })
	return value
}
recaptcha.getArg = async (action = 'dialog') => {
	const value = await recaptcha.getValue()
	return "g-recaptcha-response=" + value
}

export default recaptcha


