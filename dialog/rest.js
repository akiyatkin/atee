import Rest from "/-rest"
import mailtpl from '/-dialog/mail.html.js'
import mail from '/-mail'

import rest_mail from '/-mail/rest.mail.js'
import rest_funcs from '/-rest/rest.funcs.js'

const rest = new Rest(rest_funcs, rest_mail)

rest.addResponse('set-callback', async (view) => {
	await view.gets(['recaptcha'])
    const user = await view.gets(['phone#required', 'utms', 'host', 'ip'])
    const html = mailtpl.CALLBACK(user)
    const r = await mail.toAdminSplit(`Заказ звонка ${user.host} ${user.phone}`, html, user.email)
    if (!r) return view.err('Не удалось отправить, воспользуйтесь, пожалуйста, телефоном в контактах!')
	return view.ret('Сообщение отправлено')
})
rest.addResponse('set-contacts', async (view) => {
    await view.gets(['recaptcha','terms'])
    const user = await view.gets(['name', 'text', 'email', 'org', 'phone#required', 'utms', 'host', 'ip'])
    const html = mailtpl.CONTACTS(user)
    const r = await mail.toAdminSplit(`Форма контактов ${user.host}`, html, user.email)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')
    return view.ret('Сообщение отправлено')
})

export default rest