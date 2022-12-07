import Rest from "/-rest"
import mail from "/-mail"

const rest = new Rest()

rest.addArgument('href')
rest.addArgument('block')
rest.addArgument('error')
rest.addArgument('right')
rest.addArgument('visitor')

rest.addResponse('set-send', async (view) => {
	const { visitor, href, block, error, right } = await view.gets(['visitor', 'href','block','error','right'])
	const host = visitor.client.host
	const r = await mail.toSupport(`Орфографическая ошибка ${host}`,`
			<a href="${href}">${href}</a>
			<p>Ошибка: ${error}</p>
			<p>Как правильно: ${right}</p>
			<p>Блок: ${block}</p>
	`)
	if (r) return view.ret()
	return view.err()
})

export default rest