const routes = [
	{ path: '/', redirect: '/queues' },
	{ path: '/queues', component: Vue.component('route-queues') },
	{ path: '/queues/:name', component: Vue.component('route-queue') },
	{ path: '/admin', component: Vue.component('route-admin-dashboard') }
];

// Create VueRouter
// Docs: https://router.vuejs.org/guide
const router = new VueRouter({
	routes
});

Vue.use(VueMaterial.default);

// Create VueApp
// Docs: https://vuejs.org/v2/guide
const app = new Vue({
	// el: '#app' // can't use element property with VueRouter
	router,
	data: {
		profile: null,
		socket: io().connect()
	},
	methods: {
		redirect(target) {
			// Used in the navigation
			this.$router.push(target);
		},
		set_location(location) {
			window.location = location;
		}
	}
}).$mount('#app');

fetch('/api/profile').then(res => res.json()).then(profile => {
	app.$data.profile = profile;
})
