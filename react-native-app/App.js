import React from 'react';
import { Button, TextInput, View, Text, AsyncStorage } from 'react-native';
import { createAppContainer, createStackNavigator } from 'react-navigation';
import { Header, ListItem } from 'react-native-elements'
import Icon from 'react-native-vector-icons/FontAwesome';
import SocketIOClient from 'socket.io-client';

const base = 'http://192.168.5.167:8989';
const api_base = base + '/api';

const socket = SocketIOClient(base);
var profile = null;

socket.connect();

socket.on('connect', () => {
	console.log('Ansluten');
});

class QueingStudentScreen extends React.Component {
	static navigationOptions = ({ navigation }) => {
		return {
			title: navigation.state.params.queing_student.profile.name
		};
	};
	
	constructor(props) {
		super(props);
		
		this.state = {
			queue: this.props.navigation.state.params.queue,
			queing_student: this.props.navigation.state.params.queing_student,
			in_queue: true
		};
		
		this.buttonHandle = this.buttonHandle.bind(this);
		this.buttonKick = this.buttonKick.bind(this);
		this.buttonBadLocation = this.buttonBadLocation.bind(this);
		
		socket.on('update_queue_queuing_student', data => {
			if (this.state.queue.id !== data.queue || this.state.queing_student.profile.id !== data.student.profile.id) {
				return;
			}
			
			this.updateQueingStudent(data.student);
		});
		
		socket.on('update_queue', data => {
			if (this.state.queue.id !== data.queue || !data.changes.hasOwnProperty('queuing')) {
				return;
			}
			
			var queing_student = data.changes.queuing.find(s => s.profile.id === this.state.queing_student.profile.id);
			
			if (queing_student === undefined) {
				this.setState({
					in_queue: false
				});
			} else {
				this.updateQueingStudent(queing_student);
			}
		});
	}
	
	updateQueingStudent(n) {
		const queing_student = this.state.queing_student;
		
		for (const k of Object.keys(n)) {
			queing_student[k] = n[k];
		}
		
		this.setState({
			queing_student: queing_student
		});
		
		if (!this.state.in_queue) {
			this.setState({
				in_queue: true
			});
		}
	};
	
	buttonHandle() {
		fetch(api_base + '/queues/' + this.state.queue.id + '/queuing/' + this.state.queing_student.profile.id, {
			credentials: 'include',
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ is_handling: !this.state.queing_student.handlers.find(h => h.id === profile.id) })
		});
	};
	
	buttonKick() {
		fetch(api_base + '/queues/' + this.state.queue.id + '/queuing/' + this.state.queing_student.profile.id, {
			credentials: 'include',
			method: 'DELETE',
		}).then(res => {
			this.props.navigation.goBack();
		});
	};
	
	buttonBadLocation() {
		fetch(api_base + '/queues/' + this.state.queue.id + '/queuing/' + this.state.queing_student.profile.id, {
			credentials: 'include',
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ bad_location: !this.state.queing_student.bad_location })
		});
	};
	
	niceList(l) {
		var s = '';
		
		for (var i = 0; i < l.length; i++) {
			s += l[i];
			
			if (i === l.length - 2) { s += ' & '; }
			else if (i < l.length - 2) { s += ', '; }
		}
		
		return s;
	}
	
	render() {
		if (!this.state.in_queue) {
			return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text>Studenten står inte längre i kön.</Text>
			</View>)
		}
		
		return (
			<View style={{ flex: 1, padding: 10 }}>
				<View style={{ flex: 0.4 }}>
					<Text style={{ paddingBottom: 5 }}>
						Plats:{'\n'}
						{ typeof(this.state.queing_student.location) === 'string' ? this.state.queing_student.location : this.state.queing_student.location.name }
						{ this.state.queing_student.bad_location && <Text style={{ color: "red" }}> (ogiltig)</Text> }
					</Text>
					
					{ this.state.queing_student.comment !== null &&
						<Text style={{ paddingBottom: 5 }}>Kommentar:{'\n'}
						{ this.state.queing_student.comment }</Text>
					}
					
					{ this.state.queing_student.action !== null &&
						<Text style={{ paddingBottom: 5 }}>Syfte:{'\n'}
						{ this.state.queing_student.action.name }</Text>
					}
					
					{ this.state.queing_student.handlers.length !== 0 &&
						<Text style={{ paddingBottom: 5 }}>Hanteras av:{'\n'}
						{ this.niceList(this.state.queing_student.handlers.map(h => h.name)) }</Text>
					}
				</View>
				
				<View style={{ flex: 0.6 }}>
					<View style={{ padding: 5 }}>
						{ this.state.queing_student.handlers.map(x => x.id).includes(profile.id) ? 
							<Button
								title="Sluta hantera"
								onPress={ this.buttonHandle }
							/>
						:
							<Button
								title="Börja hantera"
								onPress={ this.buttonHandle }
								color="green"
							/>
						}
					</View>
					
					<View style={{ padding: 5 }}>
						<Button
							title="Sparka ut"
							onPress={ this.buttonKick }
							color="red"
						/>
					</View>
					
					<View style={{ padding: 5 }}>
						<Button
							title={ this.state.queing_student.bad_location ? "Markera accepterad position" : "Markera ogiltig position" }
							onPress={ this.buttonBadLocation }
						/>
					</View>
				</View>
			</View>
		);
	}
}

class LoginScreen extends React.Component {
	static navigationOptions = {
		title: 'Logga in'
	};
	
	constructor(props) {
		super(props);
		
		this.state = {
			username: null,
			password: null
		};
	}
	
	componentDidMount() {
		AsyncStorage.getItem('@Enqueue:token').then(token => {
			fetch(api_base + '/authenticate', {
				credentials: 'include',
				headers: { 'Token': token }
			}).then(res => res.json()).then(data => {
				this.loginStep2();
			});
		});
	};
	
	handleLoginPress = () => {
		const username = this.state.username;
		const password = this.state.password;
		
		if (username === null || password === null) {
			return;
		}
		
		fetch(base + '/login', { credentials: 'include' }).then(res => {
			if (res.status === 200) {
				res.text().then(data => {
					if (data.includes('Enqueue')) {
						this.loginStep2();
					} else {
					const action = data.match(/action="([^"]+)"/)[1];
						const lt = data.match(/<input type="hidden" name="lt" value="([^"]+)" \/>/)[1];
						const execution = data.match(/<input type="hidden" name="execution" value="([^"]+)" \/>/)[1];
						
						fetch('https://login.kth.se' + action,
						{
							credentials: 'include',
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&lt=' + encodeURIComponent(lt) + '&execution=' + encodeURIComponent(execution) + '&_eventId=submit&submit=Logga+in'
						}).then(res => {
							loginStep2();
						});
					}
				});
			}
		});
	};
	
	loginStep2() {
		fetch(api_base + '/me', { credentials: 'include' }).then(res => res.json()).then(data1 => {
			if (data1.profile === null) {
				alert('Fel användarnamn eller lösenord.');
			} else {
				fetch(api_base + '/authenticate', { credentials: 'include' }).then(res => res.json()).then(data2 => {
					AsyncStorage.multiSet([
						['@Enqueue:profile:id', data1.profile.id],
						['@Enqueue:profile:user_name', data1.profile.user_name],
						['@Enqueue:profile:name', data1.profile.name],
						['@Enqueue:token', data2.token],
					], () => {
						profile = data1.profile;
						this.props.navigation.navigate('List');
					});
				});
			}
		});
	};
	
	render() {
		return (
			<View style={{ flex: 1 }}>
				<TextInput
					onChangeText={username => this.setState({username})}
					placeholder="Användarnamn"
					value={this.state.username}
				/>
				
				<TextInput
					onChangeText={password => this.setState({password})}
					placeholder="Lösenord"
					value={this.state.password}
					secureTextEntry={true}
				/>
				
				<Button
					title="Logga in"
					onPress={this.handleLoginPress}
				/>
			</View>
		);
	}
}

class ListScreen extends React.Component {
	static navigationOptions = {
		title: 'Välj en kö'
	};
	
	componentDidMount() {
		fetch(api_base + '/queues', { credentials: 'include' }).then(res => res.json()).then(queues => {
			
			queues.sort((x, y) => {
				if (x.open && !y.open) {
					return -1;
				} else if (!x.open && y.open) {
					return 1;
				} else if (x.name < y.name) {
					return -1;
				} else if (x.name > y.name) {
					return 1;
				} else {
					return 0;
				}
			});
			
			this.setState({
				queues: queues
			});
		});
	}
	
	constructor(props) {
		super(props);
		
		this.state = { queues: [] };
	}
	
	render() {
		return (
			<View style={{ flex: 1 }}>
				{this.state.queues.map((queue, index) => (
					<ListItem
						key={ queue.name }
						leftElement={
							queue.open ?
								<Text>{ queue.queuing_count }</Text>
							:
								<Icon name="lock" size={24} color="#900" />
						}
						title={ queue.name }
						subtitle=""
						chevron={ true }
						containerStyle={{ backgroundColor: queue.open ? '#ffffff' : '#ffe5e5' }}
						onPress={() => this.props.navigation.navigate('Queue', { name: queue.name })}
					/>
				))}
			</View>
		);
	}
}

class QueueScreen extends React.Component {
	static navigationOptions = ({ navigation }) => {
		return {
			title: navigation.state.params.name
		};
	};
	
	constructor(props) {
		super(props);
		
		const queue_name = this.props.navigation.state.params.name;
		this.state = { queue: null };
		
		fetch(api_base + '/queues/' + queue_name, { credentials: 'include' }).then(res => res.json()).then(queue => {
			this.setState({
				queue: queue
			});
		});
		
		socket.on('update_queue', data => {
			if (this.state.queue === null || this.state.queue.id !== data.queue) {
				return;
			}
			
			const queue = this.state.queue;
			
			for (const k of Object.keys(data.changes)) {
				queue[k] = data.changes[k];
			}
			
			this.setState({
				queue: queue
			});
		});
		
		socket.on('update_queue_queuing_student', data => {
			if (this.state.queue === null || this.state.queue.id !== data.queue) {
				return;
			}
			
			const queue = this.state.queue;
			
			for (const queuing_student of queue.queuing) {
				if (queuing_student.profile.id === data.student.profile.id) {
					for (const k of Object.keys(data.student)) {
						queuing_student[k] = data.student[k];
					}
				}
			}
			
			this.setState({
				queue: queue
			});
		});
	}
	
	render() {
		if (this.state.queue === null) {
			return <View />;
		}
		
		return (
			<View style={{ flex: 1 }}>
				{this.state.queue.description !== null &&
					<Text style={{ padding: 10 }}>{ this.state.queue.description }</Text>
				}
				
				{this.state.queue.queuing.length === 0 ?
					<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
						<Text>Kön är tom.</Text>
					</View>
					
					:
					
					this.state.queue.queuing.map((queing_student, index) => (
						<ListItem
							key={ queing_student.profile.id }
							leftElement={ <Text>{ index + 1 }</Text> }
							title={ queing_student.profile.name }
							subtitle={ (queing_student.action !== null ? (queing_student.action.name + ' • ') : '') + (typeof(queing_student.location) === 'string' ? queing_student.location : queing_student.location.name) }
							onPress={() => this.props.navigation.navigate('QueingStudent', { queue: this.state.queue, queing_student: queing_student })}
						/>
					))
				}
			</View>
		);
	}
}

const RootStack = createStackNavigator(
	{
		Login: {
			screen: LoginScreen
		},
		QueingStudent: {
			screen: QueingStudentScreen
		},
		List: {
			screen: ListScreen,
		},
		Queue: {
			screen: QueueScreen,
		},
	},
	{
		initialRouteName: 'Login',
	}
);

const AppContainer = createAppContainer(RootStack);

export default class App extends React.Component {
	render() {
		return <AppContainer />;
	}
}
