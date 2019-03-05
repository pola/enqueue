Vue.component('route-edit', {
	data() {
		return {
			queue: null,
			somePlaceholder : string = null,
			new_description: null,
			rooms: null
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

		delete_queue(){
			console.log("delete");
			fetch('/api/queues/' + this.queue.name, {
        		method: "DELETE"
    		}).then(res => {
				if (res.status !== 200) {
					alert('Kunde ej genomföra operationen');
				}
				else {
					this.$router.push('/queues');
				}
			});

		}


	},
	created() {
    // TODO: lägg till hantering av 404
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
			somePlaceholder = queue.description;
			rooms = queue.rooms;
			console.log(somePlaceholder);
		});
	},
	template: `
<div class="container" v-if="queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> 
		</div>
	</div>

	<!-- TODO: sätt tid för att tömma kön automatiskt -->
		<!-- https://puranjayjain.github.io/md-date-time-picker/ -->
	
	<!-- TODO: sätt tid för att öppna kön automatiskt -->
		<!-- https://www.npmjs.com/package/vue-datetime - även upprepning, ska man bara välja veckodagar + tid och låta det hända varje vecka??-->
	
	<!-- TODO: ange vitlista -->


	<form novalidate @submit.prevent="change_description">
		<md-field>
	    	<label>Ändra beskrivning av kön</label>
	    	<md-textarea id="new_description" name="new_description" v-model="new_description" placeholder="{{queue.description}}"></md-textarea>
	    </md-field>
	    <md-card-actions>
	   		<md-button type="submit" class="md-primary">Genomför ändring</md-button>
	   	</md-card-actions>
	</form>

	<form novalidate @submit.prevent="change_rooms">
	    <md-field>
	      <label>Ändra tillåtna salar (om inga anges kan studenterna sitta var som helst)</label>
	      <md-input v-model="rooms"></md-input>
	    </md-field>
	    <md-card-actions>
	    	<md-button type="submit" class="md-primary">Genomför ändring</md-button>
	    </md-card-actions>
    </form>

    <md-card-actions>
	    	<md-button v-on:click="delete_queue" type="submit" class="md-danger">Ta bort kön</md-button>
	</md-card-actions>
    
</div>
	`
});
