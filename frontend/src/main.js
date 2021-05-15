import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'

import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.use(VueMaterial)

Vue.config.productionTip = false

const moment = require('moment')
 
Vue.use(require('vue-moment'), {
  moment,
})

axios.defaults.withCredentials = true
axios.defaults.baseURL = '/api'

const x = async () => {
  new Vue({
    router,
    store,
    methods: {
      redirect_login() {
        document.location = '/login?returnTo=' + encodeURIComponent(window.location.pathname)
      },
    },
    render: h => h(App),
  }).$mount('#app')
}

x()
