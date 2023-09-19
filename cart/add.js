import send from '/-dialog/send.js'
import UTM from '/-form/UTM.js'

const add = async (args) => {





	const list = await UTM.get();
	list.reverse()
	const row = list.find(row => {
		const params = new URL(row.href).searchParams
		const vals = []
		for (const name of ["utm_source", "utm_content", "utm_campaign", "utm_medium", "utm_term"]) {
			const val = params.get(name)
			if (val) vals.push(val)
		}
		const utm = vals.join(', ')
		row.utm = utm
		if (utm) return true
		return false
		if (!row.referrer) return
	})
	if (row) {
		console.log(row.utm)
	}




	const ans = await send('/-cart/set-add?count=1', args)
	if (!ans.result) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		Dialog.alert(ans.msg || 'Ошибка на сервере')
		return ans
	}
	const Client = await window.getClient()
	await Client.global('cart')
	const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
	if (metrikaid) {
		console.log('Goal.reach basket')
		ym(metrikaid, 'reachGoal', 'basket')
	}
	return ans
}

export default add