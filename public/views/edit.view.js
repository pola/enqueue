Vue.component('route-edit', {
	data() {
		return {
			queue: null
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
		});
	},
	template: `
<div class="container" v-if="queue">
	<div class="row">
		<div class="col-md-4" :class="{ 'text-danger': queue.open === false }"> 
			<h2> <span v-if="!queue.open" class="glyphicon glyphicon-lock"></span>  {{ queue.name }} </h2> 
		</div>
	</div>
</div>
	`
});
