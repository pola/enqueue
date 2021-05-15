<template>
  <md-app>
    <md-app-toolbar class="md-primary">
      <md-button to="/queues">
        <md-icon>list</md-icon> Alla köer
      </md-button>

      <md-button
        to="/admin"
        v-if="$store.state.profile !== null && $store.state.profile.teacher"
      >
        <md-icon>build</md-icon> Administration
      </md-button>
      
      <div class="md-toolbar-section-end">
        <md-button
          @click="$root.redirect_login()"
          v-if="$store.state.profile === null"
        >
          <md-icon>face</md-icon> Logga in
        </md-button>

        <md-button
          @click="set_location('/logout')"
          v-if="$store.state.profile !== null"
        >
          <md-icon>exit_to_app</md-icon> Logga ut
        </md-button>
      </div>
    </md-app-toolbar>
    
    <md-app-content>
      <router-view />
    </md-app-content>

    <md-snackbar
      md-position="center"
      :md-active="!$store.state.socket_connected"
      md-persistent
    >
      <span>Enqueue är inte ansluten till nätverket. Försöker återansluta...</span>
    </md-snackbar>
  </md-app>
</template>

<script>
import axios from 'axios'

export default {
  methods: {
    handleSocket() {
      this.$store.state.socket.on('connect', async () => {
        this.$store.commit('setSocketConnected', true)

        const me = (await axios.get('/me')).data

        this.$store.commit('setProfile', me.profile)
        this.$store.commit('setLocation', me.location)
        this.$store.commit('setAssistingIn', me.assisting_in)
        this.$store.commit('isKthlan', me.is_kthlan)
      })

      this.$store.state.socket.on('disconnect', () => {
        this.$store.commit('setSocketConnected', false)
      })

      this.$store.state.socket.on('profile', profile => {
        this.$store.commit('setProfile', profile)
      })

      this.$store.state.socket.connect()
    },
  },

  created() {
    this.handleSocket()
  },
}
</script>