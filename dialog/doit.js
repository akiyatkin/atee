import request from '/-dialog/request.js'

const doit = async (div, action, opt) => {
	if (!div.counter) div.counter = 0
	div.counter++
	div.classList.add('process')
	div.classList.remove('ready')
	request(action, div, opt)
	setTimeout(() => {
		div.counter--
		if (div.counter) return
		div.classList.remove('process')
		div.classList.add('ready')
		setTimeout(() => {
			if (div.counter) return
			div.classList.remove('ready')
		}, 2000)
	}, 500)
}
export default doit