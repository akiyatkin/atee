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
	<categories>${data.groups.map(yml.category).join('')}
	</categories>
	<offers>
		${data.poss.map(pos => yml.pos(pos, env)).join('')}
	</offers>
 </shop>
 </yml_catalog>
`

const showParentId = (parent_id) => parent_id ? ` parentId="${parent_id}"` : ''
yml.category = (group) => `
	<category id="${group.group_id}" ${showParentId(group.parent_id)}>${group.group_title}</category>
`

yml.url = (pos, env) => `
	<url>https://${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}</url>
`
yml.price = (pos, env) => `
	<price>${pos.Цена || pos.min}</price>
`
yml.pos = (pos, env) => `
 	<offer type="vendor.model" id="${pos.model_id}" available="true">
		${yml.url(pos, env)}
		<model>${pos.Наименование || pos.model_title}</model>
		${yml.price(pos, env)}
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