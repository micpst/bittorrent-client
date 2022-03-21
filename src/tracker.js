import crypto from 'crypto';
import dgram from 'dgram';
import { urlParse } from 'url';

import * as constants from './constants';

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
    const transactionId = crypto.randomBytes(4).readUInt32BE();
    const requestBuffer = Buffer.alloc(16);

    requestBuffer.writeBigUInt64BE(constants.PROTOCOL_ID, 0);
    requestBuffer.writeUInt32BE(constants.ACTION_CONNECT, 8);
    requestBuffer.writeUInt32BE(transactionId, 12);

    return requestBuffer;
}

function parseConnectionResponse(response) {
    return {
        action: response.readUInt32BE(0),
        transactionId: response.readUInt32BE(4),
        connectionId: response.readBigUInt64BE(8)
    }
}

function getAnnounceRequest(connectionId) {
    // ...
}

function parseAnnounceResponse(response) {
    // ...
}

export { getPeers };
