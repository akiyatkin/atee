import SELECTORS from "/-shop/selectors.js"
import nicked from "/@atee/nicked"
import unique from "/-nicked/unique.js"
/*
	brendmodel - модель со свойствами Object.keys(ps.model.recap) не в model.iprops
	brendart_nick - позиция со свойствами ps.prop_nicks_static
	art - параметризированые свойства ps.prop_nicks_dynamic
*/
const getNameUnit = (title) => {
	let name = title
	let unit = ''
	const r = title.split(', ')
	if (r.length > 1) {
		unit = r.pop() || ''
		name = r.join(', ')
	}
	return {name, unit}
}
for (const m in SELECTORS) {
	const PARAM = SELECTORS[m]
	const props = {}
	const values = {}

	PARAM.props["Арт"] ??= {
		"known":"column",
		"type":"value",
		"check": titem => PARAM.extract.map(name => titem[name]).join(" ")
	}

	for (const prop_title in PARAM.props) {
		const prop = PARAM.props[prop_title]
		const {name, unit} = getNameUnit(prop_title)

		prop.name = name
		prop.unit = unit

		prop.prop_nick = nicked(prop_title)
		props[prop.prop_nick] = prop
		
		prop.prop_title = prop_title
		if (!prop.titles) continue
		//prop.titles = prop.titles.map(title => title + '')
		if (prop.type == 'number') {
			//prop.nicks = prop.titles.map(title => Number(title))
			prop.nicks = prop.titles.map(title => nicked(title))
		} else if (prop.type == 'value') {
			prop.nicks = prop.titles.map(title => nicked(title))
		}

		if (prop.type == 'value') {
			prop.titles.forEach((value_title, i) => {
				values[prop.nicks[i]] = {value_title}
			})
		}
	}
	PARAM.props = props
	PARAM.values = values
	PARAM.prop_nicks_address_primary = PARAM.extract ? PARAM.extract.map(title => nicked(title)) : []
	PARAM.prop_nicks_dynamic = Object.keys(PARAM.props)
}


class Selector {
	model = null 
	props = {}
	values = {}	//values

	prop_nicks_dynamic = []
	prop_nicks_static = []
	prop_nicks = [] //Все переменные свойства

	prop_nicks_selector_primary = [] //Список и порядок выводимых свойств для фильтрации позиций
	prop_nicks_selector_primary_static = []
	prop_nicks_selector_primary_dynamic = []
	prop_nicks_selector_secondary_dynamic = []
	prop_nicks_selector_secondary_static = [] //должны корректно определяться по base_item. Но при выборе свойства мог измениться и базовый (в selitem)
	

	prop_nicks_address_primary = [] // свойства указываются в адресе
	//prop_nicks_address_primary_static = [] //У адреса не может быть статичных значений, так как динамический Арт у статики не может быть
	//prop_nicks_address_primary_dynamic = [] //У адреса все primary динамические
	prop_nicks_address_secondary = [] // свойства которые надо пересчитать после указания значений из адреса
	prop_nicks_address_secondary_dynamic = [] // свойства которые надо пересчитать после указания значений из адреса и у которых есть определение в PARAM
	prop_nicks_address_secondary_static = [] // свойства которые надо пересчитать после указания значений из адреса и у которых нет определения в PARAM


	
	
	
	constructor (model, props, values) {
		const ps = this
		const name = values[model.recap.parametrizaciya?.[0]]?.value_title
		const PARAM = SELECTORS[name] || {props:{}, values:{}, prop_nicks_address_primary:[], prop_nicks_dynamic:[]}
		
		//model
		ps.model = model

		//props
		ps.props = {...PARAM.props}


		for (const prop_nick in props) {
			ps.props[prop_nick] = Object.assign({}, props[prop_nick], ps.props[prop_nick])
		}
		//ps.props['brendart'].check ??= titem => [`${titem['Бренд']} ${titem['Арт']}`]
		//ps.props['brendmodel'].check ??= titem => [`${titem['Бренд']} ${titem['Модель']}`]
		ps.propsNickByTitle = new Map()
		Object.values(ps.props).forEach(prop => ps.propsNickByTitle.set(prop.prop_title, prop.prop_nick))


		//values
		for (const value_nick in PARAM.values) {
			PARAM.values[value_nick] = Object.assign({}, values[value_nick] || {}, PARAM.values[value_nick])
		}
		ps.values = {...values, ...PARAM.values}
		

		//prop_nicks
		ps.prop_nicks_dynamic = PARAM.prop_nicks_dynamic
		ps.prop_nicks_static = ps.model.iprops.filter(prop_nick => !ps.prop_nicks_dynamic.includes(prop_nick))
		ps.prop_nicks = [...ps.prop_nicks_static, ...ps.prop_nicks_dynamic]
		

		
		//prop_nicks_selector
		ps.prop_nicks_selector_primary_static = ps.prop_nicks_static.filter(prop_nick => {
			const prop = ps.props[prop_nick]
			const nicks = ps.model.recap[prop_nick]
			return Selector.isPropPrimarySelectable(prop, nicks)
		})		
		if (!ps.prop_nicks_selector_primary_static.length && model.items.length > 1) {
			if (ps.model.recap['art']) { //art не считается выбираемым свойством и если выбираемых свойств нет, то остаётся art
				ps.prop_nicks_selector_primary_static = ['art']
			} else {
				ps.prop_nicks_selector_primary_static = ['brendart']
			}
		}
		ps.prop_nicks_selector_primary_dynamic = ps.prop_nicks_dynamic.filter(prop_nick => {
			const prop = ps.props[prop_nick]
			if (prop.nicks) ps.model.recap[prop_nick] = prop.nicks
			//ps.model.iprops.push(prop_nick)
			return Selector.isPropPrimarySelectable(prop, prop.nicks)
		})
		ps.prop_nicks_selector_primary = [...ps.prop_nicks_selector_primary_static, ...ps.prop_nicks_selector_primary_dynamic]
		
		ps.prop_nicks_selector_secondary_dynamic = ps.prop_nicks_dynamic.filter(prop_nick => !ps.prop_nicks_selector_primary_dynamic.includes(prop_nick))
		ps.prop_nicks_selector_secondary_static = ps.prop_nicks_static.filter(prop_nick => !ps.prop_nicks_selector_primary_static.includes(prop_nick))


		//prop_nicks_address
		ps.prop_nicks_address_primary = PARAM.prop_nicks_address_primary
		ps.prop_nicks_address_secondary = ps.prop_nicks.filter(prop_nick => !ps.prop_nicks_address_primary.includes(prop_nick))
		ps.prop_nicks_address_secondary_dynamic = ps.prop_nicks_address_secondary.filter(prop_nick => ps.prop_nicks_dynamic.includes(prop_nick))
		ps.prop_nicks_address_secondary_static = ps.prop_nicks_address_secondary.filter(prop_nick => !ps.prop_nicks_dynamic.includes(prop_nick))
		
		
	}

	
	static explode = (str, sep) => {
		if (!str) return []
		if (!sep) return ["",str]
		const i = str.indexOf(sep)
		if (i !== 0) return false
		return ~i ? [str.slice(0, i), str.slice(i + sep.length)] : false
	}
	buildItem (titem, item, query_nick, withdef) {
		

		const ps = this
		//const r = (query_nick || '').split(Selector.art(item)) 
		if (!withdef && item.art && !query_nick) return false
		const r = Selector.explode(query_nick, Selector.art(item)) //["","-хвост-после-базового-динамическая-часть"]
		if (!withdef && !r) return false
		//console.log(Selector.art(item), query_nick, r)
		
		const q_dyn = (nicked(r[1]) || '').split('-') //["хвост","после","базового","динамическая","часть"]

		/*
			pu устанавливаем
			и в check устанавливаем address_secondary Полиуретан
		*/
		
		for (const i in ps.prop_nicks_address_primary) { //Что именно надо взять из запроса

			const prop_nick = ps.prop_nicks_address_primary[i]
			const nick = q_dyn[i]
			const prop = ps.props[prop_nick]

			//Если есть выбранный базовый, то динамические пытаюсят подставиться ближайшие если в адресе их нет, без фанатизма и перебора - либо подойдут перывй либо нет.
			const def = ps.model.recap[prop_nick]?.[0] || prop.min || 0 //всегда надо что-то назначать в base_item

			if (nick) {
				//const prop = ps.props[prop_nick]
				//const title = prop.type == 'value' ? ps.values[nick] : nick
				
				if (prop.nicks) {

					if (prop.nicks.includes(nick)) {
						if (prop.type == 'value' && !ps.values[nick]) {
							if (!withdef) return false
							item[prop_nick] = [def]
						} else {
							
							item[prop_nick] = [nick]
						}
					} else { //Нет нужного варианта в адресе
						if (!withdef) return false
						item[prop_nick] = [def]
					}

				} else if (prop.step) {
					let broke = false
					if (nick < prop.min) broke = true
					if (nick > prop.max) broke = true
					if ((nick - prop.min) % prop.step) broke = true

					if (broke) {
						if (!withdef) return false
						item[prop_nick] = [def]
					} else {
						item[prop_nick] = [nick]
					}
				} else {
					//Варианты titles - nicks нужны обязательно, для параметров из адреса
					throw `Параметр "${prop.prop_title}" считывается из запроса, но у него не укзаны варианты значений titles для проверки или min, max, step`
				}
			} else {
				if (!withdef) return false
				//if (prop_nick == 'tolshina-mm') console.log(withdef, prop_nick, def)
				item[prop_nick] = [def]
			}
		}
		/*
			Создали, надо определить secondary значения
			ps.prop_nicks_address_secondary_dynamic
			//ps.prop_nicks_address_secondary_static - не нужно так как только что определили base_item с правильнмыи static свойствами
			А потом проверить и первичные (первичные могут что-то устанавливать по secondary но secondary уже будет верный)
			//ps.prop_nicks_address_primary_dynamic
			//ps.prop_nicks_address_primary_static - определили base_item с правильнмыи static свойствами, но проверку то надо сделать
			= ps.prop_nicks_address_primary
		*/
		
		const prop_nicks = [...ps.prop_nicks_address_secondary_dynamic, ...ps.prop_nicks_address_primary] //primary нужно проверить после установки secondary иначе primary сбросятся на основе неправильных secondary
		if (!ps.check(titem, item, prop_nicks, false, false)) {
			if (withdef && query_nick) {
				console.log('Не смогли найти позицию по арту, после установки имеющихся значений и дефолтных неимеющихся', query_nick)
				return ps.buildItem(titem, item, '', true)
			}
			return false
		}
		return {titem, item}
	}
	
	getItemByBaseArt (base_item, art_nick) { //query_nick = art найти надо строгое соответствие по base_item
		const ps = this
		const {titem, item} = ps.createItem(base_item)
		const r = ps.buildItem(titem, item, art_nick)
		if (!r) return r
		return item
	}
	getItemByArt (query_nick, withdef = false) { //query_nick = art найти надо что угодно близко похожее в модели
		//Должно быть точное совпадение, Просто базовый открыть нельзя, потому что у базового некорректный brendart. 
		const ps = this		
		if (!withdef && query_nick && !ps.props.art) return false

		const base_item = Selector.getBaseByQuery(ps.model, query_nick)

		if (!base_item) return false
		const {titem, item} = ps.createItem(base_item)

		

		const r = ps.buildItem(titem, item, query_nick, withdef)

		if (!r) return r


		return {titem, item}
	}
	static getBaseByQuery (model, query_nick) { //находим ближайший base
		const base_items = model.items.filter(item => { //ps-234-white полный артикул, а ps-234 это у базовой позиции и мы найдём по совпадению с начала строки
			if (query_nick.indexOf(Selector.art(item)) == 0) return true
			return false
		}) //Хорошо если одно совпадение, но может быть несоклько совпадений, тогда подходит тот у кого артикул самый длинный, то есть самый точный
		if (base_items.length == 1) return base_items[0]
		if (base_items.length == 0) return model.items[0] // false //Что делать со страницей моделью
		const base_item = base_items.reduce((mitem, citem) => Selector.art(citem).length > Selector.art(mitem).length ? citem : mitem)
		return base_item
	}
	static arraysEqual(a, b) {
		if (a === b) return true;
		if (!a && b) return false
		if (a && !b) return false
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i] != b[i]) return false;
		}
		return true;
	}
	check (titem, item, prop_nicks, isselector = false, installed_prop_nick) {
		const ps = this
		
		for (const prop_nick of prop_nicks) {
			if (prop_nick == installed_prop_nick) continue
			const prop = ps.props[prop_nick]
			if (!prop.check) continue

			
			let value_titles = prop.check(titem, titem[prop.prop_title])
			
			

			if (value_titles === false) {
				if (!isselector) {
					console.log('При заходе на арт проверка свойства вернула false', prop.prop_title, item)
				}
				return false
			}
			if (value_titles === null) continue
			if (value_titles === true) continue
			if (value_titles === undefined) continue
			//if (isNaN(value_titles)) continue
			if (!Array.isArray(value_titles)) value_titles = [value_titles]
			if (prop.type == 'value') {
				item[prop_nick] = value_titles.map(value_title => {
					const value_nick = nicked(value_title)
					ps.values[value_nick] ??= {value_title}
					return value_nick
				})
			} else {
				item[prop_nick] = value_titles
			}
		}
		
		
		
		if (isselector) { //static check
			//Нужно найти base_item, должен существовать по указанным свойствам
			if (!ps.model.items.some(base_item => {
				//Меяющийся свойства без учёта динамики
				for (const base_prop_nick of ps.prop_nicks_selector_primary_static) {
					if (!Selector.arraysEqual(base_item[base_prop_nick], item[base_prop_nick])) return false
				}
				return true
			})) return false
		}
		return true
	}
	createItem (source) {
		const ps = this
		const item = {...source}
		Object.defineProperty(item, 'toString', {
			value: () => item.art ? item.brend[0] + '-' + item.art[0] : item.brendart[0],
			enumerable: false, // ключевое свойство - не перечисляемое
			writable: true,
			configurable: true
		})
		const titem = new Proxy(item, {
			get(item, prop_title) {
				const prop_nick = ps.propsNickByTitle.get(prop_title)
				//const titles = ps.getSomeTitles(item, prop_nick).join(", ")
				const titles = ps.getSomeTitle(item, prop_nick)
				return titles
			}
		})
		const ritm = {item, titem}
		return ritm
	}
	// getNearestItem(selitem, prop_nick, value_nick) {
	// 	const MAX_INTERACTION_LEVEL = 4;
	// 	const ps = this;
		
	// 	const other_prop_nicks = ps.prop_nicks_selector_primary.filter(nick => nick != prop_nick);
	// 	const ritm = ps.createItem(selitem || ps.model.items[0]);
	// 	const {titem, item} = ritm;

	// 	if (selitem[prop_nick]?.[0] == value_nick) return ritm;
		
	// 	item[prop_nick] = [value_nick];
	// 	const prop_nicks = [...ps.prop_nicks_selector_primary_dynamic, ...ps.prop_nicks_selector_secondary_dynamic];
		
	// 	ps.interaction = 1;
	// 	if (ps.check(titem, item, prop_nicks, true, prop_nick)) return ritm;
		
	// 	const search = (extra, props = [], start = 0) => {
	// 		if (props.length === extra) {
	// 			const old = props.map(p => ({p, v: item[p]}));
	// 			props.forEach(p => item[p.p] = [p.v]);
	// 			const ok = ps.check(titem, item, prop_nicks, true, prop_nick);
	// 			old.forEach(o => item[o.p] = o.v);
	// 			if (ok) props.forEach(p => item[p.p] = [p.v]);
	// 			return ok;
	// 		}
	// 		for (let i = start; i < other_prop_nicks.length; i++) {
	// 			const prop = other_prop_nicks[i];
	// 			for (const val of ps.model.recap[prop]) {
	// 				if (item[prop][0] == val) continue;
	// 				if (search(extra, [...props, {p: prop, v: val}], i + 1)) return true;
	// 			}
	// 		}
	// 		return false;
	// 	};
		
	// 	for (let interaction = 2; interaction <= MAX_INTERACTION_LEVEL; interaction++) {
	// 		ps.interaction = interaction;
	// 		if (search(interaction - 1)) return ritm;
	// 	}
		
	// 	return false;
	// }
	getNearestItem (selitem, prop_nick, value_nick) {
		const ps = this
		//Все items подходят с текущим next значением, но выбрано selitem
		//Надо выбрать такой, item, который больше всего похож на selitem но c prop_nick = value_nick
		const other_prop_nicks = ps.prop_nicks_selector_primary.filter(nick => nick != prop_nick) //другие свойства кроме выбранного
		



		//const is_dyn = !!~ps.prop_nicks_selector_primary_dynamic.indexOf(prop_nick) //Это динамически выбираемое свойство
		//const sel_query_nick = Selector.art(selitem)
		//if (selitem[prop_nick]?.[0] == value_nick) return true //Это сейчас выбранное уже значение
		
		const ritm = ps.createItem(selitem || ps.model.items[0])
		const {titem, item} = ritm

		if (selitem[prop_nick]?.[0] == value_nick) return ritm //Это сейчас выбранное уже значение
		
		//item['brendart_base'] = item['brendart']
		item[prop_nick] = [value_nick]
			
			// if (item['cvetokod'][0] == 'black' && prop_nick == 'art') {
			// 	console.log(value_titles)
			// }
		
		
		/*
			Были установлены значения селектора, но возможно они не совместимы и потребуется поиск
			Создали, надо определить secondary значения
			ps.prop_nicks_selector_secondary_dynamic
			ps.prop_nicks_selector_secondary_static //Находимся в ввыбранной позиции и static тоже надо пересчитать
			А потом проверить и первичные (первичные могут что-то устанавливать по secondary но secondary уже будет верный)
			ps.prop_nicks_selector_primary_dynamic
			ps.prop_nicks_selector_primary_static //Статичный выбор тоже надо проверить
		*/
		//art считается вторичным
		const prop_nicks = [...ps.prop_nicks_selector_primary_dynamic, ...ps.prop_nicks_selector_secondary_dynamic]
		
		ps.interaction = 1
		if (ps.check(titem, item, prop_nicks, true, prop_nick)) return ritm
		
		
		
		/*
			Не могу вернуть item он не совместим
			Но свойство изменить обязан при клике, надо найти что-то совместимое, но как?
			- Можно всё сбросить, как?
			- Есть млн комбинаций и только одна может быть совместимой, 
			как найти комбинацию других свойств при которых текущий выбор будет совместим
			= Перебором - все значения есть в model.recap просто ставим нужное свойство
			- Сделать отдельный метод для этих свойств рядом с fromChoice
			
			[1,2,3,4!,5]
			[1,2!,3]
			[1!,2?,3]
			[1,2,4!]
		*/
		
		
		ps.interaction = 2
		for (const other_prop_nick of other_prop_nicks) {
			const prop1 = ps.props[other_prop_nick]
			if (!prop1.nicks) continue
			const old_value_nicks = item[other_prop_nick]
		
			for (const value_nick1 of prop1.nicks) {
			//for (const value_nick1 of ps.model.recap[other_prop_nick]) {
				if (old_value_nicks[0] == value_nick1) continue
				item[other_prop_nick] = [value_nick1]
				if (ps.check(titem, item, prop_nicks, true, prop_nick)) {
					return ritm
				}
			}

			item[other_prop_nick] = old_value_nicks //Протестировали одно свойство занчение не нашли, идём дальше
		}
		


		//1 Поиск с разницей 1. Меняем только ещё одно свойство.
		//Найти все совместимые, а потом выбрать ближайшее? Искать пока не будет найдено с разницей в 1

		//Нужно сбросить 2 выбираемых свойства
		ps.interaction = 3
		for (const other_prop_nick1 of other_prop_nicks) {
			
			const prop1 = ps.props[other_prop_nick1]
			if (!prop1.nicks) continue
			const old_value_nicks1 = item[other_prop_nick1]
			for (const value_nick1 of prop1.nicks) {
			//for (const value_nick1 of ps.model.recap[other_prop_nick1]) {
				if (old_value_nicks1[0] == value_nick1) continue

				for (const other_prop_nick2 of other_prop_nicks) {
					if (other_prop_nick2 == other_prop_nick1) continue

					const prop2 = ps.props[other_prop_nick2]
					if (!prop2.nicks) continue
					const old_value_nicks2 = item[other_prop_nick2]
					for (const value_nick2 of prop2.nicks) {
					//for (const value_nick2 of ps.model.recap[other_prop_nick2]) {
						if (old_value_nicks2[0] == value_nick2) continue
						item[other_prop_nick1] = [value_nick1]
						item[other_prop_nick2] = [value_nick2]
						if (ps.check(titem, item, prop_nicks, true, prop_nick)) {
							return ritm
						}
					}
					item[other_prop_nick2] = old_value_nicks2 //Протестировали одно свойство занчение не нашли, идём дальше
				}
			}
			item[other_prop_nick1] = old_value_nicks1 //Протестировали одно свойство занчение не нашли, идём дальше
		}

		return false //Ближайший не найден с указанным изменением lost
		ps.interaction = 4

		// Перебираем комбинации из 3 изменяемых свойств
		for (const other_prop_nick1 of other_prop_nicks) {
			const prop1 = ps.props[other_prop_nick1]
			if (!prop1.nicks) continue
			const old_value_nicks1 = item[other_prop_nick1]
			for (const value_nick1 of prop1.nicks) {
			//for (const value_nick1 of ps.model.recap[other_prop_nick1]) {
				if (old_value_nicks1[0] == value_nick1) continue

				for (const other_prop_nick2 of other_prop_nicks) {
					if (other_prop_nick2 == other_prop_nick1) continue
					
					const prop2 = ps.props[other_prop_nick2]
					if (!prop2.nicks) continue
					const old_value_nicks2 = item[other_prop_nick2]
					for (const value_nick2 of prop2.nicks) {
					//for (const value_nick2 of ps.model.recap[other_prop_nick2]) {
						if (old_value_nicks2[0] == value_nick2) continue

						for (const other_prop_nick3 of other_prop_nicks) {
							if (other_prop_nick3 == other_prop_nick1 || other_prop_nick3 == other_prop_nick2) continue
							
							
							const prop3 = ps.props[other_prop_nick3]
							if (!prop3.nicks) continue
							const old_value_nicks3 = item[other_prop_nick3]
							for (const value_nick3 of prop3.nicks) {
							//for (const value_nick3 of ps.model.recap[other_prop_nick3]) {
								if (old_value_nicks3[0] == value_nick3) continue
								
								// Применяем все 3 изменения
								item[other_prop_nick1] = [value_nick1]
								item[other_prop_nick2] = [value_nick2]
								item[other_prop_nick3] = [value_nick3]
								
								if (ps.check(titem, item, prop_nicks, true, prop_nick)) {
									return ritm
								}
							}
							item[other_prop_nick3] = old_value_nicks3 // Восстанавливаем третье свойство
						}
					}
					item[other_prop_nick2] = old_value_nicks2 // Восстанавливаем второе свойство
				}
			}
			item[other_prop_nick1] = old_value_nicks1 // Восстанавливаем первое свойство
		}

		return false //Ближайший не найден с указанным изменением lost
	}




	getItemTitle (item) { //getVariant
		const ps = this
		const { model, props } = ps

		if (model.items.length == 1) return '' //variant не будет указан
		let list = ps.getStaticPropNicks()
		list = list.map(prop_nick => {
			const prop = props[prop_nick]
			const titles = ps.getSomeTitles(item, prop_nick)
			if (prop.unit) return titles.map(title => title + ' ' + prop.unit)
			return titles
		})
		//const title = unique(list.flat()).join(', ') //.sort()
		const title = list.flat().join(', ')
		if (!title) return ps.getSomeTitles(item, 'art') || ps.getSomeTitles(item, 'brendart')

		return title
	}
	static isPropPrimarySelectable (prop, values) {
		if (prop?.template) return true
		if (!prop?.type) return false
		if (!values) return false
		if (values.length < 2) return false //В имя не надо вставлять то что нельзя выбрать если значение только одно
		if (prop.type == 'text') return false
		if (prop.known == 'column') return false
		if (prop.known == 'secondary') return false
		if (prop.known == 'system') return false //Старая цена и Цена по купону достаются принудительно
		//if (!item[prop_nick]) return false
		return true
	}
	getSomeTitle (item, prop_nick) {
		const ps = this
		if (!item[prop_nick]) return ''
		const prop = ps.props[prop_nick]		
		const nick = item[prop_nick][0]
		if (prop.type == 'value') {
			return ps.values[nick]?.value_title
		} else if (prop.type == 'date') {
			return ddd.ai(nick)
		} else if (prop.type == 'number') {
			return nick / 10 ** (prop.scale || 0)
		} else { //text
			return nick
		}
	}
	getSomeTitles = (item, prop_nick) => {
		const ps = this
		if (!item[prop_nick]) return []
		const prop = ps.props[prop_nick]

		const titles = item[prop_nick].map(nick => {
			if (prop.type == 'value') {
				return ps.values[nick]?.value_title
			} else if (prop.type == 'date') {
				return nick
			} else if (prop.type == 'number') {
				return nick / 10 ** prop.scale
			} else { //text
				return nick
			}
		})
		if (prop.type == 'value') titles.sort()
		return titles
	}
	static art (item) {
		return item.art?.[0] || ''
		//return item.art ? item.art[0] : item.brendart[0]
	}
}
export default Selector