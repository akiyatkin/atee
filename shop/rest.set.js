import Shop from "/-shop/Shop.js"
import config from "@atee/config"
import Mail from "@atee/mail"
import Rest from "@atee/rest"
const rest = new Rest()
export default rest

import rest_shop from '/-shop/rest.shop.js'
rest.extra(rest_shop)

import rest_mail from '/-mail/rest.mail.js'
rest.extra(rest_mail)

import tpl from '/-shop/mail.html.js'
rest.addResponse('set-order', async (view) => {
	await view.get('recaptcha#required')
	await view.get('terms#required')
	const db = await view.get('db')
	

    const params = await view.gets(['text', 'email#required', 'phone#required', 'brendmodel','art', 'utms', 'partner'])
    params.conf = await config('shop', true)
    params.host = view.visitor.client.host
    params.ip = view.visitor.client.ip
    params.model = await Shop.getModelByBrendmodel(db, params.brendmodel, params.partner)
    if (!params.model) return view.err('Модель не найдена')
    params.item = params.model.items.find(item => item.art?.[0] == params.art || item.brendart[0] == params.art) || model.items[0]
    
    await Shop.prepareModelsPropsValuesGroups(db, params, [params])

    const html = tpl.MAIL(params)
    
    
    const r = await Mail.toAdmin(`Заявка ${params.host} ${params.email}`, html, params.email)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')


	return view.ret()
})