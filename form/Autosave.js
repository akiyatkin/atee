import { Ses } from './Ses.js'


//Скрипт. Точка это разделитель. Могут проблемы когда имя свойства файл расширением,
//autosavename - путь где сохраняются данные,
//
//Атрибуты 
//autosave="0" не использовать автосохранение для данного слоя
//autosavebreak="1" позволять у поля сбрасывать автососхранение

const pips = new WeakMap()
const inpsready = new WeakSet()
window.addEventListener('beforeunload', () => {
	const inp = document.activeElement
	if (!inpsready.has(inp)) return
	inp.dispatchEvent(new Event("change", {
		bubbles: true,
		cancelable: true
	}))
})
const Autosave = {
	getInps: function (div) {
		const nodelist = div.querySelectorAll('select, .autosaveblock, [type=date], [type=search], [type=number], [type=tel], [type=email], [type=password], [type=text], [type=radio], [type=checkbox], textarea')
		const inps = [...nodelist].filter(inp => {
			if (inp.dataset.autoasave == 'none') return false
			if (inp.closest('.autosavenone')) return false
			if (!inp.name) return false
			return true
		})
		return inps
	},
	/**
	* слой у которого нужно очистить весь autosave, например после отправки формы на сервер, нужно сбросить сохранённые в инпутах данные
	* exc массив свойств которые очищать не нужно и нужно сохранить.. 
	*/
	clear: function (layer) {//Если autosave у двух слоёв одинаковый нельзя нарушать связь
		if (!layer.autosavename) return;
		//layer.autosave={};
		return Ses.clear(layer.autosavename);
	},
	// get: async (autosavename, name, def) => { //blinds
	// 	if (!autosavename) return def;
	// 	if (!name) name = '';
	// 	const val = await Ses.get(autosavename, name, def);
	// 	return val;
	// },
	// logout: () => {//нет возможности востановить значения по умолчанию указанные в слоях.
	// 	Ses.logout();
	// 	location.href = location.href;//Чтобы сбросить autosave в слоях
	// },
	// set: (autosavename, name, val) => {//skoroskidka, rte.layer.js
	// 	return Ses.set(autosavename, name, val);
	// },
	//-----------
	getVal: function (inp) {
		if (inp.type == 'checkbox') {
			return inp.checked
		} else if (inp.type == 'radio') {
			return inp.form.elements[inp.name].value
		} else if (inp.tagName == 'SELECT') {
			let val = [...inp.options].filter(option => option.selected).map(option => option.value)
			if (!inp.multiple) val = val[0]
			return val
		} else if (inp.classList.contains('autosaveblock')) {
			return inp.innerHTML
		} else {
			return inp.value
		}
	},
	setVal: function (inp, valsave) {
		if (inp.type == 'checkbox') {
			inp.checked = valsave
		} else if (inp.type == 'radio') {
			if (inp.value == valsave) inp.checked = true;
		} else if (inp.tagName == 'SELECT') {
			//Для работы нужно явно указывать у option атрибут value
			if (typeof(valsave) != 'object') valsave = [valsave];
			const options = [...inp.options]
			const optionsno = options.filter(option => !~valsave.indexOf(option.value));
			const optionsyes = options.filter(option => ~valsave.indexOf(option.value));
			for (const opt of optionsno) opt.removeAttribute('selected')
			for (const opt of optionsyes) opt.setAttribute('selected','selected')
		} else if (inp.classList.contains('autosaveblock')) {
			inp.innerHTML = valsave;
		} else {
			inp.value = valsave;
		}
	},
	setValChange: function (inp, valsave) {
		Autosave.setVal(inp, valsave)
		const e = new Event("change", {
			bubbles: true,
			cancelable: true
		})
		e.autosave = true
		inp.dispatchEvent(e)
	},
	statusPip: function (inp, is) {
		const pip = pips.get(inp)
		if (!pip) return;
		pip.style.display = is ? 'block' : 'none'
	},
	makePip: (inp, autosavename) => {
		const pip = document.createElement('DIV')
		pip.className = "autosavebreak"
		pip.title = "Отменить изменения"
		inp.before(pip);
		const def = Autosave.getVal(inp);
		pip.addEventListener('click', () => {
			Autosave.setValChange(inp, def);
			Autosave.statusPip(inp, false) //Скрываем пипку сбороса сохранённого
			Ses.del(autosavename, inp.name) //В сессии установится null 	
		})
		return pip
	},
	proc: [],
	init: async (div, autosavename = 'user') => {
		await Promise.all(Autosave.proc)
		const inps = Autosave.getInps(div)
		Autosave.proc = [];
		for (const inp of inps) {
			if (inpsready.has(inp)) continue
			inpsready.add(inp)

			inp.addEventListener('change', e => {
				if (e.autosave) return //мы и инициировали это событие
				const val = Autosave.getVal(inp);				
				Autosave.statusPip(inp, true);
				Ses.set(autosavename, inp.name, val);
			})
			
			if (inp == document.activeElement) continue
			const disabled = inp.disabled
			inp.disabled = true
			Autosave.proc.push(Ses.get(autosavename, inp.name, null).then(valsave => {
				inp.disabled = disabled
				if (valsave == null) return
				Autosave.setValChange(inp, valsave);
				Autosave.statusPip(inp, true);
			}))
			
		}
		for (const inp of inps) {
			if (pips.has(inp)) continue
			if (inp.dataset.break) {
				const pip = Autosave.makePip(inp, autosavename)
				pips.set(inp, pip)
			}
			if (inp.getAttribute('autosavebreak')) {
				const pip = Autosave.makePip(inp, autosavename)
				pips.set(inp, pip)
			}
		}
		return Promise.all(Autosave.proc).then(() => Autosave.proc = [])
	}
}
export default Autosave
export { Autosave }