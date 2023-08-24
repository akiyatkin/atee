import send from '/-dialog/send.js'


const sendit = async (div, action, post) => {
	if (!div.counter) div.counter = 0
	div.counter++
	div.title = "В процессе ..."
	sendit.setClass(div, 'process')
	const ans = await send(action, post)
	div.title = ans.msg || "Сохранено"
	setTimeout(() => {
		div.counter--
		if (div.counter) return
		sendit.setClass(div, ans.result ? 'success' : 'error')
	}, 200)
	return ans
}
sendit.setClass = (div, name) => {
	div.classList.remove('process', 'success', 'error', 'submit')
	div.classList.add(name)
}
export default sendit