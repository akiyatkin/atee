import Access from "/-controller/Access.js"
import fs from "fs/promises"
import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import config from "/-config"

class Base {
	static LONG = 31
	get LONG() {
		return Base.LONG
	}
	onicked (title) {
		const { vicache: cache } = this
		return cache.once(title, () => nicked(nicked(title).slice(-Base.LONG)))
	}
	constructor (opt, adminmode) { //{visitor, db}
		opt.base = this
		//Уровень кэша в функция далее выбирается для пользователя, а для админа будет незаметная подмена если нужно
		opt.vicache = opt.visitor.relate(Base)
		opt.dbcache = Access.relate(Base) //Длительный кэш для бд не меняется
		opt.fscache = adminmode ? opt.vicache : opt.dbcache//Длительный кэш по файлам подменяется на кэш визитора если админ
		Object.assign(this, opt)
	}
	
	
	getOptions () {
		const { fscache: cache, base, db } = this
		return cache.once('getOptions', async () => {
			const conf = await config('showcase')
			const options = await JSON.parse(await fs.readFile((conf.options)))

			options.numbers ??= []
			options.texts ??= []
			options.bonds ??= []
			options.values ??= []
			options.files ??= []
			options.justonevalue ??= []
			options.tables ??= {}
			options.prices ??= {}
			options.columns ??= []
			options.systems ??= []
			options.brands ??= {}
			options.groups ??= {}
			options.limit ??= 10
			options.groupids = {}
			options.partners ??= {}
			options.props ??= []
			
			options.root_title ??= 'Каталог'
			options.root_nick = nicked(options.root_title)
			options.actions ??= ['Новинка','Распродажа']
			
			options.number_nicks = options.numbers.map(prop => base.onicked(prop))
			options.text_nicks = options.texts.map(prop => base.onicked(prop))
			options.bond_nicks = options.bonds.map(prop => base.onicked(prop))
			options.value_nicks = options.values.map(prop => base.onicked(prop))
			options.file_nicks = options.files.map(prop => base.onicked(prop))
			options.justonevalue_nicks = options.justonevalue.map(prop => base.onicked(prop))


			

			for (const group_title in options.groups) {
				const ids = await db.colAll('SELECT group_id FROM showcase_groups where group_title = :group_title', { group_title })
				ids.forEach(id => {
					options.groupids[id] = options.groups[group_title]	
				})
			}
			for (const value in options.props) {
				const p = options.props[value]
				if (!p.prop_title) p.prop_title = value //Название свойства на карточке
				if (!p.value_title) p.value_title = value //Значение свойства в данных
				if (!p.value_nick) p.value_nick = value //Ник свойства в данных
				if (!p.prop_nick) p.prop_nick = base.onicked(p.value_nick)  //Ник самого свойства
				if (value == 'Цена' && !p.unit) p.unit = 'руб.'
				const r = value.split(',')
				if (r.length > 1) p.unit = r[1].trim()
				else p.unit = p.unit || ''
			}


			return options
		})
	}

	getPropIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getPropIdByNick(nick)
	}
	getPropIdByNick (prop_nick) {
		const { db, dbcache: cache } = this
		return cache.konce('getPropIdByNick', prop_nick, () => {
			return db.col('SELECT prop_id from showcase_props where prop_nick = :prop_nick', { prop_nick })
		})		
	}
	getValueIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getValueIdByNick(nick)
	}
	getValueIdByNick(value_nick) {
		const { db, dbcache: cache } = this
		return cache.konce('getValueIdByNick', value_nick, () => {
			return db.col('SELECT value_id from showcase_values where value_nick = :value_nick', { value_nick })
		})
	}

	getBondIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getBondIdByNick(nick)
	}
	getBondIdByNick(bond_nick) {
		const { db, base: {vicache: cache} } = this
		return cache.konce('getBondIdByNick', bond_nick, () => {
			return db.col('SELECT bond_id from showcase_bonds where bond_nick = :bond_nick', { bond_nick })
		})
	}

	getGroupIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getGroupIdByNick(nick)
	}
	getGroupIdByNick(group_nick) {
		const { db, dbcache: cache } = this
		return cache.konce('getGroupIdByNick', group_nick, () => {
			return db.col('SELECT group_id from showcase_groups where group_nick = :group_nick', { group_nick })
		})
	}
	getBrandIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getBrandIdByNick(nick)
	}
	getBrandIdByNick(brand_nick) {
		const { db, dbcache: cache } = this
		return cache.konce('getBrandIdByNick', brand_nick, () => {
			return db.col('SELECT brand_id from showcase_brands where brand_nick = :brand_nick', { brand_nick })
		})
	}
	getFileIdByTitle (title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getFileIdByNick(nick)
	}
	getFileIdByNick(src_nick) {
		const { db, vicache: cache } = this
		return cache.konce('getFileIdByNick', src_nick, () => {
			return db.col('SELECT file_id from showcase_files where src_nick = :src_nick', { src_nick })
		})
	}
	getModelIdByTitle (brand_id, title) {
		const { base } = this
		const nick = base.onicked(title)
		return base.getModelIdByNick(brand_id, nick)
	}
	getModelIdByNick(brand_id, model_nick) {
		const { db, vicache: cache } = this
		return cache.konce('getModelIdByNick', brand_id+':'+model_nick, () => {
			return db.col('SELECT model_id from showcase_models where brand_id = :brand_id and model_nick = :model_nick', { brand_id, model_nick })
		})
	}

	toNumber(number) {
		number = parseFloat(number)
		if (isNaN(number)) return false
		const LIM = 8
		const test = Math.floor(number)
		const len = String(test).length
		if (len > LIM) return false
		//if (!number) return false //0 не может быть?
		return number
	}
	isColumn(brand_title, prop_title, options) {
		const { base } = this
		return !~options.systems.indexOf(prop_title) && !~options.columns.indexOf(prop_title)
		&& !~(options.brands?.[brand_title]?.columns || []).indexOf(prop_title)
			
		// return !(!~options.systems.indexOf(prop_title)
		// 	|| !~options.columns.indexOf(prop_title)
		// 	|| !~options.brands?.[brand_title]?.columns?.indexOf(prop_title))
	}
	SYSTEMNICKS = {
		'Модель':'model',
		'Группа':'group',
		'Бренд':'brand'
	}
	getPropNickByTitle (prop_title) {
		const { base } = this
		if (base.SYSTEMNICKS[prop_title]) return base.SYSTEMNICKS[prop_title]
		return base.onicked(prop_title)
	}
	getPropTypeByTitle (prop_title) {
		const { base } = this
		const prop_nick = base.getPropNickByTitle()
		return base.getPropTypeByNick(prop_nick)
	}
	async getPropTypeByNick (prop_nick) {
		const { base } = this
		const options = await base.getOptions()
		if (~options.value_nicks.indexOf(prop_nick)) return 'value'
		if (~options.number_nicks.indexOf(prop_nick)) return 'number'
		if (~options.text_nicks.indexOf(prop_nick)) return 'text'
		if (~options.bond_nicks.indexOf(prop_nick)) return 'bond'
		if (~options.file_nicks.indexOf(prop_nick)) return 'file'
		for (const title in base.SYSTEMNICKS) {
			const nick = base.SYSTEMNICKS[title]
			if (nick == prop_nick) return prop_nick
		}
		return 'text'
	}
	async getPropById (prop_id) {
		const { base, base: { db, dbcache: cache} } = this
		const options = await base.getOptions() //Нельзя включать внутрь, так как тут fscache, а далее dbcache
		return cache.konce('getPropById', prop_id, async () => {
			const prop = await db.fetch('SELECT prop_nick, prop_title, prop_id from showcase_props where prop_id = :prop_id', { prop_id })
			if (!prop) return false
			prop.type = base.getPropTypeByNick(prop.prop_nick)
			prop.opt = options.props[prop.prop_title]
			return prop	
		})
	}
	async getPropByNick(prop_nick) {
		const { base } = this
		const prop_id = await base.getPropIdByNick(prop_nick)
		if (!prop_id) return false
		return base.getPropById(prop_id)
	}
	getPropByTitle(prop_title) {
		const { base } = this
		const prop_nick = base.SYSTEMNICKS[prop_title] || base.onicked(prop_title)

		return base.getPropByNick(prop_nick)
	}
}
export default Base