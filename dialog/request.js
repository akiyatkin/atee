import cproc from "/-cproc"
import send from "/-dialog/send.js"
let postcounter = 0
const request = async (src, opt = {}) => {
	const {reloaddiv, goal, global, post, args = {}, go, silent = false} = opt
	const entries = Object.entries(args)
	const params = entries.map(row => row.join('=')).join('&')
	src += params ? (~src.indexOf('?') ? '&' : '?') + params : ''
	
	const group = post ? ++postcounter : ''

	return cproc(request, src, async () => {
		//btn.disabled = true //для js
		//btn.setAttribute('disabled', '') //для css
		const ans = await send(src, post)

		if (!silent && !ans.result) {
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
		if (reloaddiv) {
			const Client = await window.getClient()
			Client.reloaddiv(reloaddiv)
		}
		if (global) {
			const Client = await window.getClient()
			await Client.global(global)
		}
		if (go) {
			const Client = await window.getClient()
			await Client.pushState(go)
		}
		setTimeout(() => {
			//btn.removeAttribute('disabled')
			//btn.disabled = false
		}, 300)

		return ans
	}, group)
	
	
}
export default request