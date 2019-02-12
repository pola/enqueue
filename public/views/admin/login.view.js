Vue.component('route-admin-login', {
	data() {
		return {
			admin: null,
			admins: []
		}
	},
	methods: {
		login() {
			if (this.admin === null) {
				return;
			}
			this.$router.push(`/admin/${this.admin}`);
		}
	},
	created() {
		fetch(`/api/admins`)
		.then(res => res.json())
		.then(data => {
			this.admins = data;
		})
	},
	template: `
    <div class="text-box col-md-4 col-md-offset-4" style="text-align: center;" v-if="admins !== null">
		<h1>Vem är du?</h1>
		
		<form v-on:submit.prevent="login()">
			<select class="form-control" v-model="admin">
				<option value="">---</option>
				<option v-for="admin in admins" :value="admin.id">{{ admin.name }}</option>
			</select>
			
			<br />
			
			<input class="btn btn-primary" type="submit" value="Logga in">
		</form>
	</div>
	`
});
