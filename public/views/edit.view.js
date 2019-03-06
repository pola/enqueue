Vue.component('route-edit', {
	data() {
		return {
			queue: null,
			description: null,
			rooms: null,
			actions: null,
			require_comment: null,
			require_action: null,

			user_name: null,
			assistants: [],

			action_name: null,
			action_color: null

		}
	},
	methods: {
		login(){
			window.location = '/login';
			// TODO: skicka tillbaka till kön!
		},

		change_description(){
			console.log(new_description);
		},

		change_rooms(){
			console.log(rooms);
		},

		change_actions(){
			console.log(actions);
		},

		delete_queue(){
			console.log("delete");
			fetch('/api/queues/' + this.queue.name, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 201) {
					res.json().then (data => {
							alert(data.message);
					});
				}
				else {
					this.$router.push('/queues');
				}
			});
		},

		add_assistant(){
			console.log("add assistant");

			/*fetch('/api/queues/' + this.queue.name + '/assistant', {
		        method: "POST",
		        headers: { "Content-Type": "application/json" },
		        body: JSON.stringify({ user_name: this.user_name })
    		}).then(res => {
				if (res.status !== 201) {
					res.json().then (data => {
							alert(data.message);
					});
				} else  {
					this.user_name = '';
				}
			});*/
		},

		remove_assistant(assistant){
			console.log("remove assistant");

			/*fetch('/api/queues/' + this.queue.name + '/assistant/' + assistant.id, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 201) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});*/
		},

		add_action(){
			console.log("add action");
		},

		remove_action(){
			console.log("remove action");
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
    // TODO: lägg till hantering av 404
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
			description = queue.description;
			assistants = [];
			require_comment = true;
			require_action = queue.force_action;
		});

		fetch('/api/rooms').then(res => res.json()).then(rooms => {
			this.rooms = rooms;
		});
	},
	template: `
<div class="container" v-if="queue && is_assistant_in_queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> 
		</div>
	</div>

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

		    <md-table-row v-for="assistant in assistants" :key="assistant.id">
		        <md-table-cell>{{ assistant.user_name }}</md-table-cell>
		        <md-table-cell>{{ assistant.name }}</md-table-cell>
		        <md-table-cell><md-button v-on:click="remove_assistant(assistant)" class="md-accent">Radera</md-button></md-table-cell>
		    </md-table-row>
	   	</md-table>

	   	<br>

	   	<h4>Lägg till en ny assistent</h4>

		<form novalidate @submit.prevent="add_assistant">
			<md-field>
				<label for="user_name">KTH-användarnamn</label>
				<md-input type="text" id="user_name" v-model="user_name" />
			</md-field>

			<md-card-actions>
				<md-button type="submit" class="md-primary">Lägg till assistent</md-button>
			</md-card-actions>
		</form>
	</div>

	<br>

	<!-- TODO: sätt tid för att tömma kön automatiskt -->
		<!-- https://puranjayjain.github.io/md-date-time-picker/ -->
	
	<!-- TODO: sätt tid för att öppna kön automatiskt -->
		<!-- https://www.npmjs.com/package/vue-datetime - även upprepning, ska man bara välja veckodagar + tid och låta det hända varje vecka??-->
	
	<!-- TODO: ange vitlista -->


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
	    <md-checkbox v-for="room in rooms" :key="room.id" v-model="rooms" :value="room.id">{{room.name}}</md-checkbox>

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

		    <md-table-row v-for="action in actions" :key="action.id">
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

								<!-- TODO: dropdown med möjliga färger istället? -->
			<md-field>
				<label for="action_color">Färg på action</label>
				<md-input type="text" id="action_color" v-model="action_color" />
			</md-field>

			<md-card-actions>
				<md-button type="submit" class="md-primary">Lägg till action</md-button>
			</md-card-actions>
		</form>

    					<!-- TODO: kan de visa hur det är just nu? -->

    <md-switch value="require_action" v-model="require_action">Kräv kommentar</md-switch>
    <md-switch value="require_comment" v-model="require_comment">Kräv action</md-switch>



    <md-card-actions>
	    	<md-button v-on:click="delete_queue" type="submit" class="md-danger">Ta bort kön</md-button>
	</md-card-actions>
    
</div>
	`
});
