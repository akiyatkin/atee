const request = async (src, btn, {goal, global}) => {
	const entries = Object.entries(btn.dataset)
	let params = entries.map(row => row.join('=')).join('&')
	params = params ? (~src.indexOf('?') ? '&' : '?') + params : ''
	btn.disabled = true
	const ans = await fetch(src + params).then(res => res.json()).catch(e => ({msg:"Ошибка на сервере"}))
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
	btn.disabled = false
	return ans
}
export default request