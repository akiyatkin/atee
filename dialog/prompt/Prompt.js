import nicked from "/-nicked"
import createPromise from "/-controller/createPromise.js"
import Dialog from "/-dialog/Dialog.js"

// const link = document.createElement('link')
// link.rel = 'stylesheet'
// link.href = '/-dialog/search/search.css'
// document.head.prepend(link)

const cls = (div, cls) => div.getElementsByClassName(cls)
const tag = (div, tag) => div.getElementsByTagName(tag)

const Prompt = {
	open: async conf => {
		const popup = await Dialog.open({
			conf,
			tpl:"/-dialog/prompt/prompt.html.js",
			sub:"POPUP"
		})
		if (conf.layer) {
			const Client = await window.getClient()
			conf.layer.div = 'PROMPTTEXT'
			Client.show(conf.layer)
		}
		const form = popup.getElementsByTagName('form')[0]
		Prompt.init(form, row => conf.click(row))
	},
	init: async (form, click) => {
		const input = form.elements[0]
		input.focus()
		form.addEventListener('submit', async e => {
			e.preventDefault()
			const r = await click(input.value)
			if (r != false) Dialog.hide()
		})
		
	}
}
export default Prompt