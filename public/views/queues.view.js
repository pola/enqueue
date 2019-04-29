Vue.component('route-queues', {
	data() {
		return {
			queues: []
		}
	},
	methods: {
		open_queue(queue) {
			this.$router.push('/queues/' + queue.name);
		}
	},
	created() {
		fetch('/api/queues').then(res => res.json()).then(queues => {
			this.queues = queues.sort((x, y) => {
				if (x.open && !y.open) {
					return -1;
				} else if (!x.open && y.open) {
					return 1;
				} else if (x.name < y.name) {
					return -1;
				} else if (x.name > y.name) {
					return 1;
				} else {
					return 0;
				}
			});
		});
	},

	template: `
<md-card>
	<md-card-header>
		<h1 class="md-title">Enqueue</h1>
	</md-card-header>
	
	<md-card-content>
		<md-table>
			<md-table-row @click.native="open_queue(queue)" v-for="queue in queues" :key="queue.id" :class="{ 'text-danger': queue.open === false }">
				<md-table-cell><span v-if="! queue.open"  class="glyphicon glyphicon-lock"></span> {{ queue.name }}</md-table-cell>
				<md-table-cell class="text-right"> <span class="glyphicon glyphicon-user"></span> {{ queue.queuing_count }}</md-table-cell>
			</md-table-row>
		</md-table>
	</md-card-content>
</md-card>
	`
});
