import { Meta } from "/-controller/Meta.js"
import mail from "/-mail"

export const meta = new Meta()

meta.addArgument('href')
meta.addArgument('block')
meta.addArgument('error')
meta.addArgument('right')
meta.addArgument('host')

meta.addAction('set-send', async (view) => {
	const { host, href, block, error, right } = await view.gets(['host', 'href','block','error','right'])
	const r = await mail.toSupport(`Орфографическая ошибка ${host}`,`
			<a href="${href}">${href}</a>
			<p>Ошибка: ${error}</p>
			<p>Как правильно: ${right}</p>
			<p>Блок: ${block}</p>
	`)
	if (r) return view.ret()
	return view.err()
})

export const rest = async (query, get, visitor) => {
	const req = { ...get, ...visitor.client }
	const ans = await meta.get(query, req)
	return { ans }
}