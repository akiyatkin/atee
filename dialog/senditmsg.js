import sendit from '/-dialog/sendit.js'


const senditmsg = async (div, action, post) => {
	const ans = await sendit(div, action, post)
	if (!ans.result || ans.msg) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		if (ans.heading) {
			await Dialog.alert(`
				<h1>${ans.result ? 'Готово' : 'Ошибка'}</h1>
				<p style="max-width: 400px; position: relative;">
					${ans.msg || 'Пустой ответ'}
				</p>
			`)
		} else {
			await Dialog.alert(ans.msg || 'Пустой ответ')
		}
	}
	return ans
}

export default senditmsg