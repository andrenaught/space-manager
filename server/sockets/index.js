const ioInit = require('socket.io')
const ioClientInit = require('socket.io-client')

let io
let selfSocket
module.exports = {
	init: (http, options, port) => {
		// start and setup socket.io server
		io = ioInit(http, options, port)
		io.on('connection', (socket) => {
			/* ---
				Syncing space data between users in /space/{space_id}
			--- */
			socket.on('join room', (data) => {
				const { id, user } = data
				socket.join(id)
				const totalConnectedUsers = io.sockets.adapter.rooms.get(id).size
				io.in(id).emit('user joined', { user, totalConnectedUsers }) // send to all users (including sender)
			})
			// When user makes a space update
			socket.on('update space', (data) => {
				const { spaceId } = data
				socket
					.to(spaceId)
					.emit(
						'space has updated',
						`another user made changes in space: ${spaceId}`
					)
			})
			// When user leaves space
			socket.on('beforeunload_space', (data) => {
				const { spaceId, spaceUpdated } = data

				// Broadcast updated changes
				if (spaceUpdated) {
					// Wait for changes to finish (hacky solution, but these changes aren't crucial)
					setTimeout(() => {
						socket
							.to(spaceId)
							.emit(
								'space has updated',
								`another user made changes in space: ${spaceId}`
							)
					}, 500)
				}
			})
			// When user disconnects
			socket.on('disconnecting', () => {
				socket.rooms.forEach((room) => {
					socket.to(room).emit('user disconnected') // send to all users (excluding sender)
				})
			})
		})

		selfSocket = ioClientInit(`http://localhost:${port}`)
		return io
	},
	get: () => {
		// return previously cached value
		if (!io || !selfSocket) {
			throw new Error('must call .init() before you can call .get()')
		}
		return { io, selfSocket }
	},
}
