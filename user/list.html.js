export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Список пользователей</h1>
	<table>
	${data.list.map(row).join('')}
	</table>
`

const row = row => `
	<tr>
		<td>${row.user_id}</td>
		<td>${row.phone || ''}</td>
		<td>${row.email || ''}</td>
		<td>${row.password}</td>
	</tr>
`