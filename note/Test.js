import Move from "/-note/Move.js"
const Test = {
	run: (i = false) => {
		if (i !== false ) {
			return Test.list[i]()
		}
		for (const name in Test.list) {
			const test = Test.list[name]
			const r = test()
			if (!r) console.error('fail', name, test)
			else console.log('ok', name)
		}
	},

	list: {
		"12-3": () => {
			const change = {"start":0,"remove":"","insert":"3"}
			const hangs = [
				{"start":0,"remove":"","insert":"1"},
				{"start":1,"remove":"","insert":"2"}
			]
			Move.changeAfter(change, hangs)			
			return change.start == 2
		},
		"a-b": () => {
			const change = {"start":0,"remove":"","insert":"a"}
			const hangs = [
				{"start":0,"remove":"","insert":"b"}
			]
			Move.changeAfter(change, hangs)			
			return change.start == 1
		},
		"12-34": () => {
			const change = {"start":1,"remove":"","insert":"4"}

			const hangs = [
				{"start":0,"remove":"","insert":"1"},
				{"start":1,"remove":"","insert":"2"}
			]

			Move.changeAfter(change, hangs)			
			return change.start == 3
		},
		"1-23": () => {
			const cursor = {"start":1,"size":0}
			const hangs = [
				{"start":1,"remove":"","insert":"2"},
				{"start":2,"remove":"","insert":"3"}
			]
			Move.cursorAfter(cursor, hangs)			
			return cursor.start == 3
		},
		"123-4": () => {
			const change = {"start":0,"remove":"","insert":"4"}

			const hangs = [
				{"start":0,"remove":"","insert":"1"},
				{"start":1,"remove":"","insert":"2"},
				{"start":2,"remove":"","insert":"3"}
			]

			Move.changeAfter(change, hangs)			
			return change.start == 3
		}
	}
}
export default Test