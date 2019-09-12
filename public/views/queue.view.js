


Vue.component('route-queue', {
	data() {
		return {
			queue: null,
			location: null,
			comment: null,
			action: null,
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
		enqueue() {
			fetch('/api/queues/' + this.queue.name + '/queuing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 	
					'location': this.location,
				'action': this.action,
					'comment': this.comment})})
			.then(res => {
				if (res.status !== 201) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});
		},
		
		dequeue(student) {
			fetch('/api/queues/' + this.queue.name + '/queuing/' + student.profile.id, {
				method: 'DELETE'
			}).then(res => {
				if (res.status !== 200) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});
		},
		
		receiving_help(profile) {
			const qs = this.queue.queuing.find(x => x.profile.id === profile.id);
			const is_handling = qs.handlers.find(x => x.id === this.$root.$data.profile.id) === undefined;
			
			fetch('/api/queues/' + this.queue.name + '/queuing/' + qs.profile.id, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_handling: is_handling })
			}).then(res => {
				if (res.status !== 200) {
					res.json().then(j => {
						console.log(j);
					});
				}
			});
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
			var new_position = parseInt(document.getElementById('pos').value);
			
			if (new_position > this.queue.queuing.length || new_position < 1 || isNaN(new_position)) {
				alert('Positionen du valt är inte giltig.');
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
		
      	unix_to_time_ago(unix) {
			// TODO: övergå till något bibliotek, till exempel Moment
			d = new Date(unix);
			
			day = '0' + d.getDate();
			month = '0' + (d.getMonth() + 1);
			year = d.getFullYear();
			
			hour = '0' + d.getHours();
			min = '0' + d.getMinutes();
			sec = '0' + d.getSeconds();
			
			time = year + month + day + ' ' + hour + min + sec;
			
			return hour.slice(-2) + ':' + min.slice(-2);
		},
		
		nice_location(location) {
			return typeof(location) === 'string' ? location : location.name;
		},
		
		redirect (url) {
			if (url === 'edit'){
				this.$router.push('/queues/' + this.queue.name + '/edit');
			}
			else if (url === 'queues'){
				this.$router.push('/queues');
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
			
			// om en assistent har öppnat rutan med inställningar för en köande student, justera den
			if (this.open_menu !== null) {
				const qsi = this.queue.queuing.findIndex(x => x.profile.id === this.open_menu.profile.id);

				this.open_menu = qsi === -1 ? null : this.queue.queuing[qsi];
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
		
		is_assistant_in_queue() {
			// för att få tillgång till admin måste personen vara inloggad
			if (this.$root.$data.profile === null) {
				return false;
			}
			
			// är man lärare är man alltid assistent
			if (this.$root.$data.profile.teacher === true){
				return true;
			}

			// man kan annars vara assistent i den aktuella kön
			return this.queue.assistants.findIndex(x => x.id === this.$root.$data.profile.id) !== -1;
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
		
		view_entire_queue() {
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
	
	<md-dialog v-if="open_menu !== null" :md-active="true">
		<md-dialog-content>
			<h2>
				{{ queue.queuing.findIndex(x => x.profile.id === open_menu.profile.id ) + 1 }}.
				<span v-if="open_menu.profile.user_name !== null">{{ open_menu.profile.name }} ({{ open_menu.profile.user_name }})</span>
			</h2>
			<strong>Gick in i kön:</strong> {{ unix_to_time_ago(open_menu.entered_at) }}<br />
			<strong>Plats:</strong> <span :class="[{ badLocation: open_menu.bad_location }]"">{{ nice_location(open_menu.location) }}</span><br />
			<strong>Kommentar:</strong> {{ open_menu.comment }}
			
			<div v-if="open_menu.handlers.length > 0">
				<strong>Assisteras av:</strong> {{ open_menu.handlers.map(x => x.name + ' (' + x.user_name + ')').join(', ') }}
			</div>
		</md-dialog-content>
		
		<md-dialog-actions>
			<span v-if="is_assistant_in_queue">
				<md-button class="md-accent" @click="dequeue(open_menu)">Ta bort</md-button>
				<md-button class="md-accent" v-if="!open_menu.bad_location" @click="bad_location(open_menu)">Placering</md-button>
				<md-button v-else @click="bad_location(open_menu)">Placering</md-button>
				
				<md-button class="md-primary" @click="receiving_help(open_menu.profile)" v-if="open_menu.handlers.find(x => x.id === $root.$data.profile.id) === undefined">Assistera</md-button>
				<md-button @click="receiving_help(open_menu.profile)" v-else>Sluta assistera</md-button>
			</span>

			<md-button class="md-primary" @click="open_menu = null">Stäng</md-button>
		</md-dialog-actions>
	</md-dialog>
	
	<div class="md-layout md-gutter md-alignment-top">
		<div class="md-layout-item md-xlarge-size-70 md-large-size-70 md-medium-size-70 md-small-size-70 md-xsmall-size-100">
			<h1>
				<md-icon v-if="!queue.open" class="md-size-2x md-accent">lock</md-icon>
				<md-icon v-if="queue.open" class="md-size-2x">people</md-icon>
				{{ queue.name }}
			</h1>
			
			<p style="white-space: pre-line;">{{ queue.description }}</p>
			
			<md-table v-if="queue.queuing.length > 0">
				<md-table-row>
					<md-table-head style="width: 30%;">Namn</md-table-head>
					<md-table-head style="width: 20%;">Tid</md-table-head>
					<md-table-head style="width: 50%;">Kommentar</md-table-head>
				</md-table-row>
				
				<md-table-row
					v-if="view_entire_queue === true"
					v-for="(user, index) in queue.queuing"
					:key="user.profile.id"
					v-on:click="open_menu = user"
					style="cursor: pointer;"
					:class="[{ studentIsHandled: user.handlers.length > 0 }, { myQueueRow: $root.$data.profile !== null && user.profile.id === $root.$data.profile.id }]">
					<md-table-cell>
						<md-badge v-if="user.action !== null" class="md-primary md-square" :md-content="user.action.name" />
						<div v-if="user.profile.name !== null" style="white-space: nowrap;">{{ index + 1 }}. {{ user.profile.name }}</div>
						<span :class="[{ badLocation: user.bad_location }]">{{ nice_location(user.location) }} </span>
					</md-table-cell>
					<md-table-cell>{{ unix_to_time_ago(user.entered_at )}} </md-table-cell>
					<md-table-cell>
						<span v-if="user.comment !== null">{{ user.comment }}</span>
					</md-table-cell>
				</md-table-row>
			</md-table>
		</div>
		
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
					<h2 class="md-title">
						<span v-if="in_queue">Hantera min köplats</span>
						<span v-else>Gå med i kön</span>
					</h2>
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
							<md-field v-if="$root.$data.location === null">
								<label for="location">Plats</label>
								<md-input id="location" type="text" v-model="location" required />
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
							<span v-if="in_queue">
								<md-button v-on:click="dequeue($root.$data)" type="submit" class="md-accent">Lämna kön</md-button>
							</span>
							<span v-else>
								<md-button v-if="!in_queue" :disabled="!queue.open || (queue.force_comment && (comment === null || comment.length === 0)) || (queue.force_action && action === null)" v-on:click="enqueue" type="submit" class="md-primary"><md-icon>person_add</md-icon> Gå med i kön</md-button>
							</span>
						</md-card-actions>
					</div>
				</md-card-content>
			</md-card>
		</div>
	</div>
</div>
	`
});
