import senditmsg from '/-dialog/senditmsg.js'
import UTM from '/-form/UTM.js'

const Basket = {}

const fixolddata = href => {
	if (/^http/.test(href)) return href
	return 'http://'+href
}

Basket.getArgWithUtms = async (args = {}) => {
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


Basket.addButton = async (btn, args ) => {
	const ans = await Basket.add(btn, args)
	if (!ans.newwaitorder) {
		const Client = await window.getClient()
		await Client.global('shop')
	}
}
Basket.remove = async (btn, args) => { // {brendart_nick}
	args = await Basket.getArgWithUtms(args)

	const ans = await senditmsg(btn, '/-shop/cart/set-remove', args)
	if (!ans.result) {
		const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
		Dialog.alert(ans.msg || 'Ошибка на сервере')
		return ans
	}
	const Client = await window.getClient()
	await Client.global('shop')
	return ans
}
Basket.add = async (btn, args) => {
	args = await Basket.getArgWithUtms(args)
	// args.brendart_nick = brendart_nick
	// args.count = count
	// args.nocopy = Number(nocopy == 'nocopy') //Копировать или создать пустую
	const ans = await senditmsg(btn, '/-shop/cart/set-add', args)
	
	if (ans.newwaitorder) {
		const Client = await window.getClient()
		await Client.global('shop')
	}
	return ans
}

export default Basket