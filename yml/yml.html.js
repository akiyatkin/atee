const yml = {}
export default yml
yml.ROOT = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${new Date().toISOString()}">
<shop>
	<name>${env.name||env.host}</name>
	<company>${env.company||env.host}</company>
	<url>${env.host}</url>
	<email>${env.email}</email>
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

yml.category = (group) => `
	<category id="${group.group_id}" parentId="${group.parent_id}">${group.group_title}</category>
`
 		
yml.pos = (pos, env) => `
 	<offer type="vendor.model" id="${pos.model_id}" available="true">
		<url>${env.host}/catalog/${pos.brand_nick}/${pos.model_nick}</url>
		<model>${pos.Наименование}</model>
		<price>${pos.Цена}</price>
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

yml.param = (par, key) => `
	<param name="${key}">${par}</param>
`
yml.image = (src) => `
	<picture>${src}</picture>
`