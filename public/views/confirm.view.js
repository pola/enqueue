Vue.component('route-confirm', {
	data() {
		return {
			id: parseInt(this.$route.params.id),
			name: '',
			time_out : 20
		}
	},
	methods: {
		book() {
			window.socket.emit('book', { id: this.id, name: this.name});
			this.redirect_to_booking();
		},
		
		cancel() {
			window.socket.emit('unlock', this.id);
			this.redirect_to_booking();
		},
		
		redirect_to_booking() {
			this.$router.push(`/booking`);
		},
		
		decrease(){
			this.time_out = this.time_out - 1;
			if (this.time_out > 0){
				setTimeout(this.decrease, 1000);
			}
		}
	},
	created() {
		// berätta för servern att tidsluckan this.id ska reserveras
		window.socket.emit('lock', this.id);
		setTimeout(this.decrease, 1000);
		
		window.socket.on('unlock', id => {
			id = parseInt(id);
			
			if (id === this.id) {
				this.redirect_to_booking();
			}
		});
	},
	destroyed() {
		this.id = null;
	},
	template: `
	<div class="container">
		<section class="col-md-10 col-md-offset-1">
			<h1>Vad heter du?</h1>
			<form v-on:submit.prevent="book()" class="col-md-5">
				<input class="form-control" type="text" v-model="name" required autofocus>
			</form>
			
			<button class="btn btn-primary" v-on:click="book()">Boka</button>
			<button class="btn btn-danger" v-on:click="cancel()">Avbryt</button>
		</section>
		
		<div> Tid kvar:<br />{{ time_out }} <span v-if="time_out == 1">sekund</span><span v-else>sekunder</span> </div>
	</div>
	`
});
