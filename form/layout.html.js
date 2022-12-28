export const UTMS = (utms) => `
	<table style="text-align:left;">
		<thead style="background-color: #eee;">
			<tr><th>Дата</th><th>Откуда</th><th>Куда</th><td>UTM</td></tr>
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
		<td style="vertical-align: top"><a href="${utm.ref.href}" title="${utm.ref.href}">${utm.ref.host}</a></td>
		<td style="vertical-align: top"><a href="http://${utm.url.host}${utm.url.pathname}" title="${utm.url.href}">${utm.url.host}${utm.url.pathname}</a></td>
		<td style="vertical-align: top">
			${[
				utm.url.searchParams.get('utm_source')||'',
				utm.url.searchParams.get('utm_medium')||'',
				utm.url.searchParams.get('utm_campaign')||'',
				utm.url.searchParams.get('utm_term')||'',
				utm.url.searchParams.get('utm_content')||''
			].join(' ')}
		</td>
	</tr>
`


export const UTMSTG = (utms) => `${utms.map(utmtg).join('')}`
const utmtg = (utm) => `${ddmm.format(new Date(utm.time))} ${utm.ref.host} → <a href="https://${utm.url.host}/${utm.url.pathname}">${utm.url.pathname}${utm.url.search}</a>
`