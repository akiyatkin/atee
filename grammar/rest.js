import Rest from "/-rest"
import mail from "/-mail"
import rest_mail from "/-mail/rest.mail.js"

const rest = new Rest(rest_mail)

rest.addArgument('href', ['escape'])
rest.addArgument('block', ['escape'])
rest.addArgument('error', ['escape'])
rest.addArgument('right', ['escape'])

rest.addResponse('set-send', async view => {
	const { host, href, block, error, right } = await view.gets(['host', 'href','block','error','right'])
	const r = await mail.toSupport(`Орфографическая ошибка ${host}`,`
		<a href="${href}">${href}</a>
		<p>Ошибка: ${error}</p>
		<p>Как правильно: ${right}</p>
		<p>Блок: ${block}</p>
	`)
	return r ? view.ret() : view.err()
})

export default rest