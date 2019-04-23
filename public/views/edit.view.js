Vue.component('route-edit', {
	data() {
		return {
			queue: null,
			
			colors: null,

			user_name_assistant: null,

			user_name_student: null,

			action_name: null,
			action_color: null,

			clicked_rooms: [],
			existing_rooms: null,

			selectedTime: null
		}
	},
	methods: {
		login(){
			window.location = '/login';
			// TODO: skicka tillbaka till kön!
		},

		update_settings() {
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: this.queue.name,
					description: this.queue.description
				})
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						alert(j);
					});
				}
			});
		},

		update_force() {
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					force_action: this.queue.force_action,
					force_comment: this.queue.force_comment
				})
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						alert(j);
					});
				}
			});
		},

		change_room(room_id){
			if (this.queue.rooms.map(r => r.id).includes(room_id)) {
				fetch('/api/queues/'+ this.queue.name +'/rooms/' + room_id, {
					method: 'DELETE'
				}).then(res => {
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
			}

			else {
				fetch('/api/queues/'+ this.queue.name +'/rooms', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ room_id: room_id })
				}).then(res => {
					if (res.status !== 201) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});

			}
		},
		
		update_clicked_rooms() {
			if (this.queue === null || this.existing_rooms === null) {
				return;
			}
			
			const clicked_rooms = this.queue.rooms.map(r => r.id);
			this.clicked_rooms = [];
			
			for (const room of this.existing_rooms) {
				if (clicked_rooms.includes(room.id)) {
					this.clicked_rooms.push(room.id);
				}
			}
		},
		
		update_auto_open() {
			if (this.queue.auto_open === null) {
				this.selectedTime = null;
			} else {
				const dt = new Date(this.queue.auto_open);
				this.selectedTime = dt.getFullYear() + '-' + (dt.getMonth() + 1).toString().padStart(2, '0') + '-' + dt.getDate().toString().padStart(2, '0') + ' ' + dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0');
			}
		},

		change_actions(){

			fetch('/api/queues/'+ this.queue.id + '/actions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: this.action_name, color: this.action_color })
			}).then(res => {
				if (res.status !== 201) {
					res.json().then(j => {
						console.log(j);
					});
				}
				else {
					this.action_name = null;
					this.action_color = null;
				}
			});
		},

		delete_queue(){
			fetch('/api/queues/' + this.queue.id, {
				method: 'DELETE'
			}).then(res => {
				console.log(res.status);
			});
		},

		add_assistant(){
			fetch('/api/queues/'+ this.queue.id +'/assistants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_name: this.user_name_assistant }) // mpola, jark etc.
			}).then(res => {
				if (res.status !== 201) {
					res.json().then(j => {
						console.log(j);
					});
				} else {
					this.user_name_assistant = '';
				}
			});
		},

		remove_assistant (assistant){
			fetch('/api/queues/' + this.queue.id + '/assistants/' + assistant.id, {
				method: 'DELETE'
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		add_student () {
			fetch('/api/queues/'+ this.queue.id +'/students', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_name: this.user_name_student }) // mpola, jark etc.
			}).then(res => {
				if (res.status !== 201) {
					res.json().then(j => {
						console.log(j);
					});
				} else {
					this.user_name_student = '';
				}
			});

		},

		remove_student (student) {
			fetch('/api/queues/' + this.queue.id + '/students/' + student.id, {
				method: 'DELETE'
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		add_action (){
			fetch('/api/queues/'+ this.queue.id +'/actions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: this.action_name,
					color: this.action_color
				})
			}).then(res => {
				this.action_name = null;
				this.action_color = null;
				
				if (res.status !== 201) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		remove_action(action) {
			fetch('/api/queues/'+ this.queue.id +'/actions/' + action.id, {
				method: 'DELETE'
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		set_auto_open(){
			const dt = this.selectedTime.split(/[ \-:]/);
			const ts = new Date(parseInt(dt[0]), parseInt(dt[1]) - 1, parseInt(dt[2]), parseInt(dt[3]), parseInt(dt[4])).getTime();
			
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ auto_open: ts })
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},
		
		fetch_queue() {
			fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
				this.queue = queue;
			
				if (queue.rooms.length > 0){
					this.update_clicked_rooms();
				}
			
				if (queue.auto_open !== null) {
					this.update_auto_open();
				}
			});
		},
		
		socket_handle_update_queue(data) {
			for (var k of Object.keys(data.changes)) {
   				this.queue[k] = data.changes[k];
   				
   				if (k === 'rooms') {
   					this.update_clicked_rooms();
   				} else if (k === 'auto_open') {
					this.update_auto_open();
				}
			}
		}
	},
	
	beforeDestroy() {
		this.$root.$data.socket.removeListener('connect', this.fetch_queue);
		this.$root.$data.socket.removeListener('update_queue', this.socket_handle_update_queue);
	},

	created() {
		this.$root.$data.socket.on('connect', this.fetch_queue);
		this.$root.$data.socket.on('update_queue', this.socket_handle_update_queue);
		
		this.fetch_queue();
		
		fetch('/api/colors').then(res => res.json()).then(colors => {
			this.colors = colors;
		});

		fetch('/api/rooms').then(res => res.json()).then(rooms => {
			this.existing_rooms = rooms;
			this.update_clicked_rooms();
		});
	},

	computed: {
		is_assistant_in_queue(){
			// för att få tillgång till admin måste personen vara  antingen vara en lärare
			if (this.$root.$data.profile === null){
				return false;
			}
			else if (this.$root.$data.profile.teacher === true){
				return true;
			}

			// eller en assistent i den givla kön
			profile_assistant_in = this.$root.$data.assisting_in;

			if (profile_assistant_in != []){
				for (const queue of profile_assistant_in) {
					if (this.queue === queue){
						return true;
					}
				}

			}
			return false;
		}
	},

	template: `
<div class="container" v-if="queue !== null && colors !== null && existing_rooms !== null && is_assistant_in_queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h1><span v-if="!queue.open" class="glyphicon glyphicon-lock"></span> Inställningar för {{ this.queue.name }} </h1> 
		</div>
	</div>

	<md-card>
		<md-card-content>
			<form novalidate @submit.prevent="update_settings">
				<md-field>
					<label>Namn</label>
					<md-input type="text" id="new_name" name="new_name" v-model="queue.name" />
				</md-field>
			
				<md-field>
					<label>Beskrivning</label>
					<md-textarea id="new_description" name="new_description" v-model="queue.description"></md-textarea>
				</md-field>
		
				<md-field>
					<label>Datum och tid för automatisk upplåsning</label>
					<md-input type="datetime-local" v-model="selectedTime" />
				</md-field>
			
				<md-card-actions>
			   		<md-button type="submit" class="md-primary">Spara ändringar</md-button>
			   	</md-card-actions>
			</form>
		</md-card-content>
	</md-card>
	
	<br />
	
	<md-card>
		<md-card-content>
			<md-switch v-model="queue.force_action" @change="update_force();">Kräv action</md-switch>
			<md-switch v-model="queue.force_comment" @change="update_force();">Kräv kommentar</md-switch>
		</md-card-content>
	</md-card>
	
	<br />

	<md-card>
		<md-card-header>
	        <h2 class="md-title">Tillåtna salar</h2>
	    </md-card-header>
	    
	    <md-card-content>
			<p>Om inga anges kan studenterna sitta var som helst.</p>
			
			<form novalidate @submit.prevent="change_rooms">
				<md-checkbox v-for="room in existing_rooms" v-model="clicked_rooms" v-on:change="change_room(room.id)" :key="room.id" :value="room.id">{{room.name}}</md-checkbox>
			</form>
		</md-card-content>
    </md-card>
	
	<br />
	
	<!-- vy endast för lärare - lägg till och ta bort assistenter -->
	<md-card v-if="$root.$data.profile.teacher">
		<md-card-header>
	        <h2 class="md-title">Assistenter</h2>
	    </md-card-header>
		
		<md-card-content>
			<form novalidate @submit.prevent="add_assistant" style="display: inline-flex;">
				<md-field>
					<label for="user_name_assistant">KTH-användarnamn</label>
					<md-input type="text" id="user_name_assistant" v-model="user_name_assistant" />
				</md-field>

				<md-card-actions>
					<md-button type="submit" class="md-primary" :disabled="user_name_assistant === null || user_name_assistant.length === 0">Lägg till assistent</md-button>
				</md-card-actions>
			</form>
		
			<md-table v-if="queue.assistants.length > 0">
				<md-table-row>
					<md-table-head>Användarnamn</md-table-head>
					<md-table-head>Namn</md-table-head>
					<md-table-head>Alternativ</md-table-head>
				</md-table-row>

				<md-table-row v-for="assistant in queue.assistants" :key="assistant.id">
					<md-table-cell>{{ assistant.user_name }}</md-table-cell>
					<md-table-cell>{{ assistant.name }}</md-table-cell>
					<md-table-cell><md-button v-on:click="remove_assistant(assistant)" class="md-accent">Radera</md-button></md-table-cell>
				</md-table-row>
		   	</md-table>
		</md-card-content>
	</md-card>
	
	<br />
	
	<md-card>
		<md-card-header>
		    <h2 class="md-title">Vitlista</h2>
		</md-card-header>
		
		<md-card-content>
			<form novalidate @submit.prevent="add_student" style="display: inline-flex;">
				<md-field>
					<label for="user_name_student">KTH-användarnamn</label>
					<md-input type="text" id="user_name_student" v-model="user_name_student" />
				</md-field>

				<md-card-actions>
					<md-button type="submit" class="md-primary" :disabled="user_name_student === null || user_name_student.length === 0">Lägg till student</md-button>
				</md-card-actions>
			</form>
		
			<md-table v-if="queue.students.length > 0">
				<md-table-row>
					<md-table-head>Användarnamn</md-table-head>
					<md-table-head>Namn</md-table-head>
					<md-table-head>Alternativ</md-table-head>
				</md-table-row>

				<md-table-row v-for="student in queue.students" :key="student.id">
					<md-table-cell>{{ student.user_name }}</md-table-cell>
					<md-table-cell>{{ student.name }}</md-table-cell>
					<md-table-cell><md-button v-on:click="remove_student(student)" class="md-accent">Radera</md-button></md-table-cell>
				</md-table-row>
		   	</md-table>
		   	
		   	<p v-else>
		   		Vitlistan är tom; alla studenter kan ställa sig i kön.
		   	</p>
		</md-card-content>
	</md-card>
    
    <br />

	<md-card>
		<md-card-header>
	        <h2 class="md-title">Actions</h2>
	    </md-card-header>
	    
	    <md-card-content>
			<form novalidate @submit.prevent="add_action" style="display: inline-flex;">
				<md-field>
					<label for="action_name">Namn på action</label>
					<md-input type="text" id="action_name" v-model="action_name" required />
				</md-field>

				<md-field>
					<label for="action_color">Färg på action</label>
					<md-select v-model="action_color" name="Color" id="action_color" required>
		       			<md-option v-for="color in colors" :value="color" :key="color">{{ color }}</md-option>
		       		</md-select>
				</md-field>

				<md-card-actions>
					<md-button type="submit" class="md-primary" :disabled="action_name === null || action_name.length === 0 || action_color === null">Lägg till action</md-button>
				</md-card-actions>
			</form>
			
			<md-table v-if="queue.actions.length > 0">
				<md-table-row>
				    <md-table-head>Action</md-table-head>
				    <md-table-head>Färg</md-table-head>
				    <md-table-head>Alternativ</md-table-head>
				</md-table-row>
				<md-table-row v-for="action in queue.actions" :key="action.id">
				    <md-table-cell>{{ action.name }}</md-table-cell>
				    <md-table-cell>{{ action.color }}</md-table-cell>
				    <md-table-cell><md-button v-on:click="remove_action(action)" class="md-accent">Radera</md-button></md-table-cell>
				</md-table-row>
			</md-table>
		</md-card-content>
	</md-card>
    
    <br />

	<md-card>
		<md-card-header>
	        <h2 class="md-title">Ta bort kön</h2>
	    </md-card-header>
	    
	    <md-card-content>
	    	<p>Om du tar bort kön försvinner den och all associerad statistik permanent.</p>
	    	
	    	<md-button v-on:click="delete_queue()" class="md-raised md-accent">Ta bort kön</md-button>
	    </md-card-content>
	</md-card>
</div>
	`
});
