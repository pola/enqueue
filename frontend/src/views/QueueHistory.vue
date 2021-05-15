<template>
  <div v-if="queue && $store.state.profile !== null">
    <h1>Historik för {{ queue.name }}</h1>
    <p v-if="is_assistant_in_queue">
      Här kan du se historisk data för köns händelser och studenter.
    </p>
    <p v-else>
      Här kan du se dina historiska besök i kön.
    </p>
		
    <form
      @submit.prevent="fetch_history"
      class="md-layout md-gutter"
    >
      <div class="md-layout-item">
        <md-field>
          <label>Startdatum:</label>
          <md-input
            type="date"
            v-model="date_start"
            required
          />
        </md-field>
      </div>

      <div class="md-layout-item">
        <md-field>
          <label>Slutdatum:</label>
          <md-input
            type="date"
            v-model="date_end"
            required
          />
        </md-field>
      </div>

      <div class="md-layout-item">
        <md-button
          type="submit"
          class="md-primary"
        >
          Hämta historik
        </md-button>
      </div>
    </form>

    <md-card
      v-if="events !== null"
      style="margin-bottom: 50px;"
    >
      <md-card-content>
        <md-card-header>
          <h2 class="md-title">
            Händelser
          </h2>
        </md-card-header>

        <md-table v-if="events.length > 0">
          <md-table-row>
            <md-table-head style="width: 200px;">
              Tidpunkt
            </md-table-head>
            <md-table-head>Händelse</md-table-head>
          </md-table-row>

          <md-table-row
            v-for="event in events"
            :key="event.id"
          >
            <md-table-cell>{{ unix_to_datetime(event.timestamp) }}</md-table-cell>
            <md-table-cell>
              {{ event.nice_description }}
              <div
                v-if="event.type === 'DESCRIPTION' && event.data.old !== null"
                class="history_old"
              >
                {{ event.data.old }}
              </div>
              <div
                v-if="event.type === 'DESCRIPTION' && event.data.new !== null"
                class="history_new"
              >
                {{ event.data.new }}
              </div>
            </md-table-cell>
          </md-table-row>
        </md-table>

        <p v-else>
          Det finns inga händelser att visa för den valda datumperioden.
        </p>
      </md-card-content>
    </md-card>

    <md-card v-if="queuings !== null">
      <md-card-content>
        <md-card-header v-if="is_assistant_in_queue">
          <h2 class="md-title">
            Studenter i kön
          </h2>
        </md-card-header>

        <md-table v-if="queuings.length > 0">
          <md-table-row>
            <md-table-head style="width: 200px;">
              Tidpunkt
            </md-table-head>
            <md-table-head v-if="is_assistant_in_queue">
              Student
            </md-table-head>
            <md-table-head>Plats</md-table-head>
            <md-table-head>Meddelande</md-table-head>
            <md-table-head>Assistent</md-table-head>
          </md-table-row>

          <md-table-row
            v-for="queuing in queuings"
            :key="queuing.id"
          >
            <md-table-cell>
              <span style="white-space: nowrap;">{{ unix_to_datetime(queuing.timestamp_enter) }}</span>
              →
              <span style="white-space: nowrap;">{{ unix_to_datetime(queuing.timestamp_leave) || '...' }}</span>
            </md-table-cell>
            <md-table-cell v-if="is_assistant_in_queue">
              <span
                style="white-space: nowrap;"
                :title="queuing.profile.user_name + '@kth.se'"
              >{{ queuing.profile.name }}</span>
            </md-table-cell>
            <md-table-cell>
              {{ queuing.location }}
            </md-table-cell>
            <md-table-cell>
              <div v-if="queuing.action !== null">
                {{ queuing.action }}
              </div>
              <div v-if="queuing.comment !== null">
                {{ queuing.comment }}
              </div>
            </md-table-cell>
            <md-table-cell>
              <div
                style="white-space: nowrap;"
                :title="handler.user_name + '@kth.se'"
                :key="handler.user_name"
                v-for="handler in queuing.handlers"
              >
                {{ handler.name }}
              </div>
            </md-table-cell>
          </md-table-row>
        </md-table>

        <p v-else>
          Det finns ingen aktivitet i kön att visa för den valda datumperioden.
        </p>
      </md-card-content>
    </md-card>
  </div>
</template>

<script>
import axios from 'axios'

export default {
	name: 'QueueHistory',

	data: () => ({
		queue: null,
		date_start: (d => new Date(d.setDate(d.getDate() - 7)))(new Date).toISOString().slice(0, 10),
		date_end: new Date().toISOString().slice(0, 10),
		events: null,
		queuings: null,
	}),

	methods: {
		unix_to_datetime(unix) {
			if (unix === null) {
				return null
			}

			// TODO: övergå till något bibliotek, till exempel Moment
			const d = new Date(unix)
			const today = new Date()
			
			const hour = '0' + d.getHours()
			const min = '0' + d.getMinutes()
			
			const time = hour.slice(-2) + ':' + min.slice(-2)

			if (today.getDate() === d.getDate() && today.getMonth() === d.getMonth() && today.getFullYear() === d.getFullYear()) {
				return time
			}

			let date = d.getDate() + ' ' + (['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()])

			if (today.getFullYear() !== d.getFullYear()) {
				date += ' ' + d.getFullYear()
			}

			return date + ', ' + time
		},

		date_to_unix(date) {
			return new Date(date).getTime()
		},
		
		async fetch_queue() {
      this.queue = (await axios.get('/queues/' + this.$route.params.name)).data
		},

		async fetch_history() {
			this.events = null
			this.queuings = null

			const timestamp_start = this.date_to_unix(this.date_start)
			const timestamp_end = this.date_to_unix(this.date_end) + 86399000

      try {
        const data = (await axios.get('/queues/' + this.queue.id + '/history?timestamp_start=' + timestamp_start + '&timestamp_end=' + timestamp_end)).data

        if (!data.filtered) {
            this.events = data.events.sort((a, b) => b.timestamp - a.timestamp)

            for (const event of this.events) {
              event.nice_description = this.generate_nice_description(event)
            }
          }

          this.queuings = data.queuings.sort((a, b) => b.timestamp_enter - a.timestamp_enter)

          // samma assistent kan assistera flera gånger (dock förmodligen med olika tidsstämplar), så här plockar vi ut de unika assistenterna
          for (const queuing of this.queuings) {
            const handlers = []

            for (const handler of queuing.handlers) {
              if (handlers.findIndex(x => x.user_id === handler.user_id) === -1) {
                handlers.push({
                  user_id: handler.user_id,
                  name: handler.profile.name,
                  user_name: handler.profile.user_name
                })
              }
            }

            queuing.handlers = handlers
          }
      } catch (error) {
        switch (error.response ? error.response.data : null) {
          case 'INVALID_START_DATE':
            alert('Startdatumet är ogiltigt.')
            break
        
          case 'INVALID_END_DATE':
            alert('Slutdatumet är ogiltigt.')
            break
        
          case 'END_DATE_BEFORE_START_DATE':
            alert('Slutdatumet får inte vara före startdatumet.')
            break
          
          default:
            alert('Ett okänt fel inträffade.')
        }
      }
		},

		generate_nice_description(event) {
			switch (event.type) {
				case 'OPEN':
					if (event.profile === null) {
						return 'Kön öppnades.'
					} else {
						return event.profile.name + ' öppnade kön.'
					}

				case 'CLOSE':
					if (event.profile === null) {
						return 'Kön stängdes.'
					} else {
						return event.profile.name + ' stängde kön.'
					}
				
				case 'DESCRIPTION':
					if (event.data.old === null && event.data.new !== null) {
						return event.profile.name + ' lade till en beskrivning:'
					} else if (event.data.old !== null && event.data.new === null) {
						return event.profile.name + ' tog bort beskrivningen:'
					} else {
						return event.profile.name + ' ändrade beskrivningen:'
					}
				
				default:
					return event.type
			}
		},
		
		// ändrar data om en kö (inklusive t.ex. queuing-listan)
		socket_handle_update_queue(data) {
			if (data.queue !== this.queue.id) {
				return
			}
			
			for (var k of Object.keys(data.changes)) {
				this.queue[k] = data.changes[k]
			}
		}
	},
	
	beforeDestroy() {
		this.$store.state.socket.removeListener('connect', this.fetch_queue)
		this.$store.state.socket.removeListener('update_queue', this.socket_handle_update_queue)
	},
	
	created() {
		this.$store.state.socket.on('connect', this.fetch_queue)
		this.$store.state.socket.on('update_queue', this.socket_handle_update_queue)
		
		this.fetch_queue()
	},
	
	computed: {
		is_assistant_in_queue() {
			// för att få tillgång till admin måste personen vara inloggad
			if (this.$store.state.profile === null) {
				return false
			}
			
			// är man lärare är man alltid assistent
			if (this.$store.state.profile.teacher === true){
				return true
			}

			// man kan annars vara assistent i den aktuella kön
			return this.queue.assistants.findIndex(x => x.id === this.$store.state.profile.id) !== -1
		}
	},
}
</script>