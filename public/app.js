const router = new VueRouter({
	mode: 'history',
	routes: [
		{ path: '/', redirect: '/queues' },
		{ path: '/queues', component: Vue.component('route-queues') },
		{ path: '/queues/:name', component: Vue.component('route-queue') },
		{ path: '/admin', component: Vue.component('route-admin-dashboard') }
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

fetch('/api/me').then(res => res.json()).then(me => {
	app.$data.profile = me.profile;
	app.$data.location = null;
	//app.$data.profile = profile;
})
