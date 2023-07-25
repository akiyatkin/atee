import send from '/-dialog/send.js'

const sendit = async (div, action, post) => {
	if (!div.counter) div.counter = 0
	div.counter++
	div.title = "В процессе ..."
	div.classList.add('process')
	div.classList.remove('ready')
	div.classList.remove('error')
	const ans = await send(action, post)
	div.title = ans.msg || "Сохранено"
	setTimeout(() => {
		div.counter--
		if (div.counter) return
		div.classList.remove('process')
		div.classList.add(ans.result ? 'ready' : 'error') 
		setTimeout(() => {
			if (div.counter) return
			//div.classList.remove('ready')
		}, 2000)
	}, 200)
	return ans
}
export default sendit