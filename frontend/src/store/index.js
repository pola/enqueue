import Vue from 'vue'
import Vuex from 'vuex'
import io from 'socket.io-client'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    profile: null,
    location: null,
    assisting_in: null,
    is_kthlan: null,
    socket_connected: false,
    socket: io(),
  },

  mutations: {
    setProfile(store, profile) {
      store.profile = profile
    },

    setLocation(store, location) {
      store.location = location
    },

    setAssistingIn(store, assisting_in) {
      store.assisting_in = assisting_in
    },

    isKthlan(store, is_kthlan) {
      store.is_kthlan = is_kthlan
    },

    setSocketConnected(store, socket_connected) {
      store.socket_connected = socket_connected
    },
  },
})
