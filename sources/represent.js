const represent = {}
represent.calcCls = (main, newvalue, def_value) => {
	return {
		main: `represent-${main}`,
		custom: newvalue == null ? `represent-def-${def_value}` : `represent-custom-${newvalue}`
	}
}
represent.set = async (btn, name, args) => {
	const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
	const data = await senditmsg(btn, '/-sources/set-' + name, args) 
	if (!data.result) return data
	btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
	btn.classList.add(data.cls.main, data.cls.custom)
	return data
}
represent.reload = async () => {
	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	Dialog.reload(represent.layer)
}
represent.popup = async (args, reloaddiv) => {
	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	represent.layer = {
		tpl:'/-sources/represent.html.js',
		sub:'POPUP',
		conf: {reloaddiv},
		json:'/-sources/get-represent?' + new URLSearchParams(args)
	}
	await Dialog.open(represent.layer, document.body, null, async () => {
		const Client = await window.getClient()
		//Client.global('recalc') рекалк сам обновляется
		Client.global('check')
		if (reloaddiv) {
			//Client.reloaddiv(reloaddiv)
		}
	})
}
export default represent