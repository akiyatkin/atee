import Rest from "/-rest"
import funcs from '/-rest/funcs.js'
import config from '/-config'
import UTM from '/-form/UTM.js'
const rest = new Rest(funcs)

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
const emailreg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
rest.addArgument('email', (view, email) => {
    if (!String(email).toLowerCase().match(emailreg)) return view.err('Уточните Ваш Email')
    return email
})

rest.addArgument('phone', (view, phone) => {
    phone = phone.replace(/\D/g,'')
    phone = phone.replace(/^8/,'7')
    if (phone[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
    if (phone.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+phone+")")
    return phone
})
rest.addArgument('text', ['escape'])
rest.addArgument('org', ['escape'])
rest.addArgument('name', ['escape'])

rest.addArgument('terms',['checkbox'], (terms) => {
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