const yml = {}
export default yml

yml.ROOT = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${new Date().toISOString()}">
<shop>
	<name>${env.conf.name || env.host}</name>
	<company>${env.conf.company || env.host}</company>
	<url>https://${env.host}</url>
	<email>${env.email || ''}</email>
	<currencies>
		<currency id="RUR" rate="1"/>
	</currencies>
	<categories>
		${data.group_nicks.map(group_nick => yml.category(data, env, group_nick)).join('')}
	</categories>
	<offers>
 		${data.list.map(plop => yml.showOffer(data, env, plop)).join('')}
 	</offers>
 	<collections>
 		${data.group_nicks.map(group_nick => yml.collection(data, env, group_nick)).join('')}
 	</collections>


 </shop>
 </yml_catalog>
`


const showParentId = (parent_id) => parent_id ? ` parentId="${parent_id}"` : ''
yml.category = (data, env, group_nick, group = data.groups[group_nick]) => `
	<category id="${group.group_id}" ${showParentId(group.parent_id)}>${group.group_title}</category>
`
yml.collection = (data, env, group_nick, group = data.groups[group_nick]) => `
	<collection id="${group.group_nick}">
		<name>${group.group_title}</name>
		${yml.description(data, env, data.group_descriptions[group.group_nick])}
		${yml.picture(data, env, data.group_icons[group.group_nick])}
		<url>https://${env.host}${env.shop.root_path}/group/${group.group_nick}${data.partner ? '?theme=partner=' + data.partner.title : ''}</url>
	</collection>
`
yml.description = (data, env, description) => !description ? '' : `
	<description><![CDATA[
		${description}
	]]></description>
`
yml.picture = (data, env, icon) => !icon ? '' : `
	<picture>${icon}</picture>
`
yml.collectionid = (data, env, group_nick) => `
	<collectionId>${group_nick}</collectionId>
`
yml.url = (data, env, plop) => data.partner ? `
	<url>https://${env.host}${env.shop.root_path}/item/${plop.brendmodel_nick}?theme=partner=${data.partner.title}</url>
` : `
	<url>https://${env.host}${env.shop.root_path}/item/${plop.brendmodel_nick}</url>
`

yml.price = (data, env, plop) => `
	<price>${plop.cena_title}</price>
`
yml.oldprice = (data, env, plop) => !plop['staraya-cena_title'] ? '' : `
	<oldprice>${plop['staraya-cena_title']}</oldprice>
`

yml.showOffer = (data, env, plop) => `
 	<offer type="vendor.model" id="${plop.brendmodel_nick}" available="true">
		${yml.url(data, env, plop)}
		<model>${plop.naimenovanie_title || plop.model_title || plop.brendmodel_title}</model>
		${yml.price(data, env, plop)}
		${plop.group_nicks.map(group_nick => yml.collectionid(data, env, group_nick)).join('')}
		${yml.oldprice(data, env, plop)}
		<currencyId>RUB</currencyId>
		<typePrefix>${plop.group_nicks.length > 1 ? data.groups[plop.group_nicks.at(-1)].group_title : data.groups[plop.group_nicks[0]].group_title}</typePrefix>
		<categoryId>${plop.group_nicks.length > 1 ? data.groups[plop.group_nicks.at(-1)].group_id : plop.group_ids[0]}</categoryId>
		${plop.images_title ? yml.image(plop.images_title) : ''}
		${yml.brand(data, env, plop)}
		${yml.des(plop.opisanie_title)}
		${yml.article(data, env, plop)}
	</offer>
`
yml.article = (data, env, plop) => !plop.model_title ? '' : `<param name="article">${plop.model_title}</param>`
yml.brand = (data, env, plop) => !plop.brend_title ? '' : `<vendor>${plop.brend_title}</vendor>`
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