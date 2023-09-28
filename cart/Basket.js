import send from '/-dialog/send.js'
import UTM from '/-form/UTM.js'

const Basket = {}

window.Basket = Basket

const fixolddata = href => {
	if (/^http/.test(href)) return href
	return 'http://'+href
}

Basket.setUtms = async (args = {}) => {
	const list = await UTM.get().catch(r => [])
	list.reverse()
	let row
	try {
		row = list.find(row => {
			const utms = {}
			const loc = new URL(fixolddata(row.href))
			const params = loc.searchParams
			utms.source = params.get("utm_source") || ''
			utms.content = params.get("utm_content") || ''
			utms.campaign = params.get("utm_campaign") || ''
			utms.medium = params.get("utm_medium") || ''
			utms.term = params.get("utm_term") || ''

			//?utm_source=Яндекс&utm_content=Реклама&utm_campaign=Эксперимент&utm_medium=РСЯ&utm_term=купить улей
			for (const i in utms) {
				if (utms[i]) {
					const ref = new URL(fixolddata(row.referrer))
					if (loc.host != ref.host) {
						utms.referrer_host = ref.host
					} else {
						utms.referrer_host = ''
					}
					row.utms = utms
					return true
				}
			}
			
		})
		if (!row) {
			row = list.find(row => {
				const loc = new URL(fixolddata(row.href))
				const ref = new URL(fixolddata(row.referrer))
				if (loc.host == ref.host) return false
				const utms = {}	
				utms.referrer_host = ref.host
				utms.source = ''
				utms.content = ''
				utms.campaign = ''
				utms.medium = ''
				utms.term = ''
				row.utms = utms
				return true
			})
		}
	} catch (e) {
		row = false
	}
	if (row) {
		args.source = row.utms.source
		args.content = row.utms.content
		args.campaign = row.utms.campaign
		args.medium = row.utms.medium
		args.term = row.utms.term
		args.referrer_host = row.utms.referrer_host
	} else {
		args.source = ''
		args.content = ''
		args.campaign = ''
		args.medium = ''
		args.term = ''
		args.referrer_host = ''
	}
	return args
}

Basket.remove = async (args) => {
	await Basket.setUtms(args)
	const ans = await send('/-cart/set-remove', args)
	if (!ans.result) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		Dialog.alert(ans.msg || 'Ошибка на сервере')
		return ans
	}
	const Client = await window.getClient()
	await Client.global('cart')
	return ans
}
Basket.add = async (args, count = 1, nocopy = false) => {
	args.count = count
	args.nocopy = Number(nocopy == 'nocopy')
	await Basket.setUtms(args)
	const ans = await send('/-cart/set-add', args)
	if (!ans.result) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		Dialog.alert(ans.msg || 'Ошибка на сервере')
		return ans
	}
	if (ans.newwaitorder) {
		const Client = await window.getClient()
		await Client.global('cart')
	}
	const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
	if (metrikaid) {
		console.log('Goal.reach basket')
		ym(metrikaid, 'reachGoal', 'basket')
	}
	return ans
}

export default Basket