
if (process.argv.length < 3) {
    console.log(
        'Usage: \n' +
        'node stream-server.js <secret> [<stream-port> <websocket-port>]'
    );
    process.exit();
}

var STREAM_SECRET = process.argv[2],
    STREAM_PORT = process.argv[3] || 8082,
    WEBSOCKET_PORT = process.argv[4] || 8084,
    STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes

var width = 320,
    height = 240;

// Websocket Server
var socketServer = new (require('ws').Server)({
    port: WEBSOCKET_PORT
});
socketServer.on('connection', function(socket) {
    // Send magic bytes and video size to the newly connected socket
    // struct { char magic[4]; unsigned short width, height;}
    var streamHeader = new Buffer(8);
    streamHeader.write(STREAM_MAGIC_BYTES);
    streamHeader.writeUInt16BE(width, 4);
    streamHeader.writeUInt16BE(height, 6);
    socket.send(streamHeader, {
        binary: true
    });

    console.log('New WebSocket Connection (' + socketServer.clients.length + ' total)');

    socket.on('close', function(code, message) {
        console.log('Disconnected WebSocket (' + socketServer.clients.length + ' total)');
    });
});

socketServer.broadcast = function(data, opts) {
    for (var i in this.clients) {
        if (this.clients[i].readyState == 1) {
            this.clients[i].send(data, opts);
        } else {
            console.log('Error: Client (' + i + ') not connected.');
        }
    }
};


// HTTP Server to accept incomming MPEG Stream
var streamServer = require('http').createServer(function(request, response) {
    var params = request.url.substr(1).split('/');

    if (params[0] == STREAM_SECRET) {
        width = (params[1] || 320) | 0;
        height = (params[2] || 240) | 0;

        console.log(
            'Stream Connected: ' + request.socket.remoteAddress +
            ':' + request.socket.remotePort + ' size: ' + width + 'x' + height
        );
        request.on('data', function(data) {
            socketServer.broadcast(data, {
                binary: true
            });
        });
    } else {
        console.log(
            'Failed Stream Connection: ' + request.socket.remoteAddress +
            request.socket.remotePort + ' - wrong secret.'
        );
        response.end();
    }
}).listen(STREAM_PORT);

console.log('Listening for MPEG Stream on http://127.0.0.1:' + STREAM_PORT + '/<secret>/<width>/<height>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:' + WEBSOCKET_PORT + '/');

express = require('express');
request = require('request');
// var hue = require('hue-module');

// hue.discover(function(e) {
//     console.log(e)
// });
// hue.load("192.168.178.19", "174fb5a039dabc8f3b1a51f02a78ec7f");
var hueUrl = "http://192.168.178.19/api/174fb5a039dabc8f3b1a51f02a78ec7f/lights/1/state";

app = express();
ws = require('websocket.io');
app.use(express["static"]('./'));


lightOn = true;

server = app.listen(5002);

console.log('started fileserver');

io = ws.attach(server);

io.on('connection', function(socket) {
    return socket.on('message', function(data) {
        var i, len, msg, ref, results, sock;
        msg = JSON.parse(data);
        switch (msg.type) {
            case 'lights':
                if (msg.data == 'on') {
                    console.log("Turn light on with bri=" + msg.bri);
                    request({
                        url: hueUrl,
                        method: 'PUT',
                        json: {
                            "on": true,
                            "bri": parseInt(msg.bri)
                        }
                    }, function(e) {
                            console.log(e);
                        })
                // hue.light(1, function(light) {
                //     hue.change(light.set({
                //         "on": true,
                //         "bri": msg.data.bri
                //     }));
                // });
                } else if (msg.data == 'off') {
                    console.log("Turn light off");
                    request({
                        url: hueUrl,
                        method: 'PUT',
                        json: {
                            "on": false
                        }
                    }, function(e) {
                            console.log(e);
                        })
                }

                break;
        }
    });
});


