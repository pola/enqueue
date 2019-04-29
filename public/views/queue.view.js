


Vue.component('route-queue', {

	//import modal from './components/modal.vue';

	/*components: {
		modal,
	},*/

	data() {
		return {
			queue: null,
			location: null,
			comment: null,
			action: null,
			perform: null,
			disable_location: null,
			selected_students: [],
			notify_active: false,
			broadcast_active: false,
			broadcast_message: null,
			notification_message: null,
			active_broadcast: false,
			prompt_broadcast: false,
			prompt_notify: false,
			promt_notify_faculty: false,
			promt_clear_queue: false,
			message: null,
			open_menu: null
		}
	},
	methods: {
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
		
			for (i = 0; i < profile.handlers.length; i ++){
				const handler = profile.handlers[i];
				if (handler.id === this.$root.$data.profile.id){
					fetch('/api/queues/tilpro/queuing/' + student.profile.id, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ is_handling: false }) // använd false för att markera att man inte längre hjälper till
					}).then(res => {
						if (res.status !== 200) {
							res.json().then(j => {
								console.log(j);
							});
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
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
		},

		toggle_menu(item) {
			// håller koll på om en student är klickad på sen inte eller inte, och uppdaterar listan av "klickade" studenter
		
			if (!this.is_assistant_in_queue){
				return;
			}
			
			setTimeout(() => {
				this.open_menu = item.profile.id === this.open_menu ? null : item.profile.id;
			}, 50);
			
			//this.open_menu = item.profile.id === this.open_menu ? null : item.profile.id;
		},

      	move_student_first(student) {
			fetch('/api/queues/' + this.queue.name + '/queuing/' + student.profile.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ move_after: null })
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
      	},

      	move_student_to_position(student) {

      		var new_position = parseInt(document.getElementById("pos").value);

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
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
			}
      	},

      	notify(student) {
      		this.$root.$data.socket.emit('notify', {
    			queue: this.queue.id,
    			message: this.message,
    			recipient: student.profile.id
    		});

    		this.message = null;
      	},

      	broadcast() {
      		this.$root.$data.socket.emit('broadcast', {
    			queue: this.queue.id,
    			message: this.message
    		});

    		this.message = null;
      	},

      	broadcast_faculty() {
      		this.$root.$data.socket.emit('notify_faculty', {
    			queue: this.queue.id,
    			message: this.message
    		});

    		this.message = null;
      	},

      	/*closeModal(){
      		this.modal_active = false;
      	}*/

      	bad_location(student) {
      		if (student.bad_location === true){
      			fetch('/api/queues/'+ this.queue.name +'/queuing/' + student.profile.id, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ bad_location: false }) 
				}).then(res => {
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
      		} else {
      			fetch('/api/queues/'+ this.queue.name +'/queuing/' + student.profile.id, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ bad_location: true }) 
				}).then(res => {
					if (res.status !== 200) {
						res.json().then(j => {
							console.log(j);
						});
					}
				});
      		}

      		
      	},

      	unix_to_time_ago(unix){

			// 	var moment = require('moment'); - detta ska stå någonstans för att det ska funka - var?
      		
      		//var a = new Date(unix * 1000).toLocaleString();
      		d = new Date(unix);

      		day = d.getDate();
      		month = d.getMonth() + 1; // kanske borde vara 03
      		year = d.getFullYear();

      		hour = d.getHours();
      		min = d.getMinutes();
      		sec = d.getSeconds();

  			time = year + month + day + ' ' + hour + min + sec;

  			//moment(time, "YYYYMMDD HHMMSS").fromNow();
			
			return hour + ':' + min;
  			//return d.toLocaleString();
      	},

		redirect (url) {
			if (url === "edit"){
				this.$router.push('/queues/' + this.queue.name + '/edit');
			}
			else if (url === "queues"){
				this.$router.push('/queues/');
			}
			
		},
		
		purge() {
			fetch('/api/queues/' + this.queue.id + '/queuing', {
				method: 'DELETE'
			});
		},
		
		toggle_open() {
			fetch('/api/queues/' + this.queue.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ open: !this.queue.open })
			});
		},
		
		fetch_queue() {
			fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
				this.queue = queue;
				if (this.$root.$data.location !== null){
					this.location = this.$root.$data.location.name;
				}
			});
		},
		
		// ändrar data om en kö (inklusive t.ex. queuing-listan)
		socket_handle_update_queue(data) {
			if (data.queue !== this.queue.id) {
				return;
			}
			
			for (var k of Object.keys(data.changes)) {
   				this.queue[k] = data.changes[k];
			}
		},
		
		// ändrar data om en specifik köande student inuti queuing-listan
		socket_handle_update_queue_queuing_student(data) {
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
		},
		
		// tar emot ett broadcastmeddelande för en kö
		socket_handle_broadcast(data) {
			if (data.queue !== this.queue.id) {
				return;
			}
			this.broadcast_active = true;
			this.broadcast_message = data.message + '\n\nHälsningar från ' + data.sender.name + ' <' + data.sender.user_name + '@kth.se>';
		},
		
		// tar emot ett broadcastmeddelande för en kö
		socket_handle_notify(data) {
			if (data.queue !== this.queue.id) {
				return;
			}			
			this.notify_active = true;
			this.notification_message = 'Personligt meddelande:\n' + data.message + '\n\nHälsningar från ' + data.sender.name + ' <' + data.sender.user_name + '@kth.se>';
		}
	},
	
	beforeDestroy() {
		this.$root.$data.socket.removeListener('connect', this.fetch_queue);
		this.$root.$data.socket.removeListener('update_queue', this.socket_handle_update_queue);
		this.$root.$data.socket.removeListener('update_queue_queuing_student', this.socket_handle_update_queue_queuing_student);
		this.$root.$data.socket.removeListener('broadcast', this.socket_handle_broadcast);
		this.$root.$data.socket.removeListener('notify', this.socket_handle_notify);
	},
	
	created() {
		this.$root.$data.socket.on('connect', this.fetch_queue);
		this.$root.$data.socket.on('update_queue', this.socket_handle_update_queue);
		this.$root.$data.socket.on('update_queue_queuing_student', this.socket_handle_update_queue_queuing_student);
		this.$root.$data.socket.on('broadcast', this.socket_handle_broadcast);		
		this.$root.$data.socket.on('notify', this.socket_handle_notify);
		
		this.fetch_queue();
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

	template: `
<div v-if="queue">
	<md-dialog-alert md-title="Meddelande" style="white-space: pre-line;" :md-active.sync="broadcast_active" :md-content="broadcast_message"
		md-confirm-text="OK!" @md-closed="broadcast_active = false"/>

	<md-dialog-alert md-title="Meddelande" style="white-space: pre-line;" :md-active.sync="notify_active" :md-content="notification_message"
		md-confirm-text="OK!" @md-closed="broadcast_active = false"/>

	<md-dialog-prompt :md-active.sync="prompt_broadcast" v-model="message" md-title="Meddela samtliga" md-input-placeholder="Skriv meddelande..."
		md-confirm-text="Skicka" md-cancel-text="Avsluta" @md-confirm="broadcast" @md-cancel="prompt_broadcast = false"/>

	<md-dialog-prompt :md-active.sync="promt_notify_faculty" v-model="message" md-title="Meddela assistenter" md-input-placeholder="Skriv meddelande..."
		md-confirm-text="Skicka" md-cancel-text="Avsluta" @md-confirm="broadcast_faculty" @md-cancel="promt_notify_faculty = false"/>

	<md-dialog-confirm :md-active.sync="promt_clear_queue && queue.queuing.length !== 0" md-title="Vill du rensa kön?"
		md-confirm-text="Ja, rensa kön" md-cancel-text="Nej, återgå" @md-confirm="purge()" @md-cancel="promt_clear_queue = false"/>
	
	<div class="md-layout md-gutter md-alignment-top">
		<div class="md-layout-item md-xlarge-size-30 md-large-size-30 md-medium-size-30 md-small-size-30 md-xsmall-size-100">
			<md-card v-if="is_assistant_in_queue">
				<md-card-header>
					<h2 class="md-title">Alternativ</h2>
				</md-card-header>
				
				<md-card-content>
					<md-list>
						<md-list-item v-on:click="prompt_broadcast = true">
							<md-icon>chat_bubble_outline</md-icon>
							<span class="md-list-item-text">Meddela samtliga</span>
						</md-list-item>
						
						<md-list-item v-on:click="promt_notify_faculty = true">
							<md-icon>chat_bubble</md-icon>
							<span class="md-list-item-text">Meddela assistenter</span>
						</md-list-item>
						
						<md-list-item v-on:click="queue.queuing.length !== 0 && (promt_clear_queue = true)" :disabled="queue.queuing.length === 0">
							<md-icon>clear_all</md-icon>
							<span class="md-list-item-text">Rensa kön</span>
						</md-list-item>
						
						<md-list-item v-on:click="toggle_open()">
							<md-icon v-if="queue.open">lock</md-icon>
							<md-icon v-else>lock_open</md-icon>
							<span class="md-list-item-text" v-if="queue.open">Stäng kön</span>
							<span class="md-list-item-text" v-else>Öppna kön</span>
						</md-list-item>
						
						<md-list-item v-on:click="redirect('edit')">
							<md-icon>settings</md-icon>
							<span class="md-list-item-text">Inställningar</span>
						</md-list-item>
					</md-list>
				</md-card-content>
			</md-card>
			
			<br />
			
			<md-card>
				<md-card-header>
					<h2 class="md-title">Gå med i kön</h2>
				</md-card-header>
				
				<md-card-content>
					<div v-if="!queue.open && !in_queue">
						<div v-if="$root.$data.profile === null">
							<p>Kön är stängd och du är inte inloggad.</p>
							<md-button class="md-primary md-raised" v-on:click="$root.redirect_login()">Logga in</md-button>
						</div>
						
						<p v-else>Kön är stängd.</p>
					</div>
					
					<div v-else-if="queue.rooms.length > 0 && ($root.$data.location === null || !queue.rooms.map(x => x.id).includes($root.$data.location.room_id))">
						<p>För att kunna ställa dig i kön måste du vara inloggad på en dator i någon av följande rum.</p>
						
						<ul>
							<li v-for="room in queue.rooms">{{ room.name }}</li>
						</ul>
					</div>
					
					<div v-else-if="$root.$data.profile === null">
						<p>För att kunna ställa dig i kön måste du logga in.</p>
						<md-button class="md-primary md-raised" v-on:click="$root.redirect_login()">Logga in</md-button>
					</div>
					
					<div v-else-if="blocked_by_whitelist">
						<p>Den här kön kan du inte ställa dig i.</p>
					</div>
					
					<div v-else>
						<form novalidate>
							<md-field>
								<label for="location">Plats</label>
								<md-input v-if="$root.$data.location === null" id="location" type="text" v-model="location" required />
								<md-input v-else type="text" :placeholder="$root.$data.location.name" disabled style="background: #eeeeee;" />
							</md-field>

							<md-field>
								<label for="comment">Kommentar</label>
								<md-input :required="queue.force_comment" type="text" id="comment" v-model="comment" />
							</md-field>

							<div v-for="p_action in queue.actions">
								<!--class="md-get-palette-color(green, A200)" -->
								<md-radio v-model="action" :value="p_action.id" :class="'md-' + p_action.color"> {{ p_action.name }} </md-radio>
							</div>
						</form>

						<md-card-actions>
							<span v-if="in_queue === true">
								<md-button v-on:click="receiving_help($root.$data)" type="submit" class="md-primary">Får hjälp</md-button>
								<md-button v-on:click="dequeue(($root.$data))" type="submit" class="md-accent">Lämna kön</md-button>
							</span>
							<span v-else>
								<md-button v-if="in_queue === false" :disabled="!queue.open || (queue.force_comment && (comment === null || comment.length === 0)) || (queue.force_action && action === null)" v-on:click="enqueue" type="submit" class="md-primary"><md-icon>person_add</md-icon> Gå med i kön</md-button>
							</span>
						</md-card-actions>
					</div>
				</md-card-content>
			</md-card>
		</div>
		
		<div class="md-layout-item md-xlarge-size-70 md-large-size-70 md-medium-size-70 md-small-size-70 md-xsmall-size-100">
			<h1>
				<md-icon v-if="!queue.open" class="md-size-2x md-accent">lock</md-icon>
				<md-icon v-if="queue.open" class="md-size-2x">people</md-icon>
				{{ queue.name }}
			</h1>
			
			<p style="white-space: pre-line;">{{ queue.description }}</p>
			
			{{ open_menu }}
			
			<md-card v-if="queue.queuing.length > 0">
				<md-card-content>
					<md-table @md-selected="on_select(user)">
						<md-table-row>
							<md-table-head md-numeric></md-table-head>
							<md-table-head style="width: 30%;">Namn</md-table-head>
							<md-table-head style="width: 20%;">Tid</md-table-head>
							<md-table-head style="width: 50%;">Kommentar</md-table-head>
						</md-table-row>
						
						<md-table-row v-if="view_entire_queue === true" v-for="(user, index) in queue.queuing" :key="user.profile.id" md-selectable="single" v-on:click="toggle_menu(user)" v-bind:style="[user.handlers.length === 0 ? {backgroundColor: 'white'} : {backgroundColor: 'blue'}], [user.bad_location === true ? {backgroundColor: 'red'} : {backgroundColor: 'white'}]">
							<md-table-cell md-numeric>
								{{ index + 1 }}
								
								<md-menu md-size="big" md-direction="top-start" md-close-on-select="false" md-close-on-click="false" :md-active="open_menu === user.profile.id">
									<md-menu-content>
										<md-menu-item>My Item 1</md-menu-item>
										<md-menu-item>My Item 2</md-menu-item>
										<md-menu-item>My Item 3</md-menu-item>
									</md-menu-content>
								</md-menu>
							</md-table-cell>
							<md-table-cell>
								<md-badge v-if="user.action !== null" class="md-primary md-square" :md-content="user.action.name" />
								<div v-if="user.profile.name !== null" style="white-space: nowrap;">{{ user.profile.name }}</div>
								<span v-if="typeof user.location === 'string'"> {{ user.location }} </span> <span v-else> {{ user.location.name }} </span>
							</md-table-cell>
							<md-table-cell>{{unix_to_time_ago(user.entered_at)}} </md-table-cell>
							<md-table-cell><span v-if="user.comment !== null"> {{ user.comment }} </span></md-table-cell>
						</md-table-row>
					</md-table>
				</md-card-content>
			</md-card>
		</div>
	</div>
</div>
	`
});
