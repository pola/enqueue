const router = new VueRouter({
	mode: 'history',
	routes: [
		{ path: '/', redirect: '/queues' },
		{ path: '/queues', component: Vue.component('route-queues') },
		{ path: '/queues/:name', component: Vue.component('route-queue') },
		{ path: '/admin', component: Vue.component('route-admin-dashboard') },
		{ path: '/queues/:name/edit', component: Vue.component('route-edit') }
	]
});

Vue.use(VueMaterial.default);

// Create VueApp
// Docs: https://vuejs.org/v2/guide
const app = new Vue({
	// el: '#app' // can't use element property with VueRouter
	router,
	data: {
		profile: null,
		location: null,
		assisting_in: null,
		socket: io().connect()
	},
	methods: {
		redirect(target) {
			// Used in the navigation
			this.$router.push(target);
		},
		set_location(location) {
			window.location = location;
		},
		redirect_login() {
			window.location = '/login?returnTo=' + window.location.pathname;
		}
	}
}).$mount('#app');

fetch('/api/me').then(res => res.json()).then(me => {
	app.$data.profile = me.profile;
	app.$data.location = me.location;
	app.$data.assisting_in = me.assisting_in;
})
