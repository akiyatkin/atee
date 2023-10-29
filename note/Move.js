const Move = {
	debug: false,
	changeAfter: (change, list, wait = false) => {
		/*
			change
			a[o|n]b
			
			hang
			z(y|x)v
		*/
		
		
		//const rechanges = changes//.toReversed()
		//list.reverse()
		//for (let i = list.length - 1; i >= 0; i--) {
		for (let i = 0, l = list.length; i < l; i++) {

			const a = change.start
			const n = change.insert.length
			const o = change.remove.length
			const an = a + n
			const ao = a + o


			const hang = list[i]
		//for (const hang of list) {
			const z = hang.start
			const x = hang.insert.length
			const y = hang.remove.length
			const zx = z + x
			const zy = z + y

			if (false) {

			
			} else if (z <= a && ao < zx) { 
				//console.log('([])','hang вокруг', hang, {...change})
				// asd234sdf
				
				/*
					change []
						remove a[o]b до hang сделать после hang
						insert a[n]b

					hang () - уже в тексте по вот этим кординатам - нужно удалить-вставить в change.remove
						remove z(y)v
						insert z(x)v
				*/
				if (wait) {
					/*
					 На сервере в конец добавляется 12
					 А клиент который напечатал 2 должен полученное следующее, 
					 но с точки зрения сервера предыдущее значение поставить до своего
					*/
					change.start = z
				} else {
					change.start = z + x - y
				}
				
				change.remove = ''

				// if (hang.insert == change.insert) {
				// 	//change.cursor.start += hang.insert.length
				// 	change.insert = ''
				// }
				
				
			} else if (ao <= z) {
				//console.log('[]()', 'hang справа', hang, {...change})
				
			} else if (zy <= a) { 
				//console.log('()[]','hang слева', hang)
				change.start += x - y
			} else if (a <= z && zy <= ao) {
				//console.log('[()]')

				// a[q(x)e)d]
				/*
					change [] - нужно вставить в hang
						remove a[o]b до hang сделать после hang
						insert a[n]b

					hang () - уже в тексте по вот этим кординатам
						remove z(y)v
						insert z(x)v
				*/
				//change.size += x - y


				// z(y-x)v - hang after
				// a[o-n]b - change before
				// [-(-)-] a[j(y-x)f]
				const aj = z
				const j = aj - a
				const jyf = o
				const jxf = n
				const f = jyf - j - y
				const jy = j + y
				


				change.remove = change.remove.substr(0, j) + hang.insert + change.remove.substr(jy, f)

				
			} else if (a <= z && ao <= zy && ao <= zy) {
				//console.log('[(])')
				/*


					change [] - нужно вставить в hang
						remove a[o]b до hang сделать после hang
						insert a[n]b

					hang () - уже в тексте по вот этим кординатам
						remove z(y)v
						insert z(x)v
					
				*/
				//Расчёт change.remove
				// a[q(r]e)v - новая формула change
				const aq = z
				const q = aq - a
				change.remove = change.remove.substr(0, q)

			} else if (z <= a && zy <= ao && zy <= ao) {
				//console.log('([)]')
				// z(q[w)]
				const zq = a
				const q = zq - z
				const qw = x
				const w = qw - q
				change.start = a + w
				change.remove = change.remove.substr(0, n - w + x - y)
			}
		}
		//list.reverse()
	},
	cursorAfter: (cursor, list) => {
		/*
			cursor
			a[n]b
			
			rewind
			z(y)v
			z(x)v
		*/
		
		
		//list.reverse()
		//for (let i = list.length - 1; i >= 0; i--) {
		for (let i = 0, l = list.length; i < l; i++) {

			const a = cursor.start
			const n = cursor.size
			const o = n
			const an = a + n
			const ao = a + o


			const hang = list[i]
		//for (const hang of list) {
			const z = hang.start
			const x = hang.insert.length
			const y = hang.remove.length
			const zx = z + x
			const zy = z + y

			if (false) {

			
			} else if (z <= a && ao < zx) { 
				//console.log('([])', 'hang вокруг', hang, cursor)
				cursor.start = z + x// - y
				cursor.size = 0
			} else if (ao <= z) {
				//console.log('[]()', 'hang справа')
				continue
			} else if (zy <= a) { 
				//console.log('()[]', 'hang слева', hang, cursor)
				cursor.start += x - y
			} else if (a <= z && zy <= ao) {
				//console.log('[()]') // hang внутри
				cursor.size += x - y
				if (cursor.size < 0) cursor.size = 0
			} else if (a <= z && ao <= zy && ao <= zy) {
				//console.log('[(])') // hang захватывает справа
				// a[q(w]e)
				const aq = z
				const q = aq - a
				const qw = n
				const w = qw - q
				const we = x
				const e = we - w
				const qwe = q + we
				cursor.size = q
				if (cursor.size < 0) cursor.size = 0
			} else if (z <= a && zy <= ao && zy <= ao) {
				//console.log('([)]') //hang захватывает слева
				// z(q[w)]
				const zq = a
				const q = zq - z
				const qw = x
				const w = qw - q
				cursor.start = a + w
				cursor.size = n - w + x - y
				if (cursor.size < 0) cursor.size = 0
			}
		}
		//list.reverse()
	}
}
export default Move