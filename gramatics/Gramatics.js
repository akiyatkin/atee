export const Gramatics = {
	ask: async () => {
		const selection = window.getSelection()
		if (!selection.anchorNode) return
		if (selection.isCollapsed) return
		let block = selection.anchorNode.textContent
		if (selection.anchorNode != selection.focusNode) {
			block += selection.focusNode.textContent	
		}
		const href = location.href
		const error = selection.toString()
		let right = window.prompt('Ошибка в тексте "' + error + '". Подскажите, пожалуйста, как правильно:')
		if (right === null) return
		right = ( right || '' ).replace(/[<>]/g, tag => ({
		      '<': '&lt;',
		      '>': '&gt;'
	    }[tag]))
	    
	    const data = {href, block, error, right}
	    await fetch('/-gramatics/set-send', {
			method: 'POST',
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams(data)
		}).then(res => res.json()).then(ans => {
			if (ans.result)	alert('Отправлено, спасибо!')
			else throw false
		}).catch(e => {
			console.error(e)
			alert('Что-то пошло не так! Не отправлено.')
		})
	}
}
export default Gramatics