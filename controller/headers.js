import { parse } from './pathparse.js'


export const getPost = (request, limit = 1e7) => {
    if (request.method != 'POST') return
    return new Promise((resolve, reject) => {
        const r = request.headers['content-type'].split(';')
        if (r[0] === 'multipart/form-data') {
            reject('multipart/form-data')
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
                const formData = parse(requestBody,'&');
                resolve(formData)
            });
        } else {
            reject(request.headers['content-type'])
        }
    })
}
