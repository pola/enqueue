'use strict';

const fetch = require('node-fetch');

const fetch_user = url => new Promise((resolve, reject) => {
    fetch(url).then(result => {
        if (result.status === 200) {
            result.json().then(data => {
                if (data.hasOwnProperty('ugKthid') && data.hasOwnProperty('uid') && data.hasOwnProperty('displayName') && typeof data.ugKthid === 'string' && typeof data.uid === 'string' && typeof data.displayName === 'string') {
                    resolve({
                        'id': data.ugKthid,
                        'user_name': data.uid,
                        'name': data.displayName
                    });
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve(null);
        }
    }).catch(() => {
        resolve(null);
    });
});

module.exports = {
    from_id: id => fetch_user('https://hodis.datasektionen.se/ugkthid/' + id),
    from_user_name: user_name => fetch_user('https://hodis.datasektionen.se/uid/' + user_name),
};