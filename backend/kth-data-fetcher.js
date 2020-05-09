'use strict'

const fetch = require('node-fetch')

const fetch_user = async url => {
    var result
    
    try {
        result = await fetch(url)
    } catch {
        return null
    }

    if (result.ok) {
        const data = await result.json()

        return {
            'id': data.id,
            'user_name': data.username,
            'name': data.name
        }
    }

    return null
}

module.exports = {
    from_id: id => fetch_user('https://api.kottnet.net/kth/' + id),
    from_user_name: user_name => fetch_user('https://api.kottnet.net/kth/' + user_name),
    assistants_in_course: async course_code => {
        var result
        
        try {
            result = await fetch('https://www.kth.se/social/course/' + course_code.toUpperCase() + '/')
        } catch (e) {
            return null
        }

        if (result.ok) {
            const html = await result.text()

            var m
            const user_names = []
            const reg = /<span itemscope itemtype="http:\/\/schema\.org\/Person"><a href="https:\/\/www\.kth\.se\/profile\/([a-z0-9]+)\/"/g

            do {
                m = reg.exec(html)

                if (m) {
                    user_names.push({ user_name: m[1] })
                }
            } while (m)

            return user_names
        }

        return null
    }
}