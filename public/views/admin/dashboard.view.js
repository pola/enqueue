Vue.component('route-admin-dashboard', {
	data() {
		return {
			user_name: null,
			queue_name: null,
			room_name: null,
			teachers: [],
			rooms: []
		}
	},
	methods: {
		add_teacher() {
			fetch('/api/admin/teachers', {
		        method: "POST",
		        headers: { "Content-Type": "application/json" },
		        body: JSON.stringify({ user_name: this.user_name })
    		}).then(res => {
				if (res.status === 400) {
					alert('Ogiltigt KTH-användarnamn.');
				} else if (res.status === 401) {
					alert('Åtkomst nekad.');
				} else if (res.status === 201) {
					this.user_name = '';
				}
			});
		},
		remove_teacher(teacher) {
			fetch('/api/admin/teachers/' + teacher.id, {
       			method: "DELETE"
    		}).then(res => {
				if (res.status === 404) {
					alert('Läraren hittades inte.');
				} else if (res.status === 401) {
					alert('Åtkomst nekad.');
				}
			});
		},
		add_queue() {
			fetch('/api/queues', {
		        method: "POST",
		        headers: { "Content-Type": "application/json" },
		        body: JSON.stringify({ name: this.queue_name })
	    	}).then(res => {
				if (res.status === 400) {
					alert('Namnet är ogiltigt.');
				} else if (res.status === 201) {
					res.json().then(queue => {
						this.$router.push('/queues/' + queue.name);
					});
				}
			});
		},

		add_room() {

		},

		remove_room(room) {

		}
	},
	created() {
		fetch('/api/admin/teachers').then(res => res.json()).then(teachers => {
			this.teachers = teachers;
		});

		fetch('/api/rooms').then(res => res.json()).then(rooms => {
			this.rooms = rooms;
		});

		this.$root.$data.socket.on('teachers', teachers => {
			this.teachers = teachers;
    	});
	},
	template: `
	<div class="text-box col-md-4 col-md-offset-4">
		<md-card>
			<md-card-header>
			    <h2 class="md-title">Lärare</h2>
			</md-card-header>
			
			<md-card-content>
				<form novalidate @submit.prevent="add_teacher" style="display: inline-flex;">
					<md-field>
						<label for="user_name">KTH-användarnamn</label>
						<md-input type="text" id="user_name" v-model="user_name" />
					</md-field>

					<md-card-actions>
						<md-button type="submit" class="md-primary">Lägg till lärare</md-button>
					</md-card-actions>
				</form>
				
				<md-table>
				  <md-table-row>
					<md-table-head>Användarnamn</md-table-head>
					<md-table-head>Namn</md-table-head>
					<md-table-head>Alternativ</md-table-head>
				  </md-table-row>

				  <md-table-row v-for="teacher in teachers" :key="teacher.id">
					<md-table-cell>{{ teacher.user_name }}</md-table-cell>
					<md-table-cell>{{ teacher.name }}</md-table-cell>
					<md-table-cell><md-button v-if="teacher.id !== $root.$data.profile.id" v-on:click="remove_teacher(teacher)" class="md-accent">Radera</md-button></md-table-cell>
				  </md-table-row>
		   		</md-table>
		   	</md-card-content>
		</md-card>
		
		<br />

		<md-card>
			<md-card-header>
				<h2 class="md-title">Skapa ny kö</h2>
			</md-card-header>
			
			<md-card-content>
				<form novalidate @submit.prevent="add_queue" style="display: inline-flex;">
					<md-field>
						<label for="queue_name">Namn</label>
						<md-input type="text" id="queue_name" name="queue_name" v-model="queue_name" />
					</md-field>

					<md-card-actions>
						<md-button type="submit" class="md-primary">Lägg till kö</md-button>
					</md-card-actions>
				</form>
			</md-card-content>
		</md-card>
		
		<br />

		<md-card>
			<md-card-header>
			    <h2 class="md-title">Terminalsalar</h2>
			</md-card-header>
		
			<md-card-content>
				<form novalidate @submit.prevent="add_room" style="display: inline-flex;">
					<md-field>
						<label for="room_name">Namn</label>
						<md-input type="text" id="room_name" v-model="room_name" />
					</md-field>

					<md-card-actions>
						<md-button type="submit" class="md-primary">Lägg till sal</md-button>
					</md-card-actions>
				</form>
				
				<md-table>
				  <md-table-row>
					<md-table-head>Namn</md-table-head>
					<md-table-head>Alternativ</md-table-head>
				  </md-table-row>

				  <md-table-row v-for="room in rooms" :key="room.id">
					<md-table-cell>{{ room.name }}</md-table-cell>
					<md-table-cell><md-button v-on:click="remove_room(room)" class="md-accent">Radera</md-button></md-table-cell>
				  </md-table-row>
		   		</md-table>
		   	</md-card-content>
		</md-card>
	</div>
	`
});
