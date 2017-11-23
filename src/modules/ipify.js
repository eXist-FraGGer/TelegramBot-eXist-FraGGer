import request from 'request';

class IPiFy {
    getIp() {
        return new Promise((resolve, reject) => {
            request('https://api.ipify.org', (err, response, body) => {
                if (err) {
                    return reject(err);
                }
                resolve(body);
            });
        });
    }
}

export default new IPiFy();