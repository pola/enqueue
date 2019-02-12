Vue.component('route-admin-create', {
	data() {
		return {
			id: this.$route.params.id,
			assistant: null,
			time: null
		}
	},
	methods: {
		create() {
			window.socket.emit('create', { id: this.id, time: this.time });
			this.$router.push(`/admin/${this.id}`);
		}
	},
	created() {
		fetch(`/api/time_slots/${this.id}`)
		.then(res => res.json())
		.then(data => {
			this.assistant = data.name;
		});
	},
	template: `
    <div class="text-box col-md-4 col-md-offset-4" style="text-align: center">
		<h1>Skapa tidslucka för {{ this.assistant }}</h1>
		
		<form v-on:submit.prevent="create()">
			<input class="form-control" type="text" v-model="time" placeholder="YYYY-MM-DD HH:MM" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}" required autofocus>
			<input class="btn btn-default" type="submit" value="Skapa tidslucka">
		</form>
	</div>
	`
});
