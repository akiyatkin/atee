import { Fire } from '/-fire/Fire.js'
export const Form = { ...Fire }

Form.till('init', form => { //before
	form.addEventListener('submit', async e => {
		e.preventDefault()
		Form.puff('submit', form)
	})
})

Form.hand('submit', async form => {
	let ans = false
	if (!form.getAttribute('action')) return ans
	let response = await fetch(form.action, {
		method: 'POST',
		body: new FormData(form)
	})
	let msg = 'Connect Error'
	
	if (response) {
		try {
			ans = await response.clone().json()
		} catch (e) {
			let text = await response.text()
			console.error(e, text)
		}
	}
	if (!ans) ans = {
		result: 0,
		msg: msg
	}
	return ans
})

//Защита от двойной отправки формы
Form.before('submit', form => {
	const buttons = form.getElementsByTagName('button')
	for (const button of buttons) button.disabled = true
	setTimeout(() => {
		for (const button of buttons) button.disabled = false
	}, 10000);
})
Form.till('submit', form => {
	const buttons = form.getElementsByTagName('button')
	setTimeout(() => {
		for (const button of buttons) button.disabled = false
	}, 1000);
})