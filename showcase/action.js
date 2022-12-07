// const id = id => document.getElementById(id)
// const tag = (tag, el) => el.getElementsByTagName(tag)
// const cls = (cls, el) => el.getElementsByClassName(cls)
import nicked from "/-nicked"
const pops = {}
export const action = (btn, callback, name = '') => {
	const key = name + btn.name
	if (!pops[key]) {	
		pops[key] = document.createElement('div')
		pops[key].id = 'action_'+nicked(key)
		document.body.append(pops[key])
	}
	const pop = pops[key]
	let proc = false
	const iscontent = btn.closest('#CONTENT')
	const href = location.href
	btn.addEventListener('click', async () => {
		if (proc) return
		proc = true
		btn.classList.add('ready')
		
		const src = '/-showcase/'+btn.name + (name ? '?name='+name : '')
		const ans = await fetch(src).then(res => res.json()).catch(e => {return {name, msg:'500 на сервере'}})
		const { Dialog } = await import('/-dialog/Dialog.js')
		const sub = btn.name.replaceAll('-','_')
		const tplobj = await import('/-showcase/popups.html.js')
		if (tplobj[sub]) {
			const html = tplobj[sub](ans, {div:pops[key].id, scope:'#'+pops[key].id})
			
			await Dialog.frame(pop, html)
			Dialog.show(pop)
		} else if (!ans.result) {
			const html = tplobj['msg'](ans, {div:pops[key].id, scope:'#'+pops[key].id})
			await Dialog.frame(pop, html)
			Dialog.show(pop)
		}
		if (!iscontent || location.href != href) {
			const Client = await window.getClient()
			Client.reloaddiv('CONTENT')
		} else {
			callback(ans)
		}
		proc = false
	})
}
export default action