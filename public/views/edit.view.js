Vue.component('route-edit', {
	data() {
		return {
			queue: null,
			somePlaceholder : string = null
		}
	},
	methods: {
		login(){
			window.location = '/login';
			// TODO: skicka tillbaka till kön!
		}

	},
	created() {
    // TODO: lägg till hantering av 404
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
			somePlaceholder = queue.description;
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
	<!-- TODO: sätt tid för att öppna kön automatiskt -->
	<!-- TODO: ange tillåtna salar -->
	<!-- TODO: sätt tid för att tömma kön automatiskt -->
	<!-- TODO: ändra köns beskrivning -->
	<!-- TODO: ange vitlista -->


	<md-field>
      <label>Ändra beskrivning av kön</label>
      <md-textarea v-model="textarea" :placeholder="somePlaceholder"></md-textarea>
    </md-field>





</div>
	`
});
