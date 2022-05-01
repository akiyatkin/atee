
export const parse = (string, sep = '; ') => {
    const cookie = string?.split(sep).reduce((res, item) => {
        if (!item) return res
        const data = item.split('=')
        res[data[0]] = data[1]
        return res
    }, {})
    return cookie || {}
}

export const getPost = (request, limit = 1e7) => {
    if (request.method != 'POST') return
    return new Promise((resolve, reject) => {
        let requestBody = '';
        request.on('data', data => {
            requestBody += data;
            if (requestBody.length > limit) {
                response.writeHead(413, 'Request Entity Too Large');
                response.end();
                reject()
            }
        });
        request.on('end', () => {
            const formData = parse(requestBody);
            resolve(formData)
        });
    })
}
