import Theme from '/-controller/Theme.js'

export const getPost = (request, limit = 1e7) => {
    if (request.method != 'POST') return {}
    return new Promise((resolve, reject) => {
        const r = request.headers['content-type'].split(';')
        if (r[0] === 'multipart/form-data') {
            console.log('getPost ERROR multipart/form-data')
            resolve({})
        } else if (r[0] === 'application/x-www-form-urlencoded') {
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
                const formData = Theme.parse(requestBody,'&')
                resolve(formData)
            });
        } else {
            console.log('getPost ERROR '+request.headers['content-type'])
            resolve({})
        }
    })
}
export default getPost