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
    assistants_in_course: course_code => new Promise((resolve, reject) => {
        fetch('https://www.kth.se/social/course/' + course_code.toUpperCase() + '/').then(res => {
            if (!res.ok) {
                resolve(null);
                return;
            }

            res.text().then(html => {
                var m;
                const user_names = [];
                const reg = /<span itemscope itemtype="http:\/\/schema\.org\/Person"><a href="https:\/\/www\.kth\.se\/profile\/([a-z0-9]+)\/"/g;

                do {
                    m = reg.exec(html);

                    if (m) {
                        user_names.push({ user_name: m[1] });
                    }
                } while (m);

                resolve(user_names);
            });
        }).catch(() => {
            resolve(null);
        });
    })
};