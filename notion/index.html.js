import { HEAD } from "/-controller/layout.html.js"
export const ROOT = (...args) => `<!DOCTYPE html>
<html>
	<head>
		${HEAD(...args)}
		<link rel="icon" type="/image/svg+xml" href="/images/favicon.svg">
		<link rel="preload" as="style" href="/-modal/style.css" onload="this.onload=null;this.rel='stylesheet'">
		<link rel="preload" as="style" href="/-controller/animate.css" onload="this.onload=null;this.rel='stylesheet'">
		<link rel="stylesheet" href="/-float-label/style.css">
		<link href="/style.css" rel="stylesheet">
	</head>
	<body style="padding:10px; max-width: 1200px">
		<header id="HEADER">${HEADER(...args)}</header>
		<main id="BODY"></main>
		<footer id="FOOTER">

		</footer>
	</body>
</html>
`
export const HEADER = (data, {root, host}) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${root}">NOTION IMPORT</a>
		<a href="/">${host}</a>
	</div>
`