import { HEAD } from "/-controller/layout.html.js"
export const ROOT = (data, env) => `<!DOCTYPE html>
<html>
	<head>
		${HEAD(data, env)}
		<base href="/@atee/notion/">
		<link rel="icon" type="/image/svg+xml" href="/images/favicon.svg">
		<link rel="preload" as="style" href="/-modal/style.css" onload="this.onload=null;this.rel='stylesheet'">
		<link rel="stylesheet" href="/-notion/style.css">
		<link rel="stylesheet" href="/style.css">
	</head>
	<body style="padding:10px; max-width: 1200px">
		<header id="HEADER">${HEADER(data, env)}</header>
		<main id="MAIN"></main>
		<footer id="FOOTER"></footer>
	</body>
</html>
`
export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">NOTION IMPORT</a>
		<a href="/">${env.host}</a>
	</div>
`

