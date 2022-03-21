import crypto from 'crypto';
import dgram from 'dgram';
import { Buffer } from 'buffer';
import { urlParse } from 'url';

function getPeers(torrent, callback) {
    const socket = dgram.createSocket('udp4');
    const url = torrent.announce.toString('utf8');

    const connectionRequest = getConnectionRequest();
    udpSendMessage(socket, connectionRequest, url);

    socket.on('message', response => {
        if (responseType(response) === 'connect') {
            const { connectionId } = parseConnectionResponse(response);
            const announceRequest = getAnnounceRequest(connectionId);
            udpSendMessage(socket, announceRequest, url);

        } else if (responseType(response) === 'announce') {
            const { peers } = parseAnnounceResponse(response);
            callback(peers);
        }
    });
}

function udpSendMessage(socket, message, url, callback=()=>{}) {
    const { port, host } = urlParse(url);
    socket.send(message, 0, message.length, port, host, callback);
}

function responseType(response) {
    // ...
};

function getConnectionRequest() {
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(0x00000417, 0);
    buf.writeUInt32BE(0x27101980, 4);
    buf.writeUInt32BE(0x00000000, 8);
    buf.writeUInt32BE(crypto.randomBytes(4).readUInt32BE(), 12);
    return buf;
}

function parseConnectionResponse(response) {
    return {
        action: response.readUInt32BE(0),
        transactionId: response.readUInt32BE(4),
        connectionId: response.slice(8)
    }
}

function getAnnounceRequest(connectionId) {
    // ...
}

function parseAnnounceResponse(response) {
    // ...
}

export { getPeers };
