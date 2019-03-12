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

		change_description(){
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: this.queue.description
				})
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		change_room(room_id){
			if (this.queue.rooms.map(r => r.id).includes(room_id)) {
				fetch('/api/queues/'+ this.queue.name +'/rooms/' + room_id, {
					method: 'DELETE'
				}).then(res => {
					console.log(res.status);
					
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
					console.log(res.status);
					
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

		change_actions(){

			fetch('/api/queues/'+ this.queue.id + '/actions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: this.action_name, color: this.action_color })
			}).then(res => {
				console.log(res.status);
	
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
			console.log("delete");
			fetch('/api/queues/' + this.queue.id, {
				method: 'DELETE'
			}).then(res => {
				console.log(res.status);
			});
		},

		add_assistant(){
			console.log("add assistant");

			fetch('/api/queues/'+ this.queue.id +'/assistants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_name: this.user_name_assistant }) // mpola, jark etc.
			}).then(res => {
				console.log(res.status);
				
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
				console.log(res.status);
				
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
				console.log(res.status);
				
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
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		add_action (){
			console.log("add action");

			fetch('/api/queues/'+ this.queue.id +'/actions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: this.action_name, color: this.action_color })
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 201) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		remove_action(action){
			console.log("remove action");

			fetch('/api/queues/'+ this.queue.id +'/actions/' + action.id, {
				method: 'DELETE'
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		change_name(){
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: this.queue.name
				})
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				} 
			});
		},

		change_requirements(){
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					force_comment: this.queue.force_comment,
					force_action: this.queue.force_action
				})
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		set_auto_open(){
			console.log(this.selectedTime);
		}	

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

	created() {
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
			
			if (queue.rooms.length > 0){
				this.update_clicked_rooms();
			}
		});

		fetch('/api/colors').then(res => res.json()).then(colors => {
			this.colors = colors;
		});

		fetch('/api/rooms').then(res => res.json()).then(rooms => {
			this.existing_rooms = rooms;
			this.update_clicked_rooms();
		});

		this.$root.$data.socket.on('update_queue', data => {
			for (var k of Object.keys(data.changes)) {
   				this.queue[k] = data.changes[k];
   				
   				if (k === 'rooms') {
   					this.update_clicked_rooms();
   				}
			}
		});
	},

	template: `
<div class="container" v-if="queue !== null && colors !== null && existing_rooms !== null && is_assistant_in_queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ this.queue.name }} </h2> 
		</div>
	</div>

	<form novalidate @submit.prevent="change_name">
		<md-field>
	    	<label>Ändra köns namn</label>
	    	<md-textarea id="new_name" name="new_name" v-model="queue.name"></md-textarea>
	    </md-field>
	    <md-card-actions>
	   		<md-button type="submit" class="md-primary">Genomför ändring</md-button>
	   	</md-card-actions>
	</form>

	<!-- vy endast för lärare - lägg till och ta bort assistenter -->
	<div v-if="$root.$data.profile.teacher === true">
		<md-table md-card>
		    <md-table-toolbar>
		        <h1 class="md-title">Befintliga assistenter</h1>
		    </md-table-toolbar>

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

	   	<br>

	   	<h4>Lägg till en ny assistent</h4>

		<form novalidate @submit.prevent="add_assistant">
			<md-field>
				<label for="user_name_assistant">KTH-användarnamn</label>
				<md-input type="text" id="user_name_assistant" v-model="user_name_assistant" />
			</md-field>

			<md-card-actions>
				<md-button type="submit" class="md-primary">Lägg till assistent</md-button>
			</md-card-actions>
		</form>
	</div>

	<br>

	<md-table md-card>
	    <md-table-toolbar>
	        <h1 class="md-title">Studenter i vitlistan</h1>
	        <h4 class="md-title">Om listan är tom får alla gå med i kön</h4>

	    </md-table-toolbar>

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

   	<br>

   	<h4>Lägg till en ny student i vitlistan</h4>

	<form novalidate @submit.prevent="add_student">
		<md-field>
			<label for="user_name_student">KTH-användarnamn</label>
			<md-input type="text" id="user_name_student" v-model="user_name_student" />
		</md-field>

		<md-card-actions>
			<md-button type="submit" class="md-primary">Lägg till student</md-button>
		</md-card-actions>
	</form>

	<form novalidate @submit.prevent="change_description">
		<md-field>
	    	<label>Ändra beskrivning av kön</label>
	    	<md-textarea id="new_description" name="new_description" v-model="queue.description"></md-textarea>
	    </md-field>
	    <md-card-actions>
	   		<md-button type="submit" class="md-primary">Genomför ändring</md-button>
	   	</md-card-actions>
	</form>

	<form novalidate @submit.prevent="change_rooms">
	    <label>Ändra tillåtna salar (om inga anges kan studenterna sitta var som helst)</label>
	    <br>

	    <md-checkbox v-for="room in existing_rooms" v-model="clicked_rooms" v-on:change="change_room(room.id)" :key="room.id" :value="room.id">{{room.name}}</md-checkbox>

	    <md-card-actions>
	    	<md-button type="submit" class="md-primary">Genomför ändring</md-button>
	    </md-card-actions>
    </form>

    <md-table md-card>
		    <md-table-toolbar>
		        <h1 class="md-title">Möjliga actions</h1>
		    </md-table-toolbar>

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

	   	<br>

	   	<h4>Lägg till en ny action</h4>

		<form novalidate @submit.prevent="add_action">
			<md-field>
				<label for="action_name">Namn på action</label>
				<md-input type="text" id="action_name" v-model="action_name" />
			</md-field>

			<md-field>
				<label for="action_color">Färg på action</label>
			    <md-select v-model="action_color" name="Color" id="action_color">
           			<md-option v-for="color in colors" :value="color" :key="color">{{ color }}</md-option>
           		</md-select>
			</md-field>

			<md-card-actions>
				<md-button type="submit" class="md-primary">Lägg till action</md-button>
			</md-card-actions>
		</form>

    <md-switch v-model="queue.force_action">Kräv action</md-switch>
    <md-switch v-model="queue.force_comment">Kräv kommentar</md-switch>

    <md-card-actions>
		<md-button v-on:click="change_requirements" type="submit" class="md-primary">Genomför ändringar</md-button>
	</md-card-actions>

	<h4>Välj en dag och tid då kön automatiskt ska öppnas</h4>
	<input class="form-control" type="text" v-model="selectedTime" placeholder="YYYY-MM-DD HH:MM" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}" required autofocus>
	<md-button v-on:click="set_auto_open">Välj tid</md-button>


    <md-card-actions>
	    	<md-button v-on:click="delete_queue" type="submit" class="md-danger">Ta bort kön</md-button>
	</md-card-actions>
    
</div>
	`
});
