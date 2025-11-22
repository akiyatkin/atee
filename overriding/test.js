import module from 'node:module';
module.register('./loader.js', import.meta.url);


const test = async (path, params) => {
	//const is = await import(path, params)
	const src = await import.meta.resolve(path)
	console.log(path)
	console.log(src, !!src)
}

await test('./Op.js')
await test('/-overriding/Op.js')
await test('/-layers.json')
await test('/-main.html.js')
await test('/@atee/nicked')
await test('/layers.json')
await test('/file-icon-vectors/package.json')
await test('/@atee/cart/panel.html.js')
//await test('/-dabudi')
