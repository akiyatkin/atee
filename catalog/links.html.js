import { nicked } from "/-nicked/nicked.js"
import common from "/-catalog/common.html.js"

const links = {}
export default links

links.model = (data, mod) => `/catalog/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}`
links.brand = (data, mod) => `/catalog/${mod.brand_nick}${links.setm(data)}`
links.search = (val) => `/catalog/${nicked(val)}`

//links.amodel = (mod) => `<a href="/catalog/${mod.brand_nick}/${mod.model_nick}">${mod.brand_title} ${mod.model_title}</a>`
//links.abrand = (mod) => `<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
//links.agroup = (mod) => `<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`

links.val = (data, mod, pr, val) => `/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val ?? common.prnick(mod, pr))}=1`
links.addm = (data) => `?m=${data?.m || ''}:`
links.setm = (data) => data?.m ? `?m=${data.m}` : ''
