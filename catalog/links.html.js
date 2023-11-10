import nicked from "/-nicked"
import common from "/-catalog/common.html.js"

const links = {}
export default links
links.root = '/catalog'

const getItemIndex = (mod) => {
	const item_index = (mod.item_num || mod.items[0].item_num) - 1
	if (item_index) return '/' + item_index
	return ''
}

links.model = (data, env, mod) => `${links.root}/${mod.brand_nick}/${mod.model_nick}${getItemIndex(mod)}`
links.brand = (data, env, mod) => `${links.root}/${mod.brand_nick}${links.setm(data)}`
links.search = (val, env) => `${links.root}/${nicked(val)}`

//links.amodel = (mod) => `<a href="/catalog/${mod.brand_nick}/${mod.model_nick}">${mod.brand_title} ${mod.model_title}</a>`
//links.abrand = (mod) => `<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
//links.agroup = (mod) => `<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`

links.val = (data, env, mod, pr, val) => `${links.root}/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val ?? common.prnick(mod, pr))}=1`
//links.nick = (data, prop_nick, value_nick) => `/catalog/${links.addm(data)}more.${prop_nick}::.${value_nick}=1`
links.addm = (data) => `?m=${data?.m || data?.bread?.get?.m || ''}:`
links.setm = (data) => ((m) => m ? `?m=${m}` : '')(data?.m || data?.bread?.get?.m)
