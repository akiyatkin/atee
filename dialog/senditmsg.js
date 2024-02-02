import sendit from '/-dialog/sendit.js'


const senditmsg = async (div, action, post) => {
	const ans = await sendit(div, action, post)
	if (!ans.result || ans.msg) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		Dialog.alert(ans.msg || 'Пустой ответ')
	}
	return ans
}

export default senditmsg