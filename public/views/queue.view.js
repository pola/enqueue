// buggar: innan man loggar in får man ett error. Om man klickar snabbt hamnar man i kön 2 gånger.

Vue.component('route-queue', {
	data() {
		return {
			queue: null,
			location: null,
			comment: null,
			action: null
		}
	},
	methods: {
		login(){
			window.location = '/login';
			// TODO: skicka tillbaka till kön!
		},
		enqueue(){
				fetch('/api/queues/' + this.queue.name + '/students', {
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
			fetch('/api/queues/' + this.queue.name + '/students/' + this.$root.$data.profile.id, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 200) {
					res.json().then (data => {
						alert(data.message);
					});
				}
			});
		},

		/*in_queue(){
			for (student in this.queue.students) {
				if (this.$root.$data.profile.id === student.profile.id){
					console.log("i kö");
					return true;
				}
			}
			console.log("ej i kö");
			return false;
		},*/

		test (action) {

			return "md-danger";
		}
	},
	created() {
    // TODO: lägg till hantering av 404
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
		});

		this.$root.$data.socket.on('update_queue_students', data => {
			if (data.id == this.queue.id) {
				this.queue.students = data.students;
			}
		});
	},
	template: `
<div class="container" v-if="queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> <h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> </div>
		<p class="col-md-8"> {{ queue.description }} </p>
	</div>
	<div class="row">
		<div class="col-md-3">
			<div v-if="! $root.$data.profile">
				<h4> För att kunna ställa dig i kö måste du logga in </h4>
				<form novalidate @submit.prevent="login">
					<md-card-actions>
						<md-button type="submit" class="md-primary">Logga in</md-button>
					</md-card-actions>
				</form>
			</div>
			<div v-else>
				<form novalidate >
					<md-field>
						<!-- TODO: fixa automatisk ifyllnad -->
						<label for="location">Plats</label>
						<md-input type="text" id="location" name="location" v-model="location" />
					</md-field>

					<md-field>
						<label for="comment">Kommentar</label>
						<md-input :required="queue.force_comment" type="text" id="comment" name="comment" v-model="comment" />
					</md-field>

					<!-- TODO: krav på att man väljer en --> 
					<div v-for="p_action in queue.actions">
					<!--class="md-get-palette-color(green, A200)" -->
						<md-radio v-model="action" :value="p_action.id" :class="'md-' + p_action.color"> {{ p_action.name }} </md-radio>
					</div>

					
				</form>

				<md-card-actions>
											<!-- TODO: visa endast ena -->
					<md-button v-on:click="dequeue" type="submit" class="md-primary">Lämna kön</md-button>
					<md-button :disabled="!queue.open" v-on:click="enqueue" type="submit" class="md-primary">Gå med i kön</md-button>
				</md-card-actions>
			</div>
		</div>
		<section class="col-md-7 col-md-offset-2">
			<md-table md-card>
				<md-table-toolbar>
				  	<md-table-row>
					  	<md-table-head>#</md-table-head>
					  	<md-table-head v-if="$root.$data.profile">Användarnamn</md-table-head>
					  	<md-table-head>Plats</md-table-head>
					  	<md-table-head></md-table-head>
					  	<md-table-head>Kommentar</md-table-head>
					  	<md-table-head>Tid</md-table-head>
					</md-table-row>
		      	</md-table-toolbar>

				<md-table-row v-for="(user, index) in queue.students" :key="user.profile.id">
					<md-table-cell> {{ index+1 }} </md-table-cell>
					<md-table-cell v-if="$root.$data.profile"> {{ user.profile.name }}</md-table-cell>
					<md-table-cell> <span v-if="typeof(user.location) === 'string'"> {{ user.location }} </span> <span v-else> {{ user.location.computer }}  </span></md-table-cell>
					<md-table-cell <span v-if="user.action"> class="font color = user.action.color"> {{ user.action.name }} </span>  </md-table-cell>
					<md-table-cell> <span v-if="user.comment"> {{ user.comment }} </span> </md-table-cell>
					<md-table-cell>{{ user.entered_at }} </md-table-cell>
				</md-table-row>
			</md-table>
		</section>
	</div>
</div>
	`
});
