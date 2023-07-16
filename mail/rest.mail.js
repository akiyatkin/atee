import Rest from "/-rest"
import funcs from '/-rest/rest.funcs.js'
import config from '/-config'
import UTM from '/-form/UTM.js'
const rest = new Rest(funcs)
import Mail from '/-mail'

rest.addArgument('g-recaptcha-response')
rest.addVariable('recaptcha', async (view) => {
	const gresponse = await view.get('g-recaptcha-response')
	const visitor = await view.get('visitor')
	const ip = visitor.client.ip
	const conf = await config('recaptcha')
	const result = await fetch('https://www.google.com/recaptcha/api/siteverify', { 
		method: 'POST',
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			'secret': conf.secret, 
			'response': gresponse,
			'remoteip': ip
		})
	}).then(res => res.json())
	//view.ans.recaptcha = result;
	if (!result || !result['success']) return view.err('Не пройдена защита от спама')
	return true
})


rest.addFunction('toemail', ['string'], (view, email) => {
	if (email && !Mail.isEmail(email)) return view.err('Уточните Email-адрес')
	return email
})
rest.addFunction('toemail#required', ['toemail'], (view, email) => {
	if (!email)  return view.err('Укажите Email-адрес')
	return email
})

rest.addArgument('email', ['toemail'])
rest.addVariable('email#required', (view) => view.get('email'), ['toemail#required'])

rest.addArgument('phone', ['string'], (view, phone) => {
	if (!phone) return phone
	phone = phone.replace(/\D/g,'')
	phone = phone.replace(/^8/,'7')
	if (phone[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
	if (phone.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+phone+")")
	return phone
})
rest.addVariable('phone#required', async (view) => {
	const { phone } = await view.gets(['phone'])
	if (!phone)  return view.err('Укажите ваш номер телефона')
	return phone
})

rest.addArgument('text', ['escape'])

rest.addVariable('text#required', async (view) => {
	const { text } = await view.gets(['text'])
	if (!text) return view.err('Укажите ваше сообщение')
	return text
})

rest.addArgument('org', ['escape'])
rest.addArgument('name', ['escape'])

rest.addArgument('terms',['checkbox'], (view, terms) => {
	if (!terms) return view.err('Требуется согласие на обработку персональных данных')
})

rest.addArgument('utms', (view, utms) => UTM.parse(utms))

rest.addVariable('ip', async view => {
	const { visitor } = await view.gets(['visitor'])
	return visitor.client.ip
})
rest.addVariable('host', async view => {
	const { visitor } = await view.gets(['visitor'])
	return visitor.client.host
})

export default rest