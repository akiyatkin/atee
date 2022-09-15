const ti = {}
export default ti

ti.fin = (before, after) => before ? before + after : ''
ti.lin = (before, after) => after ? before + after : ''
ti.fi = (is, str) => is ? str : ''
ti.bs = (is) => is ? true : ''
ti.ar = (is) => Array.isArray(is) ? is : []
