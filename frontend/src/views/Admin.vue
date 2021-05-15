<template>
  <div>
    <h1>Administration</h1>
		
    <md-card>
      <md-card-header>
        <h2 class="md-title">
          Lärare
        </h2>
      </md-card-header>
			
      <md-card-content>
        <form
          novalidate
          @submit.prevent="add_teacher"
          style="display: inline-flex;"
        >
          <md-field>
            <label for="user_name">KTH-användarnamn</label>
            <md-input
              type="text"
              id="user_name"
              v-model="user_name"
            />
          </md-field>

          <md-card-actions>
            <md-button
              type="submit"
              class="md-primary"
            >
              Lägg till lärare
            </md-button>
          </md-card-actions>
        </form>
				
        <md-table>
          <md-table-row>
            <md-table-head>Användarnamn</md-table-head>
            <md-table-head>Namn</md-table-head>
            <md-table-head>Alternativ</md-table-head>
          </md-table-row>

          <md-table-row
            v-for="teacher in teachers"
            :key="teacher.id"
          >
            <md-table-cell>{{ teacher.user_name }}</md-table-cell>
            <md-table-cell>{{ teacher.name }}</md-table-cell>
            <md-table-cell>
              <md-button
                v-if="teacher.id !== $store.state.profile.id"
                @click="remove_teacher(teacher)"
                class="md-accent"
              >
                Radera
              </md-button>
            </md-table-cell>
          </md-table-row>
        </md-table>
      </md-card-content>
    </md-card>
		
    <br />

    <md-card>
      <md-card-header>
        <h2 class="md-title">
          Skapa ny kö
        </h2>
      </md-card-header>
			
      <md-card-content>
        <form
          novalidate
          @submit.prevent="add_queue"
          style="display: inline-flex;"
        >
          <md-field>
            <label for="queue_name">Namn</label>
            <md-input
              type="text"
              id="queue_name"
              name="queue_name"
              v-model="queue_name"
            />
          </md-field>

          <md-card-actions>
            <md-button
              type="submit"
              class="md-primary"
            >
              Lägg till kö
            </md-button>
          </md-card-actions>
        </form>
      </md-card-content>
    </md-card>
		
    <br />

    <md-card>
      <md-card-header>
        <h2 class="md-title">
          Terminalsalar
        </h2>
      </md-card-header>
		
      <md-card-content>
        <form
          novalidate
          @submit.prevent="add_room"
          style="display: inline-flex;"
        >
          <md-field>
            <label for="room_name">Namn</label>
            <md-input
              type="text"
              id="room_name"
              v-model="room_name"
            />
          </md-field>

          <md-card-actions>
            <md-button
              type="submit"
              class="md-primary"
            >
              Lägg till sal
            </md-button>
          </md-card-actions>
        </form>
				
        <md-table>
          <md-table-row>
            <md-table-head>Namn</md-table-head>
            <md-table-head>Alternativ</md-table-head>
          </md-table-row>

          <md-table-row
            v-for="room in rooms"
            :key="room.id"
          >
            <md-table-cell>{{ room.name }}</md-table-cell>
            <md-table-cell>
              <md-button
                @click="remove_room(room)"
                class="md-accent"
              >
                Radera
              </md-button>
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
	name: 'Admin',

	data: () => ({
		user_name: null,
		queue_name: null,
		room_name: null,
		teachers: [],
		rooms: [],
	}),

	methods: {
		async add_teacher() {
      try {
        await axios.post('/teachers', {
          user_name: this.user_name,
        })

        this.user_name = null
      } catch (error) {
        switch (error.response ? error.response.data.error : null) {
          case 'UNKNOWN_USER':
            alert('Användaren hittades inte.')
            break
          
          case 'ALREADY_TEACHER':
            alert('Användaren har redan lärarbehörighet.')
            break
          
          default:
            alert(error || 'Ett okänt fel inträffade.')
        }
      }
		},

		async remove_teacher(teacher) {
      try {
        await axios.delete('/teachers/' + teacher.id)
      } catch (error) {
        if (error.response) {
          if (error.response.status === 404) {
            alert('Läraren hittades inte.')
          } else if (error.response.status === 401) {
            alert('Åtkomst nekad')
          } else {
            alert('Ett okänt fel inträffade.')
          }
        } else {
          alert('Ett okänt fel inträffade.')
        }
      }
		},

		async add_queue() {
      try {
        const new_queue = (await axios.post('/queues', {
          name: this.queue_name,
        })).data

        this.$router.push('/queues/' + new_queue.name)
      } catch (error) {
        if (error.response) {
          if (error.response.status === 400) {
            alert('Namnet är ogiltigt.')
          } else {
            alert('Ett okänt fel inträffade.')
          }
        } else {
          alert('Ett okänt fel inträffade.')
        }
      }
		},

		add_room() {

		},

		remove_room(/* room */) {
			
		},
	},

	async created() {
    this.teachers = (await axios.get('/teachers')).data
    this.rooms = (await axios.get('/rooms')).data

		this.$store.state.socket.on('teachers', teachers => {
			this.teachers = teachers
		})
	},
}
</script>