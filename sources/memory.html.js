import err from "/-controller/err.html.js"
export const ROOT = (data, env) => err(data, env, []) || `
	<h1>Оперативная память</h1>
	<table>
		<tr>
			<td>process.rss</td>
			<td>Всего занято</td>
			<td>${data.process.rss}</td>
			<td>Размер резидентного набора, то есть объём пространства, занятого в основной памяти процессом, включая сегмент кода, кучу и стек. Если значение RSS растёт, есть вероятность утечки памяти.</td>
		</tr>
		<tr>
			<td>process.heapTotal</td>
			<td>Объем кучи всего</td>
			<td>${data.process.heapTotal}</td>
			<td>Общий объём памяти, доступной для объектов JavaScript</td>
		</tr>
		<tr>
			<td>process.heapUsed</td>
			<td>Использовано кучи</td>
			<td>${data.process.heapUsed}</td>
			<td>Общий объём памяти, занятой объектами JavaScript. </td>
		</tr>
		<tr>
			<td>process.external</td>
			<td>Внешняя память</td>
			<td>${data.process.external}</td>
			<td>Объём памяти, потребляемой внекучевыми данными (буферами), которые использует Node. Здесь хранятся объекты, строки и замыкания.</td>
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