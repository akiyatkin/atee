const syntaxHighlight = (json = 'undefined') => {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    json = json.replaceAll('"[', '[')
    json = json.replaceAll(']"', ']')

    json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class=\'' + cls + '\'>' + match + '</span>'
    })
    json = json.replaceAll('"', '')
    return json
}
const print = {}

const replacer = (key, value) => {
	if (Array.isArray(value) && !value.some(v => typeof(v) != 'number')) {
		return '[' + value.toString() + ']'
	}
	return value
}

print.json = (obj) => `
	<style>
/*		pre.print-atee {outline: 1px solid #ccc; padding: 5px; margin: 5px; }*/
		pre.print-atee .string { color: green; }
		pre.print-atee .number { color: darkorange; }
		pre.print-atee .boolean { color: blue; }
		pre.print-atee .null { color: magenta; }
		pre.print-atee .key { color: crimson; }
	</style>
	<pre class="print-atee" wrap>${syntaxHighlight(JSON.stringify(obj, replacer, '  '))}</pre>
`
export default print