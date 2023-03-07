import Rest from '/-rest'
import nicked from '/-nicked'

const rest = new Rest()

rest.addArgument('visitor')
rest.addFunction('string', (view, n) => n != null ? String(n) : '')
rest.addFunction('checkbox', (view, n) => !!n)
rest.addFunction('isset', (view, v) => v !== null)
rest.addFunction('int', (view, n) => Number(n) || 0)
rest.addFunction('array', (view, n) => n ? n.split(',') : [])
rest.addFunction('nicked', (view, v) => nicked(v))
rest.addFunction('escape', (view, text) => text.replace(/[&<>]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
}[tag])))



export default rest