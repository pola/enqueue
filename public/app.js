const routes = [
	{ path: '/', redirect: '/booking' },
	{ path: '/booking', component: Vue.component('route-booking') },
	{ path: '/confirm/:id', component: Vue.component('route-confirm') },
	{ path: '/admin', component: Vue.component('route-admin-login') },
	{ path: '/admin/:id', component: Vue.component('route-admin-booking') },
	{ path: '/admin/:id/create', component: Vue.component('route-admin-create') }
];

// Create VueRouter
// Docs: https://router.vuejs.org/guide
const router = new VueRouter({
	routes
});

// Create VueApp
// Docs: https://vuejs.org/v2/guide
const app = new Vue({
	// el: '#app' // can't use element property with VueRouter
	router,
	methods: {
		redirect(target) {
			// Used in the navigation
			this.$router.push(target);
		}
	},
	created: function() {
		window.socket = io().connect();
	}
}).$mount('#app');
