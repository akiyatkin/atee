import controller from "/-controller/layout.html.js"
export const ROOT = (...args) => `<!DOCTYPE html>
<html>
	<head>
		${controller.HEAD(...args)}
		<link rel="icon" type="image/x-icon" href="/favicon.ico">
		<link rel="stylesheet" href="/-notreset/style.css">
		<link rel="stylesheet" href="/style.css">
	</head>
	<body style="margin:0 auto; padding:10px; max-width: 1200px; display: flex; flex-direction: column; min-height: 100vh;">
		<header id="HEADER"></header>
		<main style="flex-grow:1" id="BODY"></main>
		<footer id="FOOTER"></footer>
	</body>
</html>
`
