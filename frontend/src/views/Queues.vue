<template>
  <div>
    <md-card>
      <md-card-header>
        <h2 class="md-title">Alla köer</h2>
      </md-card-header>

      <md-card-content>
        <md-table>
          <md-table-row v-for="queue in queues" :key="queue.id" style="cursor: pointer" @click.native="open_queue(queue)">
            <md-table-cell>
              <md-icon v-if="!queue.open" class="md-accent"> lock </md-icon>
              <md-icon v-else> lock_open </md-icon>
              {{ queue.name }}
            </md-table-cell>
            <md-table-cell class="text-right">
              {{ queue.queuing_count }}
            </md-table-cell>
          </md-table-row>
        </md-table>
      </md-card-content>
    </md-card>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Queues',

  data: () => ({
    queues: [],
  }),

  async created() {
    this.queues = (await axios.get('/queues')).data.sort((x, y) => {
      if (x.open && !y.open) {
        return -1
      } else if (!x.open && y.open) {
        return 1
      } else if (x.name < y.name) {
        return -1
      } else if (x.name > y.name) {
        return 1
      } else {
        return 0
      }
    })
  },

  methods: {
    open_queue(queue) {
      this.$router.push('/queues/' + queue.name)
    },
  },
}
</script>