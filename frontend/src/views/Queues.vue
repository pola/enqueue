<template>
  <div>
    <md-card>
      <md-card-header>
        <h2 class="md-title">
          Alla köer
        </h2>
      </md-card-header>
			
      <md-card-content>
        <md-table>
          <md-table-row
            style="cursor: pointer;"
            @click.native="open_queue(queue)"
            v-for="queue in queues"
            :key="queue.id"
          >
            <md-table-cell>
              <md-icon
                v-if="!queue.open"
                class="md-accent"
              >
                lock
              </md-icon>
              <md-icon v-else>
                lock_open
              </md-icon>
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

	methods: {
		open_queue(queue) {
			this.$router.push('/queues/' + queue.name)
		}
	},

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
}
</script>