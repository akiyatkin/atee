import { Meta } from "/-controller/Meta.js"
import { UTM } from '/-form/UTM.js'
import mailtpl from '/-dialog/mail.html.js'
import mail from '/-mail'
import config from '/-config'

const conf = await config('recaptcha')

export const meta = new Meta()
meta.addArgument('g-recaptcha-response')
meta.addVariable('recaptcha', async (view) => {
	const gresponse = await view.get('g-recaptcha-response')
    const visitor = await view.get('visitor')
    const ip = visitor.client.ip
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
const emailreg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
meta.addArgument('email', (view, email) => {
    if (!String(email).toLowerCase().match(emailreg)) return view.err('Уточните Ваш Email')
    return email
})
meta.addArgument('phone', (view, phone) => {
    phone = phone.replace(/\D/g,'')
    phone = phone.replace(/^8/,'7')
    if (phone[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
    if (phone.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+phone+")")
    return phone
})
meta.addArgument('host')
meta.addArgument('text')
meta.addFunction('checkbox', (view, n) => !!n)
meta.addArgument('terms',['checkbox'], (terms) => {
	if (!terms) return view.err('Требуется согласие на обработку персональных данных')
})

meta.addArgument('utms', (view, utms) => UTM.parse(utms))


meta.addArgument('visitor')
meta.addAction('set-contacts', async (view) => {
	await view.gets(['recaptcha','terms'])
	const { visitor } = await view.gets(['visitor'])
    const user = await view.gets(['phone', 'utms'])
    user.host = visitor.client.host
    user.ip = visitor.client.ip
    const html = mailtpl.CALLBACK(user)
    
    const r = await mail.toAdmin(`Заказ звонка ${user.host} ${user.phone}`, html)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
	return view.ret()
})


meta.addAction('get-contacts', (view) => {
	view.ans.SITEKEY = conf.sitekey
	return view.ret()
})

export const rest = async (query, get, visitor) => {
	const ans = await meta.get(query, {...get, visitor})
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: false 
	}
}
