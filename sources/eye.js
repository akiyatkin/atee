const eye = {}
eye.calcCls = (main, newvalue, def_value) => {
	return {
		main: `represent-${main}`,
		custom: newvalue == null ? `represent-def-${def_value}` : `represent-custom-${newvalue}`
	}
}

export default eye