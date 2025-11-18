//app.js

const express = require('express');
const bodyParser = require('body-parser'); 
const sequelize = require('./util/database');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const cron = require('node-cron');

const User = require('./model/user');
const Message = require('./model/chat');
const Group = require('./model/group');
const UserGroup = require('./model/UserGroup');
const GroupFiles = require('./model/GroupFiles');
const ArchievedMessage = require('./model/ArchievedChat');

const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');
const adminRoutes = require('./routes/admin');
const fileRoutes = require('./routes/group-files');

var cors = require('cors');
const app = express();
const server = http.createServer(app);   // create a server instance
//const io = socketio(server);         // initialize socket.io
const multer = require('multer');
const upload = multer();

require('dotenv').config({ path: './.env' });

const io = socketio(server, {
    path: '/socket.io',  // Optional: Set path explicitly to avoid issues
    cors: {
        origin: (process.env.API_URL || 'http://localhost:3000') ,  // Set your frontend URL here from the .env file
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type'],
    },
    transports: ['websocket', 'polling']  // Ensure these transports are enabled
});

app.use(bodyParser.json());   // bodyParser.json is used to parse incoming HTTP request bodies that are in JSON format
app.use(bodyParser.urlencoded({extended: true}));  //entend: true => precises that the req.body object will contain values of any type instead of just strings
//The extended option allows to choose between parsing the URL-encoded data with the querystring library (when false ) or the qs library (when true ).

// app.use(cors({
//     origin: process.env.API_URL, // Frontend URL
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//     credentials: true
// }));

//app.options('*', cors());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    console.log('Serving API config');
    res.json({ apiUrl: process.env.API_URL || 'http://localhost:3000' });
});

// app.use(express.static('public', { 
//     dotfiles: 'ignore', 
//     index: false,
//     extensions: ['html', 'htm'] 
//   }));/

app.get('/', (req, res) => {
    console.log('Serving login page');
    res.sendFile(__dirname + '/public/login.html'); // Adjust the path if your file is located elsewhere
});

app.use((req, res, next) => {
    req.io = io; // Make io available to all routes
    next();
});  
app.use('/user',userRoutes);
app.use('/message',chatRoutes);
app.use('/group',groupRoutes);
app.use('/admin',adminRoutes);
app.use('/file', upload.single('myfile'),fileRoutes);  //single method is used when we want to handle the upload of a single file

User.belongsToMany(Group, { through: UserGroup }); //association means that a Many-To-Many relationship exists between User and Group
Group.belongsToMany(User, { through: UserGroup });

User.hasMany(Message);
Message.belongsTo(User);

Group.hasMany(Message);
Message.belongsTo(Group);

Group.hasMany(GroupFiles);

User.hasMany(ArchievedMessage);
Group.hasMany(ArchievedMessage);

const PORT = process.env.PORT || 3000;

sequelize.sync()   // is a way to sync your sequelize model with your database table
.then(()=>{        // force: true => recreate the database table , drop the existing ones
    server.listen(PORT,()=>{
        console.log('server is listening');
    })

    let onlineUsers = {};
    // When a user connects to the server, this function is called
    io.on('connection',(socket) => {
        console.log('user connected');

        // Listen for a 'joinRoom' event from the connected client
        socket.on('joinRoom', (groupId) =>{              // When a 'joinRoom' event is received, this function is called

            console.log('joining room:', groupId);
            socket.join(groupId);                        // Join a specific room using the groupId provided

            // Initialize if needed
            if (!onlineUsers[groupId]) {
                onlineUsers[groupId] = new Set();
            }
            onlineUsers[groupId].add(socket.id);

            // Broadcast updated online count
            io.to(groupId).emit('updateOnlineCount', onlineUsers[groupId].size);
        });

          // Leave room
        socket.on('leaveRoom', (groupId) => {
            console.log(`Socket ${socket.id} leaving room: ${groupId}`);
            socket.leave(groupId);
            
            // Clear the current room tracking
            if (socket.currentRoom === groupId) {
            socket.currentRoom = null;
            }
            
            if (onlineUsers[groupId]) {
                onlineUsers[groupId].delete(socket.id);
                io.to(groupId).emit('updateOnlineCount', onlineUsers[groupId].size);
            }
        });
        
        socket.on('message', (msg) => {

            console.log('groupId :', msg.groupId);
            console.log('Received message:', msg.message);
            // Broadcast the message to all clients in the same room
            io.to(msg.groupId).emit('receivedMsg', msg);
            
        });
        
        socket.on('disconnect',()=>{
            console.log('user disconnected');
            const groupId = socket.currentRoom;
            if (groupId && onlineUsers[groupId]) {
                onlineUsers[groupId].delete(socket.id);
                io.to(groupId).emit('updateOnlineCount', onlineUsers[groupId].size);
            }
        });
    })

    //'0 0' represents midnight.
    cron.schedule('0 0 * * *', async () => { // sets up a cron job that runs once a day at midnight (0 0 * * *) using the 'node-cron' library.
        try {
            
            const chats = await Message.findAll();
            console.log('chats *********',chats);

            for (const chat of chats) {
                await ArchievedMessage.create({ groupId: chat.groupId, userId: chat.userId, message: chat.message });
                console.log('id hai yaar',chat.id)
                await Message.destroy({where:{id:chat.id}}) // Delete the original message from the 'Message' table
            }

            console.log('Running cron job...');
            
        } catch (error) {
            console.error('Error occurred while processing chats:', error);
        }
    });
})
.catch(err=>{
    console.log(err);
})
