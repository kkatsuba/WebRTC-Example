const HTTPS_PORT = 8443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// ----------------------------------------------------------------------------------------

const handleRequest = function(request, response) {
    console.log('request received: ' + request.url);

    if (request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream('client/index.html').pipe(response);
    } else if (request.url === '/webrtc.js') {
        response.writeHead(200, { 'Content-Type': 'application/javascript' });
        fs.createReadStream('client/webrtc.js').pipe(response);
    }
};

const httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`Server running: https://localhost:${HTTPS_PORT}`);
});

// ----------------------------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpsServer });

wss.on('connection', function(ws, req) {
    ws.on('message', function(message, ...d) {
        console.log('received: %s', message);
        wss.broadcast(message);
    });

    ws.on('error', console.log);
});

wss.broadcast = function(data) {
    this.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};
