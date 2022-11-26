import Meta from "/-controller/Meta.js"
import UTM from '/-form/UTM.js'
import mailtpl from '/-dialog/mail.html.js'
import mail from '@atee/mail'
import config from '@atee/config'
import nicked from '@atee/nicked'

const conf = await config('recaptcha')

export const meta = new Meta()

meta.addFunction('nicked', (view, v) => nicked(v))
meta.addFunction('escape', (view, text) => text.replace(/[&<>]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
}[tag])))

meta.addFunction('int', (view, n) => Number(n) || 0)

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
    if (!result || !result['success']) return view.err('Не пройдена защита от спама')
    return true
})

const emailreg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
meta.addArgument('email', (view, email) => {
    if (email && !String(email).toLowerCase().match(emailreg)) return view.err('Уточните Ваш Email')
    return email
})
meta.addArgument('phone', (view, phone) => {
    phone = phone.replace(/\D/g,'')
    phone = phone.replace(/^8/,'7')
    if (phone[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
    if (phone.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+phone+")")
    return phone
})

meta.addArgument('visitor')
meta.addVariable('ip', async view => {
    const { visitor } = await view.gets(['visitor'])
    return visitor.client.ip
})
meta.addVariable('host', async view => {
    const { visitor } = await view.gets(['visitor'])
    return visitor.client.host
})
meta.addArgument('text', ['escape'])
meta.addArgument('org', ['escape'])
meta.addArgument('name', ['escape'])
meta.addFunction('checkbox', (view, n) => !!n)
meta.addArgument('terms',['checkbox'], (terms) => {
	if (!terms) return view.err('Требуется согласие на обработку персональных данных')
})

meta.addArgument('utms', (view, utms) => UTM.parse(utms))

meta.addAction('set-callback', async (view) => {
	await view.gets(['recaptcha','terms'])
    const user = await view.gets(['phone', 'utms', 'host', 'ip'])
    const html = mailtpl.CALLBACK(user)
    const r = await mail.toAdmin(`Заказ звонка ${user.host} ${user.phone}`, html)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
	return view.ret()
})
meta.addAction('set-contacts', async (view) => {
    await view.gets(['recaptcha','terms'])
    const user = await view.gets(['name', 'text','email', 'org', 'phone', 'utms', 'host', 'ip'])
    const html = mailtpl.CONTACTS(user)
    const r = await mail.toAdmin(`Форма контактов ${user.host}`, html)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
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
