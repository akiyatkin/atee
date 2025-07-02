const yml = {}
export default yml

yml.ROOT = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${new Date().toISOString()}">
<shop>
	<name>${env.name||env.host}</name>
	<company>${env.company||env.host}</company>
	<url>https://${env.host}</url>
	<email>${env.email || ''}</email>
	<currencies>
		<currency id="RUR" rate="1"/>
	</currencies>
	<categories>
		${data.groups.map(group => yml.category(data, env, group)).join('')}
	</categories>
	<offers>
		${data.poss.map(mod => yml.mod(data, mod, env)).join('')}
	</offers>
	<collections>
		${data.groups.map(group => yml.collection(data, env, group)).join('')}
	</collections>
 </shop>
 </yml_catalog>
`

const showParentId = (parent_id) => parent_id ? ` parentId="${parent_id}"` : ''
yml.category = (data, env, group) => `
	<category id="${group.group_id}" ${showParentId(group.parent_id)}>${group.group_title}</category>
`
yml.collection = (data, env, group) => `
	<collection id="${group.group_nick}">
		<name>${group.group_title}</name>
		${yml.description(data, env, group)}
		${yml.picture(data, env, group)}
		<url>https://${env.host}/catalog/${group.group_nick}${data.partner ? '?theme=partner=' + data.partner.title : ''}</url>
	</collection>
`
yml.description = (data, env, group) => !group.description ? '' : `
	<description><![CDATA[
		${group.description}
	]]></description>
`
yml.picture = (data, env, group) => !group.icon ? '' : `
	<picture>${group.description}</picture>
`
yml.collectionid = (data, env, pos) => `
	<collectionId>${pos.group_nick}</collectionId>
`
yml.url = (data, env, pos) => data.partner ? `
	<url>https://${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}?theme=partner=${data.partner.title}</url>
` : `
	<url>https://${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}</url>
`

yml.price = (data, env, pos) => `
	<price>${pos.Цена || pos.items[0]?.Цена}</price>
`
yml.oldprice = (data, env, pos) => !(pos['Старая цена'] || pos.items[0]?.['Старая цена']) ? '' : `
	<oldprice>${pos['Старая цена'] || pos.items[0]?.['Старая цена']}</oldprice>
`

yml.mod = (data, mod, env) => `
 	<offer type="vendor.model" id="${mod.model_nick}" available="true">
		${yml.url(data, env, mod)}
		<model>${mod.Наименование || mod.model_title}</model>
		${yml.price(data, env, mod)}
		${yml.collectionid(data, env, mod)}
		${yml.oldprice(data, env, mod)}
		<currencyId>RUB</currencyId>
		<categoryId>${mod.group_id}</categoryId>
		${mod.images?.map(yml.image).join('') || ''}
		<vendor>${mod.brand_title}</vendor>
		${yml.des(mod.Описание)}
		<param name="article">${mod.model_title}</param>
		${Object.entries(mod.more).map(yml.param).join('')}
		${Object.entries(mod.items[0]?.more || {}).map(yml.param).join('')}
	</offer>
`
yml.des = (des) => des ? `
	<description><![CDATA[
		${des}
	]]></description>
` : ''

yml.param = (par) => `
	<param name="${par[0]}">${par[1]}</param>
`
yml.image = (src) => `
	<picture>${src}</picture>
`