import { nicked } from "/-nicked/nicked.js"
import layout from "/-catalog/layout.html.js"

const links = {}
export default links

links.model = (mod) => `/catalog/${mod.brand_nick}/${mod.model_nick}`
links.val = (data, mod, pr) => `/catalog/${links.add(data)}more.${pr.prop_nick}::.${nicked(layout.prnick(mod, pr))}=1`
links.add = (data) => `?m=${data?.m || ''}:`
