const HTTPS_PORT = 8443;

const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const app = express();

const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`Server running: https://localhost:${HTTPS_PORT}`);
});

app.use(express.static(path.join(__dirname, '../client')));
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const io = require('socket.io')(httpsServer);

io.on('connection', socket => {
    console.log('connected');
    socket.on('message', message => {
        console.log('recieved', message);
        io.emit('message', message);
    });

    socket.on('error', console.log);
});
