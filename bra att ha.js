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
