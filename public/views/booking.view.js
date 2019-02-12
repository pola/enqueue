Vue.component('route-booking', {
	data() {
		return {
			assistants: []
		}
	},
	methods: {
		redirect(id) {
			this.$router.push(`/confirm/${id}`);
		},
		
		get_time_slot(id) {
			for (var assistant of this.assistants) {
				for (var time_slot of assistant.time_slots) {
					if (time_slot.id === id) {
						return time_slot;
					}
				}
			}
			return null;
		},
		
		fetch_table() {
			fetch('/api/time_slots')
			.then(res => res.json())
			.then(data => {
				this.assistants = data;
			})
		}
	},
	created() {
		this.fetch_table();
		
		window.socket.on('lock', id => {
			id = parseInt(id);
			
			var time_slot = this.get_time_slot(id);
			
			if (time_slot !== null){
				time_slot.locked = true;
			}
        });
		
		window.socket.on('unlock', id => {
			id = parseInt(id);
			
			var time_slot = this.get_time_slot(id);
			
			if (time_slot !== null){
				time_slot.locked = false;
			}
		});
		
		window.socket.on('book', data => {
			var id = data.id;
			var name = data.name;
			
			id = parseInt(id);
			
			var time_slot = this.get_time_slot(id);
			
			if (time_slot !== null) {
				time_slot.locked = false;
				time_slot.booked_by = name;
			}
		});
		
		window.socket.on('refresh', data => {
			this.fetch_table();
		});
	},
	template: `
	<div class="container">
		<section class="col-md-8 col-md-offset-2">
			<h1>Tidsluckor</h1>
			
			<div class="row">
				<div class="well" v-for="assistant in assistants">
					<div class="row">
						<h4>Assistent: {{ assistant.name }}</h4>
						
						<table class="table">
							<thead>
								<tr>
									<th>Tid</th>
									<th class="text-right">Status</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="time_slot in assistant.time_slots">
									<td>{{ time_slot.time }}</td>
									<td v-if="time_slot.booked_by" class="text-right text-danger">Bokad</td>
									<td v-else-if="time_slot.locked" class="text-right text-secondary">Reserverad</td>
									<td v-else class="text-right"><button class="btn btn-success" v-on:click="redirect(time_slot.id)">Ledig</button></td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	</div>
	`
});
