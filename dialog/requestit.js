import request from '/-dialog/request.js'

const doit = async (div, action, opt) => {
	if (!div.counter) div.counter = 0
	div.counter++
	div.title = "В процессе ..."
	div.classList.add('process')
	div.classList.remove('ready')
	div.classList.remove('error')
	const ans = await request(action, {...opt, args:div.dataset})
	div.title = ans.msg || "Сохранено"
	setTimeout(() => {
		div.counter--
		if (div.counter) return
		div.classList.remove('process')
		div.classList.add(ans.result ? 'ready' : 'error') 
		setTimeout(() => {
			if (div.counter) return
			div.classList.remove('ready')
		}, 2000)
	}, 500)
	return ans
}
export default doit