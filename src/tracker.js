import crypto from 'crypto';
import dgram from 'dgram';

import * as constants from './constants.js';
import * as utility from './utility.js';

export const getPeers = (torrent, callback) => {
    const client = dgram.createSocket('udp4');
    const url = torrent.announce.toString();

    const connectionRequest = getConnectionRequest();
    udpSendMessage(client, connectionRequest, url);

    client.on('message', response => {
        console.log(response)

        if (responseType(response) === 'connect') {
            const { connectionId } = parseConnectionResponse(response);
            const announceRequest = getAnnounceRequest(connectionId);
            udpSendMessage(client, announceRequest, url);

        } else if (responseType(response) === 'announce') {
            const { peers } = parseAnnounceResponse(response);
            callback(peers);
        }
    });
}

const udpSendMessage = (socket, message, url) => {
    const { port, hostname } = new URL(url)
    console.log(port, hostname)
    socket.send(message, 0, message.length, port, hostname);
}

const responseType = response => {
    const action = response.readUInt32BE();
    switch (action) {
        case constants.ACTION_ANNOUNCE:
            return 'announce';
        case constants.ACTION_CONNECT:
            return 'connect';
        default:
            throw new Error('Unknown action field.');
    }
}

const getConnectionRequest = () => {
    const transactionId = crypto.randomBytes(4).readUInt32BE();
    const requestBuffer = Buffer.alloc(16);

    requestBuffer.writeBigUInt64BE(constants.PROTOCOL_ID, 0);
    requestBuffer.writeUInt32BE(constants.ACTION_CONNECT, 8);
    requestBuffer.writeUInt32BE(transactionId, 12);

    return requestBuffer;
}

const parseConnectionResponse = response => ({
    action: response.readUInt32BE(0),
    transactionId: response.readUInt32BE(4),
    connectionId: response.readBigUInt64BE(8)
})

const getAnnounceRequest = (connectionId, torrent, port=6681) => {
    const transactionId = crypto.randomBytes(4).readUInt32BE();
    const key = crypto.randomBytes(4).readUInt32BE();
    const requestBuffer = Buffer.alloc(98);

    requestBuffer.writeBigUInt64BE(connectionId, 0);
    requestBuffer.writeUInt32BE(constants.ACTION_ANNOUNCE, 8);
    requestBuffer.writeUInt32BE(transactionId, 12);
    torrent.infoHashBuffer.copy(requestBuffer, 16);
    utility.generatePeerId().copy(requestBuffer, 36);
    requestBuffer.writeBigUInt64BE(0n, 56);
    requestBuffer.writeBigUInt64BE(torrent.length, 64)
    requestBuffer.writeBigUInt64BE(0n, 72);
    requestBuffer.writeUInt32BE(0, 80);
    requestBuffer.writeUInt32BE(0, 84);
    requestBuffer.writeUInt32BE(key, 88);
    requestBuffer.writeInt32BE(-1, 92);
    requestBuffer.writeUInt16BE(port, 96);

    return requestBuffer;
}

const parseAnnounceResponse = response => ({
    action: response.readUInt32BE(0),
    transactionId: response.readUInt32BE(4),
    leechers: response.readUInt32BE(8),
    seeders: response.readUInt32BE(12),
    peers: utility.chunk(response.subarray(20), 6)
        .map(address => ({
            ip: address.subarray(0, 4).join('.'),
            port: address.readUInt16BE(4)
        }))
})
