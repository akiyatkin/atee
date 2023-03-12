import Rest from "/-rest"
import UTM from '/-form/UTM.js'
import mailtpl from '/-dialog/mail.html.js'
import mail from '/-mail'
import config from '/-config'
import nicked from '/-nicked'
import rest_mail from '/-mail/rest.mail.js'
import rest_funcs from '/-rest/rest.funcs.js'


const rest = new Rest(rest_funcs, rest_mail)

rest.addResponse('set-callback', async (view) => {
	await view.gets(['recaptcha','terms'])
    const user = await view.gets(['phone', 'utms', 'host', 'ip'])
    const html = mailtpl.CALLBACK(user)
    const r = await mail.toAdmin(`Заказ звонка ${user.host} ${user.phone}`, html)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
	return view.ret()
})
rest.addResponse('set-contacts', async (view) => {
    await view.gets(['recaptcha','terms'])
    const user = await view.gets(['name', 'text','email', 'org', 'phone', 'utms', 'host', 'ip'])
    const html = mailtpl.CONTACTS(user)
    const r = await mail.toAdmin(`Форма контактов ${user.host}`, html)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
    return view.ret()
})

export default rest