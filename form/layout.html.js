export const UTMS = (utms) => `
	<table style="text-align:left;">
		<thead style="background-color: #eee;">
			<tr><th>Дата</th><th>Откуда</th><th>Куда</th></tr>
		</thead>
		<tbody>
			${utms.map(utm).join('')}
		</tbody>
	</table>
`
const ddmm = new Intl.DateTimeFormat("ru-RU", { dateStyle: 'short', timeStyle: 'short' })
const utm = (utm) => `
	<tr>
		<td style="vertical-align: top"><nobr>${ddmm.format(new Date(utm.time))}</nobr></td>
		<td style="vertical-align: top"><nobr title="${utm.ref.pathname}${utm.ref.search}">${utm.ref.host}</nobr></td>
		<td style="vertical-align: top">${utm.url.pathname}${utm.url.search}</td>
	</tr>
`