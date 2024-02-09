import Db from '@atee/db/Db.js'
import nicked from '@atee/nicked'
import unique from '@atee/nicked/unique.js'
import Move from '@atee/note/Move.js'
const WS = {}

WS.NOTES = {}
WS.start = async () => {
	const db = await new Db().connect()
	if (!db) throw 'Нет соединения с базой данных при первом соединении'
	db.db.release()
	await db.exec(`
		UPDATE note_stats
		SET focus = 0, open = 0
	`)
}
WS.closeState = async (note_id, state) => {
	const user_id = state.user_id
	const note = await WS.getNote(note_id)
	const db = note.db
	db.exec(`
		UPDATE note_stats
		SET date_close = now(), open = 0
		WHERE note_id = :note_id and user_id = :user_id
	`, {user_id, note_id}).then(r => {
		
	})
	note.states.splice(note.states.indexOf(state), 1)
	if (!note.states.length) delete WS.NOTES[note_id]
	return note
}


WS.setSignal = (state, note, signal) => {
	const db = note.db
	const user_id = state.user_id
	const note_id = note.note_id
	if (signal.type == 'focus') {
		Move.cursorAfter(signal.cursor, state.hangchanges)
		db.exec(`
			UPDATE note_stats
			SET date_focus = now(), focus = 1
			WHERE note_id = :note_id and user_id = :user_id
		`, {note_id, user_id})
		signal.cursor.user_id = user_id
		signal.cursor.hue = state.hue

		WS.sendSignal(state.ws, note, 'focus', {user_id, cursor: signal.cursor})
	} else if (signal.type == 'blur') {
		db.exec(`
			UPDATE note_stats
			SET date_blur = now(), focus = 0
			WHERE note_id = :note_id and user_id = :user_id
		`, {note_id, user_id})
		WS.sendSignal(state.ws, note, 'blur', {user_id})
	}
}
WS.setCursor = (state, note, cursor) => {
	const db = note.db
	const user_id = state.user_id
	const note_id = note.note_id
	cursor.user_id = user_id
	cursor.hue = state.hue
	Move.cursorAfter(cursor, state.hangchanges)
	cursor.rev = note.rev
	WS.saveCursor(db, note_id, cursor, true)
	WS.sendToEveryone(state.ws, note, {cursor})
}
WS.saveCursor = (db, note_id, cursor, my, ischange) => {
	const user_id = cursor.user_id
	db.exec(`
		UPDATE note_stats
		SET 
			${ischange ? 'date_change = now(), count_changes = count_changes + 1, ' : ''} 
			date_cursor = now(), 
			cursor_start = :start, 
			cursor_size = :size, 
			cursor_direction = :direction
		WHERE note_id = :note_id and user_id = :user_id
	`, {...cursor, note_id})
	
}
const splice = (text, start, size, chunk) => text.slice(0, start) + chunk + text.slice(start + size)
const clearText = (text) => text.replace(/<(.|\n)*?>/g, '')
WS.saveHistory = (note) => {
	note.db.exec(`
		INSERT INTO note_history (note_id, date_edit, editor_id, text, title, rev, length, search)
		SELECT n.note_id, n.date_edit, n.editor_id, n.text, n.title, n.rev, length, n.search
		FROM note_notes n WHERE note_id = :note_id and date(date_edit) != date(now())
	`, note)
}
WS.setChange = (state, note, change) => {
	Move.changeAfter(change, state.hangchanges)
	
	const db = note.db
	const user_id = state.user_id
	const note_id = note.note_id
	
	note.text = splice(note.text, change.start, change.remove.length, change.insert)
	change.rev = state.rev = ++note.rev

	

	WS.saveHistory(note)
	

	db.exec(`
		UPDATE note_notes
		SET text = :text, length = :length, rev = :rev, date_edit = now(), editor_id = :user_id
		WHERE note_id = :note_id
	`, {
		length: note.text.length,
		text: note.text,
		rev: note.rev,
		note_id, user_id
	})


	


	
	change.cursor.user_id = user_id
	

	Move.cursorAfter(change.cursor, state.hangchanges)
	WS.saveCursor(db, note_id, change.cursor, true, true)
	
	db.all(`SELECT 
			user_id,
			cursor_start as start, 
			cursor_size as size,
			cursor_direction as direction
		FROM note_stats 
		WHERE 
			note_id = :note_id
			and focus = 0
			and user_id != :user_id
	`, {note_id, user_id}).then(others => {
		for (const cursor of others) {
			Move.cursorAfter(cursor, [change])
			WS.saveCursor(db, note_id, cursor)
		}
	})

	change.cursor.hue = state.hue
	WS.sendToEveryone(state.ws, note, {change})
	//console.log('change', change.base, 'rev', change.rev, 'hangchanges', state.hangchanges.length)
	WS.setUpdate(state, note, change)
	
}
WS.setUpdate = (state, note, change) => {
	WS.setSearch(note)
	if (change.start < 255) WS.setTitle(state.ws, note)
}

let search_timer = false
WS.setSearch = (note) => {
	if (search_timer) return
	search_timer = true
	setTimeout(() => {
		search_timer = false
		WS.writeSearch(note)
	}, 10000) //индексируем с задержкой
}
WS.writeSearch = (note) => {
	const db = note.db
	const note_id = note.note_id

	let search = nicked(note.text)
	search = search.split('-')
	search = unique(search).sort().join(' ')
	search = ' ' + search //Поиск выполняется по началу ключа с пробелом '% key%'
	db.exec(`
		UPDATE note_notes
		SET search = :search
		WHERE note_id = :note_id
	`, {note_id, search})
}
WS.setTitle = (ws, note) => {
	const db = note.db
	const note_id = note.note_id
	const title = clearText((note.text.match(/\s*(.*)\n*/)?.[1] || '').slice(0,255).trim())
	if (note.title == title) return
	note.title = title
	const nick = nicked(title).slice(0,255).trim()
	db.exec(`
		UPDATE note_notes
		SET title = :title, nick = :nick
		WHERE note_id = :note_id
	`, {note_id, title, nick}).then(r => {
		WS.sendSignal(ws, note, 'rename', {title, nick})
	})
}
WS.sendSignal = (ws, note, type, signal = {}) => {
	signal.type = type
	WS.sendToEveryone(ws, note, {signal})
}
WS.sendToEveryone = (fromsocket, note, data) => {
	const strdata = JSON.stringify(data)
	for (const {ws, hangchanges} of note.states) {
		const my = ws == fromsocket ? 1 : 0
		if (!my && data.change) hangchanges.push(data.change)
		ws.send('{"payload":' + strdata + ',"my":' + my + '}')
	}
}

WS.connection = (ws, request) => {
	const args = request.args
	const note_id = args.note_id
	const user_id = args.user_id
	const state = {access_check_timer: false, user_id, ws, rev: args.rev, hangchanges: [], hue: args.hue, ismy: args.ismy}
	const note = args.note
	const states = note.states
	state.myindex = states.length
	states.push(state)
	const db = note.db

	ws.on('close', () => {
		//sendSignal(ws, note, 'blur', {user_id})
		WS.closeState(args.note_id, state).then(note => {
			WS.sendSignal(ws, note, 'leave', {user_id})
		})
	})

	ws.on('error', console.error)

	ws.on('message', async data => {


		
		data = JSON.parse(data.toString())
		const {change, cursor, signal} = data
		const base = change?.base || cursor?.base || signal?.base
		state.hangchanges = state.hangchanges.filter(ch => ch.rev > base) //Оставили только изменения, которые были после base
		
		const note = await WS.getNote(args.note_id, user_id)
		
		WS.checkReject(note, state).then(is => {
			if (!is) {
				return WS.sendSignal(ws, note, 'reject', {user_id})
			}
		})
		if (args.ismy == 'view') {
			if (change)	return WS.sendSignal(ws, note, 'onlyview', {user_id})
		}
		
		if (change) WS.setChange(state, note, change)
		if (cursor) WS.setCursor(state, note, cursor)
		if (signal) WS.setSignal(state, note, signal)	
		
	})

	db.exec(`
		UPDATE note_stats
		SET date_load = FROM_UNIXTIME(:date_load), date_open = now(), count_opens = count_opens + 1, open = 1
		WHERE note_id = :note_id and user_id = :user_id
	`, {user_id, note_id, date_load: args.date_load}).then(r => {
		WS.sendSignal(ws, note, 'joined', {user_id, hue: state.hue})
	})
	if (note.rev != state.rev) {
		state.rev = note.rev
		WS.sendSignal(ws, note, 'reset', {text: note.text, rev: note.rev})
	}
}
WS.isAccept = (note, state) => {}
WS.checkReject = async (note, state) => {
	const db = note.db
	if (state.access_check_timer) return true
	state.access_check_timer = true
	setTimeout(() => state.access_check_timer = false, 10000)
	return WS.isAccept(db, note.note_id, state.user_id)
}
WS._getNote = async (note_id) => {
	const db = await new Db().connect()
	if (!db) throw 'Нет соединения с базой данных при первом соединении'
	db.db.release()
	const note = await db.fetch(`SELECT note_id, text, title, rev FROM note_notes WHERE note_id = :note_id`, {note_id})
	note.states = [] //states[state, state]
	note.db = db
	return note
}
WS.getNote = (note_id) => {
	if (!WS.NOTES[note_id]) {
		WS.NOTES[note_id] = WS._getNote(note_id)
	} else {
		WS.NOTES[note_id] = WS.NOTES[note_id].then(note => {
			return note.db.db.ping().then(r => note).catch(async e => {
				console.log('new connection')
				note.db = await new Db().connect()
				if (!note.db) throw 'Нет соединения с базой данных при повторном соединении'
				return note
			})
		})
	}
	return WS.NOTES[note_id]
}
WS.verifyClient = async (info) => {
	const request = info.req
	const params = new URL(request.headers.origin + request.url).searchParams
	const args = {
		params,
		rev: params.get('rev'),
		note_id: params.get('note_id'),
		user_id: params.get('user_id'),
		date_load: params.get('date_load'),
		user_token: params.get('user_token')
	}
	args.ismy = true
	const err = msg => {
		console.log(msg)
		args.ismy = false
		return false
	}

	for (const name in args) if (!args[name]) return err(name + ' required')
	const note = await WS.getNote(args.note_id)
	if (!note?.note_id) return err('note_id')
	args.note = note
	const db = note.db

	const user_token = await db.col('SELECT token FROM user_users WHERE user_id = :user_id', args)
	if (args.user_token != user_token) return err('user_token')

	let hue = await db.col('SELECT hue FROM note_users WHERE user_id = :user_id', args)
	if (hue === null) {
		args.hue = Math.floor(Math.random() * 36) * 10
		db.exec(`
			INSERT INTO note_users (user_id, hue)
			VALUES (:user_id, :hue)
		`, args)
	} else {
		args.hue = hue
	}

	await (async () => {
		const isstat = await db.col(`SELECT note_id FROM note_stats  WHERE note_id = :note_id and user_id = :user_id`, args)
		if (!isstat) {
			db.exec(`
				INSERT INTO note_stats (note_id, user_id)
				VALUES (:note_id, :user_id)
			`, args)
		}
	})()
	request.args = args
	return args
}


export default WS