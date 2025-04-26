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
		${data.poss.map(pos => yml.pos(data, pos, env)).join('')}
	</offers>
 </shop>
 </yml_catalog>
`

const showParentId = (parent_id) => parent_id ? ` parentId="${parent_id}"` : ''
yml.category = (data, env, group) => data.partner ? `
	<category id="${group.group_id}" ${showParentId(group.parent_id)} url="https://${env.host}/catalog/${group.group_nick}?theme=partner=${data.partner.title}">${group.group_title}</category>
` : `
	<category id="${group.group_id}" ${showParentId(group.parent_id)} url="https://${env.host}/catalog/${group.group_nick}">${group.group_title}</category>
`

yml.url = (data, pos, env) => data.partner ? 
`
	<url>https://${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}?theme=partner=${data.partner.title}</url>
` : `
	<url>https://${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}</url>
`

yml.price = (data, pos, env) => `
	<price>${pos.Цена || pos.min}</price>
`
yml.oldprice = (data, pos, env) => !pos['Старая цена'] ? '' : `
	<oldprice>${pos['Старая цена']}</oldprice>
`
yml.pos = (data, pos, env) => `
 	<offer type="vendor.model" id="${pos.model_id}" available="true">
		${yml.url(data, pos, env)}
		<model>${pos.Наименование || pos.model_title}</model>
		${yml.price(data, pos, env)}
		${yml.oldprice(data, pos, env)}
		<currencyId>RUB</currencyId>
		<categoryId>${pos.group_id}</categoryId>
		${pos.images?.map(yml.image).join('') || ''}
		<vendor>${pos.brand_title}</vendor>
		${yml.des(pos.Описание)}
		<param name="article">${pos.model_title}</param>
		${Object.entries(pos.more).map(yml.param).join('')}
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