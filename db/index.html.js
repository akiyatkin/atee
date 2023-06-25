import controller from "/-controller/layout.html.js"
export const ROOT = (...args) => `<!DOCTYPE html>
<html>
	<head>
		${controller.HEAD(...args)}
		<link rel="icon" type="image/x-icon" href="/favicon.ico">
		<link rel="stylesheet" href="/-notreset/style.css">
		<link rel="stylesheet" href="/style.css">
		<link rel="stylesheet" href="/-db/style.css">
	</head>
	<body style="padding:10px; max-width: 1200px">
		<header id="HEADER">${HEADER(...args)}</header>
		<main id="MAIN"></main>
		<footer id="FOOTER"></footer>
	</body>
</html>
`
export const HEADER = (data, {root, host}) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${root}">DB</a>
		<a href="/">${host}</a>
	</div>
`

