import cproc from "/-cproc"
let postcounter = 0
const request = async (src, btn, opt = {}) => {
	const {goal, global, post} = opt
	const entries = Object.entries(btn.dataset)
	const params = entries.map(row => row.join('=')).join('&')
	src += params ? (~src.indexOf('?') ? '&' : '?') + params : ''
	
	const group = post ? ++postcounter : ''

	return cproc(request, src, async () => {
		//btn.disabled = true //для js
		//btn.setAttribute('disabled', '') //для css

		const formBody = []
		if (post) {
			for (const property in post) {
				const encodedKey = encodeURIComponent(property)
				const encodedValue = encodeURIComponent(post[property])
				formBody.push(encodedKey + "=" + encodedValue)
			}
		}
		const ans = await fetch(src, {
			method: post ? 'POST' : 'GET',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
			body: formBody.join("&")
		}).then(res => res.json()).catch(e => ({msg:"Ошибка на сервере"}))

		if (!ans.result) {
			const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
			await Dialog.alert(ans.msg)
		}
		if (goal && ans.result) {
			const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
			if (metrikaid) {
				console.log('Goal.reach ' + goal)
				ym(metrikaid, 'reachGoal', goal);
			}
		}
		if (global) {
			const Client = await window.getClient()
			await Client.global(global)
		}
		setTimeout(() => {
			//btn.removeAttribute('disabled')
			//btn.disabled = false
		}, 300)
		
		return ans
	}, group)
	
	
}
export default request