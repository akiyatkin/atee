const eye = {}
eye.calcCls = (main, newvalue, def_value) => {
	return {
		main: `represent-${main}`,
		custom: newvalue == null ? `represent-def-${def_value}` : `represent-custom-${newvalue}`
	}
}

eye.reload = async (layer) => {
	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	Dialog.reload(eye.layer)
}
eye.popup = async (args, reloaddiv) => {
	const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
	eye.layer = {
		tpl:'/-sources/represent.html.js',
		sub:'POPUP',
		conf: {reloaddiv},
		json:'/-sources/get-represent?' + new URLSearchParams(args)
	}
	await Dialog.open(eye.layer, document.body, null, async () => {
		const Client = await window.getClient()
		Client.reloaddiv(reloaddiv)
	})
}
export default eye