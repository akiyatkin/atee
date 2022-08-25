import { Meta } from "/-controller/Meta.js"

export const meta = new Meta()
const wait = delay => new Promise(resolve => setTimeout(resolve, delay))
meta.addArgument('hash')
meta.addAction('get-livemodels', async (view) => {
    //await wait(1000)
    view.ans.gcount = Math.round(Math.random()*100)
    view.ans.count = Math.round(Math.random()*1000)
	return view.ret()
})
export const rest = async (...args) => {
    const [query, get, { host, cookie, ip }] = args 
    const ans = await meta.get(query, { ...get, host, ip } )
    return { ans, 
        ext: 'json', 
        status: ans.status ?? 200, 
        nostore: false 
    }
}
