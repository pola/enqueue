import React from 'react';
import { Button, View, Text } from 'react-native';
import { createAppContainer, createStackNavigator } from 'react-navigation';
import { Header, ListItem } from 'react-native-elements'
import Icon from 'react-native-vector-icons/FontAwesome';
import SocketIOClient from 'socket.io-client';

const base = 'http://spel-21.csc.kth.se:8989';
const api_base = base + '/api';

const socket = SocketIOClient(base);

socket.connect();

socket.on('connect', () => {
	console.log('Ansluten');
});

class ListScreen extends React.Component {
	static navigationOptions = {
		title: 'Välj en kö'
	};
	
	constructor(props) {
		super(props);
		
		this.state = { queues: [] };
		
		fetch(api_base + '/queues').then(res => res.json()).then(queues => {
			
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
		
		fetch(api_base + '/queues/' + queue_name).then(res => res.json()).then(queue => {
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
		
		socket.emit('HEJ', null);
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
					
					this.state.queue.queuing.map((student, index) => (
						<ListItem
							key={ student.profile.id }
							leftElement={ <Text>{ index + 1 }</Text> }
							title={ student.profile.name }
							subtitle={ typeof(student.location) === 'string' ? student.location : student.location.name }
						/>
					))
				}
			</View>
		);
	}
}

const RootStack = createStackNavigator(
	{
		List: {
			screen: ListScreen,
		},
		Queue: {
			screen: QueueScreen,
		},
	},
	{
		initialRouteName: 'List',
	}
);

const AppContainer = createAppContainer(RootStack);

export default class App extends React.Component {
	render() {
		return <AppContainer />;
	}
}
