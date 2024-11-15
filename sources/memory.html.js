export const ROOT = (data, env) => `
	<h1>Оперативная память</h1>
	<table>
		<tr>
			<td>process.rss</td>
			<td>Всего занято</td>
			<td>${data.process.rss}</td>
		</tr>
		<tr>
			<td>process.heapTotal</td>
			<td>Занято переменными</td>
			<td>${data.process.heapTotal}</td>
		</tr>
		<tr>
			<td>process.heapUsed</td>
			<td>Использовано</td>
			<td>${data.process.heapUsed}</td>
		</tr>
		<tr>
			<td>process.external</td>
			<td>Внешняя память</td>
			<td>${data.process.external}</td>
		</tr>
	</table>
	<h2>Операционная система</h2>
	<table>
		<tr>
			<td>os.totalmem</td>
			<td>Всего</td>
			<td>${data.os.totalmem}</td>
		</tr>
		<tr>
			<td>os.freemem</td>
			<td>Свободно</td>
			<td>${data.os.freemem}</td>
		</tr>
	</table>
	<h2>Жёсткий диск</h2>

	<table>
		<tr>
			<td>/data</td>
			<td>Занято</td>
			<td>${data.fs.data}</td>
		</tr>
		<tr>
			<td>/cache</td>
			<td>Занято</td>
			<td>${data.fs.cache}</td>
		</tr>
	</table>
	

`