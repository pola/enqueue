Vue.component('route-queue', {
	data() {
		return {
			queue: null
		}
	},
	methods: {
		open_queue(queue) {
			this.$router.push('/queues/' + queue.name);
		}
	},
	created() {
    // TODO: lägg till hantering av 404
		fetch('/api/queues/' + this.$route.params.name).then(res => res.json()).then(queue => {
			this.queue = queue;
		});
	},
	template: `
	<div class="container">
		<section class="col-md-8 col-md-offset-2">
			<md-table md-card>
	      <md-table-toolbar>
	        <h1 class="md-title">{{ queue.name }}</h1>
	      </md-table-toolbar>


		</section>
	</div>
	`
});
