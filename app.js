const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const http = require('http')
const io = require('socket.io')
const PORT = 4000
const cors = require('cors')

const app = express()
const server = http.createServer(app)
const sockets = io(server)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors())

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'src/views'))

const game = {
    players: {},
    rooms: {},
    match: {}
}

sockets.on('connection', (socket) => {
    const id = socket.id
    const name = 'Player_' + socket.id.substr(0, 5)
    game.players[socket.id] = { name, id }
    sendGlobalMessage(game.players[socket.id], 'connected')
    refreshPlayers()
    refreshRooms()

    socket.on('setPlayerName', (username) => {
        const id = socket.id
        game.players[socket.id] = { name: username, id }
        sendGlobalMessage(game.players[socket.id], 'connected')
        refreshPlayers()
        refreshRooms()
    })

    socket.on('disconnect', () => {
        if (game.players[socket.id]) leaveRoom(socket)

        delete game.players[socket.id]

        refreshPlayers()
        refreshRooms()
    })

    socket.on('sendGlobalMessage', (message) => {
        const player = game.players[socket.id]
        sendGlobalMessage(player, message)
    })

    socket.on('sendPrivateMessage', (message) => {
        const player = game.players[socket.id]
        const match = player.room
        sendPrivateMessage(player, message, match)
    })

    socket.on('createRoom', () => {
        socket.join(socket.id)

        if (game.rooms[socket.id]) return false

        game.rooms[socket.id] = {
            name: `${game.players[socket.id].name} Room`,
            player1: socket.id,
            player2: undefined
        }
        game.players[socket.id].room = socket.id

        refreshPlayers()
        refreshRooms()
        sendGlobalMessage(game.players[socket.id], 'Create a Room')
    })

    socket.on('leaveRoom', () => {
        leaveRoom(socket)
        refreshPlayers()
        refreshRooms()
    })

    socket.on('joinRoom', (roomId) => {

        if (game.match[roomId] !== undefined && game.match[roomId].status == 'END') return false

        socket.join(roomId)

        game.players[socket.id].room = socket.id

        const position = game.rooms[roomId].player1 ? '2' : '1'

        game.rooms[roomId][`player${position}`] = socket.id

        game.players[socket.id].room = roomId

        refreshPlayers()
        refreshRooms()
        refreshMatch(roomId)
        sendGlobalMessage(game.players[socket.id], 'Entered a Room')
    })

    socket.on('startMatch', (roomId) => {
        const room = game.rooms[roomId]
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVZ'

        if (room.player1 && room.player2) {
            game.match[roomId] = {
                score1: 0,
                score2: 0,
                status: 'START',
                ready1: false,
                ready2: false,
                letter: alphabet[Math.floor(Math.random() * alphabet.length)],
                start: 0,
                values: {},
                whoSetStop: '',
                next: 0
            }
        }

        const match = game.match[roomId]

        refreshMatch(roomId)
        sendPrivateMessage(null, `Now the letter is: ${match.letter}`, game.players[socket.id].room)
        console.log('START-',match)
    })

    socket.on('setPreStop', (roomId, values) => {
        const match = game.match[roomId]

        if (match.whoSetStop == socket.id) return
        if (match.values.length == 2) return


        match.values[socket.id] = values

        match.start = 'stop'

        if (match.start = 'stop') {
            refreshMatch(roomId)
            refreshPlayers()
            return false
        }

        refreshMatch(roomId)
        refreshPlayers()
    })

    socket.on('setStop', (roomId, values) => {
        const match = game.match[roomId]

        match.start = 'prestop'
        match.whoSetStop = socket.id
        match.values[socket.id] = values

        if (game.rooms[roomId].player1 == socket.id) {
            match.score1 += 5
        } else {
            match.score2 += 5
        }

        refreshMatch(roomId)
        refreshPlayers()

    })

    socket.on('sendPoints', (roomId, values, type) => {
        const player1 = game.rooms[roomId].player1
        const player2 = game.rooms[roomId].player2
        const match = game.match[roomId]

        const matchValues = match.values

        socket.id == player1 ? match.ready1 = type : match.ready2 = type

        match.next++

        if (values.includes(matchValues[player1][type])) {
            match.score1 += 10
        }
        if (values.includes(matchValues[player2][type])) {
            match.score2 += 10
        }

        if (match.score1 >= 120 || match.score2 >= 120) match.start = 'END'

        refreshMatch(roomId)
    })

    socket.on('playAgain', (roomId) => {
        const match = game.match[roomId]
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVZ'

        match.ready1 = false
        match.ready2 = false
        match.start = 0
        match.next = 0
        match.values = {}
        match.letter = alphabet[Math.floor(Math.random() * alphabet.length)]
        match.whoSetStop = ''
        refreshMatch(roomId)
        sendPrivateMessage(null, `Now the letter is: ${match.letter}`, game.players[socket.id].room)

        console.log(match)
    })

})

const sendGlobalMessage = (player, message) => {
    sockets.emit('receiveGlobalMessage', `${player.name}`, `${message}`)
}

const sendPrivateMessage = (player, message, match) => {
    if (player == null) return sockets.emit('receivePrivateMessage', `${match}`, `null`, `${message}`)
    sockets.emit('receivePrivateMessage', `${match}`, `${player.name}`, `${message}`)
}

const refreshPlayers = () => {
    sockets.emit('PlayersRefresh', game.players)
}

const refreshRooms = () => {
    sockets.emit('roomsRefresh', game.rooms)
}

const refreshMatch = (roomId) => {
    sockets.to(roomId).emit('matchRefresh', game.match[roomId])
}

function leaveRoom(socket) {
    const socketId = socket.id

    const roomId = game.players[socketId].room
    const room = game.rooms[roomId]

    if (room) {
        const match = game.match[roomId]

        delete game.players[socketId].room

        if (socketId === room.player1) {
            room.player1 = undefined
            match.start = 'LEAVE'
        } else {
            room.player2 = undefined
            match.start = 'LEAVE'
        }

        if (match) {
            match.start = 'LEAVE'
        }
        if ((room.player1 == undefined) && (room.player2 == undefined)) {
            delete game.rooms[roomId]
            if (match) delete game.match[roomId]
        }

        refreshMatch(roomId)
        socket.leave(roomId)
    }
}


server.listen(PORT, () => {
    console.log(`Server is at http://localhost:${PORT}`)
})