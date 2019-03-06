// gå med i en kö
fetch('/api/queues/prutt/students', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ comment: 'hej', location: 'en plats', action: 2 })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 201) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// ändra uppgifter i en kö
fetch('/api/queues/prutt/students/u1tm1nqn', {
	method: 'PATCH',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ comment: 'ändrad kommentar', location: 'en annan plats', action: 1 })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// placera en student först i kön
fetch('/api/queues/prutt/students/u1tm1nqn', {
	method: 'PATCH',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ move_after: null })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// placera en student efter en (annan) student i kön
fetch('/api/queues/prutt/students/u1tm1nqn', {
	method: 'PATCH',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ move_after: 'u1f9b7g5' })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// töm en kö
fetch('/api/queues/tilpro/students', {
	method: 'DELETE'
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// lämna en kö
fetch('/api/queues/prutt/students/u1tm1nqn', {
	method: 'DELETE'
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// ta bort en kö (skickar bara en statuskod tillbaka, aldrig något body-innehåll)
fetch('/api/queues/tilpro', {
	method: 'DELETE'
}).then(res => {
	console.log(res.status);
});

// ändra egenskaper hos en kö
fetch('/api/queues/tilpro', {
	method: 'PATCH',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		// name: 'annat-namn',
		open: true,
		description: 'En beskrivning\med flera rader',
		force_comment: false,
		force_action: true
	})
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// skapa en action för en kö
fetch('/api/queues/tilpro/actions', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ name: 'Test 5', color: 'primary' })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 201) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// ta bort en action för en kö
fetch('/api/queues/tilpro/actions/12', {
	method: 'DELETE'
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// associera ett befintligt rum med en kö
fetch('/api/queues/tilpro/rooms', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ room_id: 3 })
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 201) {
		res.json().then(j => {
			console.log(j);
		});
	}
});

// ta bort en association mellan ett rum och en kö
fetch('/api/queues/tilpro/rooms/3', {
	method: 'DELETE'
}).then(res => {
	console.log(res.status);
	
	if (res.status !== 200) {
		res.json().then(j => {
			console.log(j);
		});
	}
});
