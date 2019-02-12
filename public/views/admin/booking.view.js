Vue.component('route-admin-booking', {
	data() {
		return {
			id: this.$route.params.id,
			assistant: null
		}
	},
	methods: {
		remove(id) {
			window.socket.emit('remove', id);
		},
		cancel(id) {
			window.socket.emit('book', {id: id, name: null});
		},
		get_time_slot(id) {
			for (var time_slot of this.assistant.time_slots) {
				if (time_slot.id === id) {
					return time_slot;
				}
			}
			return null;
		},
		create() {
			this.$router.push(`/admin/${this.id}/create`);
		},
		logout() {
			this.$router.push(`/admin`);
		},
		fetch_table() {
			fetch(`/api/time_slots/${this.id}`)
			.then(res => res.json())
			.then(data => {
				this.assistant = data;
			});
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
		<section class="col-md-8 col-md-offset-2" v-if="assistant !== null">
			<h1>Bokningar för assistent {{ assistant.name }}</h1>
			
			<table class="table">
				<thead>
					<tr>
						<th class="col-md-4">Tid</th>
						<th>Status</th>
						<th class="text-right">Alternativ</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="time_slot in assistant.time_slots">
						<td>{{ time_slot.time }}</td>
						<td v-if="time_slot.booked_by">Bokad av {{ time_slot.booked_by }}</td>
						<td v-else-if="time_slot.locked" class="text-secondary">Reserverad</td>
						<td v-else class="text-success">Ledig</td>
						<td class="text-right"><button class="btn btn-danger" v-if="time_slot.booked_by !== null" v-on:click="cancel(time_slot.id)">Avboka</button> <button class="btn btn-danger" v-on:click="remove(time_slot.id)">Radera</button></td>
					</tr>
				</tbody>
			</table>
			
			<button v-on:click="create()" class="btn btn-primary btn-small">Skapa tidslucka</button>
			<button v-on:click="logout()" class="btn btn-secondary">Logga ut</button>
		</section>
	</div>
	`
});
