import nicked from "/-nicked"
import common from "/-catalog/common.html.js"

const links = {}
export default links

links.model = (data, env, mod) => `${env.crumb.parent}/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}`
links.brand = (data, env, mod) => `${env.crumb.parent}/${mod.brand_nick}${links.setm(data)}`
links.search = (val, env) => `${env.crumb.parent}/${nicked(val)}`

//links.amodel = (mod) => `<a href="/catalog/${mod.brand_nick}/${mod.model_nick}">${mod.brand_title} ${mod.model_title}</a>`
//links.abrand = (mod) => `<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
//links.agroup = (mod) => `<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`

links.val = (data, env, mod, pr, val) => `${env.crumb.parent}/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val ?? common.prnick(mod, pr))}=1`
//links.nick = (data, prop_nick, value_nick) => `/catalog/${links.addm(data)}more.${prop_nick}::.${value_nick}=1`
links.addm = (data) => `?m=${data?.m || ''}:`
links.setm = (data) => data?.m ? `?m=${data.m}` : ''
