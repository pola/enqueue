Vue.component('route-queue', {
	data() {
		return {
			queue: null,
			location: null,
			comment: null,
			action: null,
			perform: null,
			disable_location: null,
			selected_students: [],
			prompt_move_student: false,
			notify_active: false,
			broadcast_active: false,
			broadcast_message: null,
			notification_message: null
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

		dequeue(student){
			console.log(student);
			fetch('/api/queues/' + this.queue.name + '/queuing/' + student.profile.id, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 200) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});
		},

		receiving_help(student){

		const profile = this.queue.queuing.find(profile => profile.id === student.id);
		console.log(profile.handlers);
			for (i = 0; i < profile.handlers.length; i ++){
				const handler = profile.handlers[i];
				if (handler.id === this.$root.$data.profile.id){
					fetch('/api/queues/tilpro/queuing/' + student.profile.id, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ is_handling: false }) // använd false för att markera att man inte längre hjälper till
					}).then(res => {
						console.log(res.status);
			
						if (res.status !== 200) {
							res.json().then(j => {
								console.log(j);
							});
						} else {
							console.log("får inte hjälp");
						}
					});
					return;
				}
			}

			fetch('/api/queues/tilpro/queuing/' + student.profile.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_handling: true }) // använd false för att markera att man inte längre hjälper till
			}).then(res => {
				console.log(res.status);
	
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				} else {
					console.log("får hjälp");
				}
			});
			// TODO: blinka i kön
		},

		on_select (item) {
			// håller koll på om en student är klickad på sen inte eller inte, och uppdaterar listan av "klickade" studenter
			
			if (this.student_clicked(item) === true) {
				for (i = 0; i < this.selected_students.length; i++){
					if (item.id === this.selected_students[i].id) {
						this.selected_students.splice(i,1);
					}
				}
			} else {
        		this.selected_students.push(item);
			}
      	},

      	student_clicked(student){
      		if (this.selected_students === []) {
      			return false;
      		} else {
      			for (i = 0; i < this.selected_students.length; i++){
					if (student.id === this.selected_students[i].id) {
						return true;
					}
				}
				return false;
      		}
      	},

      	move_student_first(student) {
      		console.log(student.profile.id);
			fetch('/api/queues/' + this.queue.name + '/queuing/' + student.profile.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ move_after: null })
			}).then(res => {
				console.log(res.status);
				
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
      	},

      	move_student_to_position(student) {

      		var new_position = parseInt(document.getElementById("pos").value);
      		console.log(student);

      		if (new_position > this.queue.queuing.length || new_position < 1 || isNaN(new_position)) {
      			alert("Positionen du valt är inte giltig");
      		} else if (new_position === 1) {
      			this.move_student_first(student);
      		} else {
      		// om man vill ställa sig på position x (1-idicerat) måste vi veta vem som står på positionen innan samt översätta till 0-indicerat
	      		var student_before = this.queue.queuing[new_position-2];

	      		fetch('/api/queues/'+ this.queue.name +'/students/' + student.profile.id, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ move_after: student.student_before.profile.id })
				}).then(res => {
					console.log(res.status);
		
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
			}
      	},

      	notify(student) {
      		console.log("hej student");
      	},

      	bad_location(student) {
      		console.log("dålig plats");
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

		// ändrar data om en kö (inklusive t.ex. queuing-listan)
		this.$root.$data.socket.on('update_queue', data => {
			if (data.queue !== this.queue.id) {
				return;
			}
			
			for (var k of Object.keys(data.changes)) {
   				this.queue[k] = data.changes[k];
			}
		});

		// ändrar data om en specifik köande student inuti queuing-listan
		this.$root.$data.socket.on('update_queue_queuing_student', data => {
			if (data.queue !== this.queue.id) {
				return;
			}
			
			for (const queuing_student of this.queue.queuing) {
				if (queuing_student.profile.id === data.student.profile.id) {
					for (const k of Object.keys(data.student)) {
						queuing_student[k] = data.student[k];
					}
					
   					break;
   				}
			}
		});

		// tar emot ett broadcastmeddelande för en kö
		this.$root.$data.socket.on('broadcast', data => {
			if (data.queue !== this.queue.id) {
				return;
			}
			
			// TODO: använd någon snyggare popup, kanske från Material UI?
			this.broadcast_active = true;
			this.broadcast_message = data.message + '\n\nHälsningar från ' + data.sender.name + ' <' + data.sender.user_name + '@kth.se>';
		});

		// tar emot ett broadcastmeddelande för en kö
		this.$root.$data.socket.on('notify', data => {
			if (data.queue !== this.queue.id) {
				console.log("hejdå");

				return;
			}

			console.log("hej");
			
			this.notify_active = true;
			this.notification_message = data;
			// TODO: använd någon snyggare popup, kanske från Material UI?
			//alert('personligt meddelande:\n' + data.message + '\n\nHälsningar från ' + data.sender.name + ' <' + data.sender.user_name + '@kth.se>');
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

		blocked_by_whitelist() {
			if (this.queue.students.length === 0) {
				return false;
			}

			if (this.is_assistant_in_queue === true) {
				return false;
			}
			
			for (const student of this.queue.students) {
				if (student !== null && student.id === this.$root.$data.profile.id) {
					return false;
				}
			}
			
			return true;
		},

		profile_in_white_list() {
			for (const student of this.queue.students) {
				if (student !== null && this.$root.$data.profile.id === student.id){
					return true;
				}
			}
			
			return false;
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
    			this.$root.$data.socket.emit('notify', {
    				queue: this.queue.id,
    				message: 'meddelande',
    				recipient: "u1os21nb" // TODO: kan detta vara en lista?
    			});
    		}
    		else if (event === "broadcast"){
    			this.$root.$data.socket.emit('broadcast', {
    				queue: this.queue.id,
    				message: 'meddelande'
    			});
    		}
    		else if(event === "purge"){
    			fetch('/api/queues/' + this.queue.id + '/queuing',{
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
	<md-dialog-alert style="white-space: pre-line;"
		:md-active.sync="broadcast_active"
		:md-content="broadcast_message"
		md-confirm-text="OK!"
		@md-closed="broadcast_active = false"/>

	<md-dialog-alert style="white-space: pre-line;"
		:md-active.sync="notify_active"
		:md-content="notification_message"
		md-confirm-text="OK!"
		@md-closed="broadcast_active = false"/>

	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> 

			<md-button v-if="is_assistant_in_queue === true" v-on:click="redirect('edit')" type="submit" class="md-primary"> Redigera kön </md-button>

		</div>
		<p class="col-md-8" style="white-space: pre-line;">{{ queue.description }}</p>
	</div>
	<div class="row">
		<div class="col-md-2">
			<div v-if="! $root.$data.profile">
				<h4> För att kunna ställa dig i kön måste du logga in </h4>
				<form novalidate @submit.prevent="login">
					<md-card-actions>
						<md-button type="submit" class="md-primary">Logga in</md-button>
					</md-card-actions>
				</form>
			</div>
			<div v-else-if="blocked_by_whitelist">
				<h4>Den här kön kan du inte ställa dig i.</h4>
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
						<md-button v-on:click="receiving_help($root.$data
						)" type="submit" class="md-primary">Får hjälp</md-button>
						<md-button v-on:click="dequeue(($root.$data))" type="submit" class="md-primary">Lämna kön</md-button>
					</span>
					<span v-else>
						<md-button v-if="in_queue === false" :disabled="!queue.open" v-on:click="enqueue" type="submit" class="md-primary">Gå med i kön</md-button>
					</span>
				</md-card-actions>

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
		<section  class="col-md-8 col-md-offset-2">
			<md-table md-card @md-selected="on_select">
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

		      	<span v-if="view_entire_queue === true" v-for="(user, index) in queue.queuing" :key="user.profile.id">
					<md-table-row md-selectable="single" v-on:click="on_select(user)" v-bind:style = "[user.handlers.length === 0 ? {backgroundColor: 'white'} : {backgroundColor: 'red'}]" >
						<md-table-cell> {{ index+1 }} </md-table-cell>
						<md-table-cell v-if="user.profile.name !== null"> {{ user.profile.name }}</md-table-cell>
						<md-table-cell> <span v-if="typeof user.location === 'string'"> {{ user.location }} </span> <span v-else> {{ user.location.name }}  </span></md-table-cell>
						<md-table-cell> <span v-if="user.action" style="color: red;" > {{ user.action.name }} </span>  </md-table-cell>
						<md-table-cell> <span v-if="user.comment"> {{ user.comment }} </span> </md-table-cell>
						<md-table-cell>{{ user.entered_at }} </md-table-cell>
					</md-table-row>
					
					<md-table-row v-if="student_clicked(user)">
						<md-table-cell> <md-button class="md-icon-button" v-on:click="dequeue(user)"><i class="material-icons">highlight_off</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="notify(user)"><i class="material-icons">drafts</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="receiving_help(user)"><i class="material-icons">check_circle_outline</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="bad_location(user)"><i class="material-icons">location_off</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="move_student_first(user)"><i class="material-icons">forward</i></md-button> </md-table-cell>
						<md-table-cell> <input type="text" id="pos" name="pos" maxlength="4" size="4"> <md-button class="md-icon-button" v-on:click="move_student_to_position(user)"><i class="material-icons">redo</i></md-button> </md-table-cell>
					</md-table-row>

				</span>

				<span v-else-if="has_white_list_and_profile_in_it === true" v-for="(user, index) in profile_queuing" :key="user.profile.id">
					<md-table-row  md-selectable="single" v-on:click="on_select(user)" v-bind:style = "[user.handlers.length === 0 ? {backgroundColor: 'white'} : {backgroundColor: 'red'}]">
						<md-table-cell> {{ index+1 }} </md-table-cell>
						<md-table-cell v-if="$root.$data.profile"> {{ user.profile.name }}</md-table-cell>
						<md-table-cell> <span v-if="$root.$data.location === null"> {{ user.location }} </span> <span v-else> {{ $root.$data.location.name }}  </span></md-table-cell>
						<md-table-cell> <span v-if="user.action" style="color: red;" > {{ user.action.name }} </span>  </md-table-cell>
						<md-table-cell> <span v-if="user.comment"> {{ user.comment }} </span> </md-table-cell>
						<md-table-cell>{{ user.entered_at }} </md-table-cell>
					</md-table-row>

					<md-table-row v-if="student_clicked(user)">
						<md-table-cell> <md-button class="md-icon-button" v-on:click="dequeue(user)"><i class="material-icons">highlight_off</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="notify(user)"><i class="material-icons">drafts</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="receiving_help(user)"><i class="material-icons">check_circle_outline</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="bad_location(user)"><i class="material-icons">location_off</i></md-button> </md-table-cell>
						<md-table-cell> <md-button class="md-icon-button" v-on:click="move_student_first(user)"><i class="material-icons">forward</i></md-button> </md-table-cell>
						<md-table-cell> <input type="text" id="pos" name="pos" maxlength="4" size="4"> <md-button class="md-icon-button" v-on:click="move_student_to_position(user)"><i class="material-icons">redo</i></md-button> </md-table-cell>
					</md-table-row>
				</span>

				
			</md-table>
		</section>
	</div>
</div>
	`
});
