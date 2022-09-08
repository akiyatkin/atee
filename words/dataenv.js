export default fn => (data, env, g = globalThis) => {
	g.data = data
	g.env = env
	if (data && !data.result) return () => data.msg
	return fn()
}