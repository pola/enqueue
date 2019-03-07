Vue.component('route-queue', {
	data() {
		return {
			queue: null,
			students: null,
			location: null,
			comment: null,
			action: null,
			perform: null,
			disable_location: null,
			active: null
		}
	},
	methods: {
		login(){
			window.location = '/login';
			// TODO: skicka tillbaka till kön!
		},
		enqueue(){
				fetch('/api/queues/' + this.queue.name + '/queuing', {
        			method: "POST",
        			headers: { "Content-Type": "application/json" },
        			body: JSON.stringify({ 	
        				"location": this.location,
						"action": this.action,
						"comment": this.comment})})
				.then(res => {
					if (res.status !== 201) {
						res.json().then (data => {
							alert(data.message);
						});
					}
				});
		},

		dequeue(){
			fetch('/api/queues/' + this.queue.name + '/queuing/' + this.$root.$data.profile.id, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 200) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});
		},

		receiving_help(){
			console.log("får hjälp");

			// TODO: fixa allt som ska hända här: blinka i kön
		},

		test (action) {
			return "md-danger";
		},

		redirect (url) {
			if (url === "edit"){
				this.$router.push('/queues/' + this.queue.name + '/edit');
			}
			else if (url === "queues"){
				this.$router.push('/queues/');
			}
			
		}
	},
	created() {
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
			if (this.$root.$data.location !== null){
				this.location = this.$root.$data.location.name;
			}
		});

		fetch('/api/queues/' + this.$route.params.name + '/students').then(res => res.json()).then(students => {
			this.students = students;
		});

		this.$root.$data.socket.on('update_queue', data => {
			for (var k of Object.keys(data.changes)) {
   				this.queue[k] = data.changes[k];
			}
		});

	},

	computed:{
		in_queue() {
			// testar om den inloggade profilen står i kön
			if (this.$root.$data.profile === null) {
				return false;
			}
			
			for (const student of this.queue.queuing) {
				if (this.$root.$data.profile.id === student.profile.id){
					return true;
				}
			}
			return false;
		},

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
		},

		has_white_list() {
			if(this.students === []){
  				return false;
  			}
  			else {
  				return true;
  			}
		},

		profile_in_white_list() {
			console.log(this.students);
			for (student in this.students){
				console.log("profile.id " + this.$root.$data.profile.id);
				console.log("student.id " + student.id); 
				if (this.$root.$data.profile.id === student.id){
					return true;
				}
			}
			return false;
		},

		allowed_in_queue() {
			// om listan av vitlistade studenter är tom får alla tillgång till kön
			console.log("has_white_list = " + this.has_white_list);
  			// assistenter i kön kan alltid se kön
  			console.log("is_assistant_in_queue = " + this.is_assistant_in_queue);
			// om det finns en vitlista och personen finns med i den får den tillgång till kön
			console.log("profile_in_white_list = " + this.profile_in_white_list);

  			allowed = (!this.has_white_list || this.is_assistant_in_queue || this.profile_in_white_list);

  			this.active = !allowed;
  			return allowed;
      	},

      	has_white_list_and_profile_in_it() {
      		return (this.has_white_list && this.profile_in_white_list);
      	},

      	view_entire_queue(){
      		return (!this.has_white_list || this.is_assistant_in_queue);
      	},

      	profile_queuing: function() {
       		return this.queue.queuing.filter(function(u) {
         		return u.id === this.$root.$data.profile.id;
     		})
     	}


	}, 

	watch: {
    	perform: function(event) {
    		if (event === "broadcast_faculty"){
    			console.log("meddelande till anställda");
    		}
    		else if (event === "broadcast"){
    			console.log("meddelande");
    		}
    		else if(event === "purge"){
    			console.log("töm")

    			fetch('/api/queues/' + this.queue.id + '/students',{
    				method: 'DELETE'
    			}).then(res => {
    				if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
    			});
    		}
    		else if(event === "lock"){
    			console.log("lås")

    			fetch('/api/queues/' + this.queue.id, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						open: false,
					})
				}).then(res => {
					console.log(res.status);
	
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
    		}
    		else if(event === "unlock"){
    			console.log("öppna")

    			fetch('/api/queues/' + this.queue.name, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						open: true,
					})
				}).then(res => {
					console.log(res.status);
	
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
    		}
    	}
  	},

	template: `
<div class="container" v-if="queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> 

			<md-button v-if="is_assistant_in_queue === true" v-on:click="redirect('edit')" type="submit" class="md-primary"> Redigera kön </md-button>

		</div>
		<p class="col-md-8"> {{ queue.description }} </p>
	</div>
	<div class="row">
		<div class="col-md-3">
			<div v-if="! $root.$data.profile">
				<h4> För att kunna ställa dig i kön måste du logga in </h4>
				<form novalidate @submit.prevent="login">
					<md-card-actions>
						<md-button type="submit" class="md-primary">Logga in</md-button>
					</md-card-actions>
				</form>
			</div>
			<div v-else-if="allowed_in_queue === false">
				<md-dialog-alert
      				:md-active.sync="active"
      				md-content="Detta är en vitlistad kö som du inte kan gå med i."
      				md-confirm-text="OK!"
      				@md-closed="redirect('queues')"/>
      			<!-- <md-button class="md-accent md-raised" @click="active = false">Alert</md-button> -->
			</div>
			<div v-else>
				<form novalidate >
					<md-field>
						<label for="location">Plats</label>
						<md-input :disabled="$root.$data.location !== null" type="text" id="location" name="location" v-model="location" />
					</md-field>

					<md-field>
						<label for="comment">Kommentar</label>
						<md-input :required="queue.force_comment" type="text" id="comment" name="comment" v-model="comment" />
					</md-field>

					<div v-for="p_action in queue.actions">
					<!--class="md-get-palette-color(green, A200)" -->
						<md-radio v-model="action" :value="p_action.id" :class="'md-' + p_action.color"> {{ p_action.name }} </md-radio>
					</div>
				</form>

				<md-card-actions>
					<span v-if="in_queue === true">
						<md-button v-on:click="receiving_help" type="submit" class="md-primary">Får hjälp</md-button>
						<md-button v-on:click="dequeue" type="submit" class="md-primary">Lämna kön</md-button>
					</span>
					<span v-else>
						<md-button v-if="in_queue === false" :disabled="!queue.open" v-on:click="enqueue" type="submit" class="md-primary">Gå med i kön</md-button>
					</span>
				</md-card-actions>

											<!-- TODO: BLINKAR BARA??-->  
				<md-field>
					<md-select name="dropdown" id="dropdown" v-model="perform" v-if="is_assistant_in_queue === true" placeholder="Alternativ">
						<md-option value="broadcast">Broadcast</md-option>
						<md-option value="broadcast_faculty">Broadcast till anställda</md-option>
						<md-option value="purge">Töm kön</md-option>
						<md-option v-if="queue.open" value="lock">Lås kön</md-option>
						<md-option v-if="!queue.open" value="unlock">Öppna kön</md-option>
					</md-select>
				</md-field>
			</div>
		</div>
											<!-- TODO: assistenter ska kunna ta bort, markera får hjälp, flytta studenter, markera fel plats -->
		<section  class="col-md-7 col-md-offset-2">
			<md-table md-card>
				<md-table-toolbar>
				  	<md-table-row>
					  	<md-table-head>#</md-table-head>
					  	<md-table-head v-if="$root.$data.profile">Användarnamn</md-table-head>
					  	<md-table-head>Plats</md-table-head>
					  	<md-table-head>Action</md-table-head>
					  	<md-table-head>Kommentar</md-table-head>
					  	<md-table-head>Tid</md-table-head>
					</md-table-row>
		      	</md-table-toolbar>

				<md-table-row v-if="view_entire_queue === true" v-for="(user, index) in queue.queuing" :key="user.profile.id"  md-selectable="single">
					<md-table-cell> {{ index+1 }} </md-table-cell>
					<md-table-cell v-if="$root.$data.profile"> {{ user.profile.name }}</md-table-cell>
					<md-table-cell> <span v-if="$root.$data.location === null"> {{ user.location }} </span> <span v-else> {{ $root.$data.location.name }}  </span></md-table-cell>
					<md-table-cell> <span v-if="user.action" style="color: red;" > {{ user.action.name }} </span>  </md-table-cell>
					<md-table-cell> <span v-if="user.comment"> {{ user.comment }} </span> </md-table-cell>
					<md-table-cell>{{ user.entered_at }} </md-table-cell>
				</md-table-row>

											<!-- ej testat! -->
				<md-table-row v-else-if="has_white_list_and_profile_in_it === true" v-for="(user, index) in profile_queuing" :key="user.profile.id"  md-selectable="single">
					<md-table-cell> {{ index+1 }} </md-table-cell>
					<md-table-cell v-if="$root.$data.profile"> {{ user.profile.name }}</md-table-cell>
					<md-table-cell> <span v-if="$root.$data.location === null"> {{ user.location }} </span> <span v-else> {{ $root.$data.location.name }}  </span></md-table-cell>
					<md-table-cell> <span v-if="user.action" style="color: red;" > {{ user.action.name }} </span>  </md-table-cell>
					<md-table-cell> <span v-if="user.comment"> {{ user.comment }} </span> </md-table-cell>
					<md-table-cell>{{ user.entered_at }} </md-table-cell>
				</md-table-row>
			</md-table>
		</section>
	</div>
</div>
	`
});
