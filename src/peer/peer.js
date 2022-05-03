import net from 'net';
import Handshake from './handshake.js';
import {
    Message,
    MESSAGE_BITFIELD_ID,
    MESSAGE_CHOKE_ID,
    MESSAGE_HAVE_ID,
    MESSAGE_INTERESTED_ID,
    MESSAGE_PIECE_ID,
    MESSAGE_UNCHOKE_ID
} from './message.js';

export default class Peer {

    config;
    data = Buffer.alloc(0);
    handshake = false;
    ip;
    metadata;
    port;
    socket;

    constructor(ip, port, metadata, config) {
        this.ip = ip;
        this.port = port
        this.config = config;
        this.metadata = metadata;
        this.socket = net.createConnection(this.port, this.ip)
            .on('connect', this.handleConnect.bind(this))
            .on('data', this.handleData.bind(this))
            .on('end', this.handleEnd.bind(this))
            .on('error', this.handleError.bind(this));
    }

    handleConnect() {
        const handshakeMessage = new Handshake({
            infoHash: this.metadata.infoHashBuffer,
            peerId: this.config.peerId
        });
        this.socket.write(handshakeMessage.serialize());
    }

    handleData(data) {
        this.data = Buffer.concat([this.data, data]);

        const messageLength = () => this.handshake ?
            this.data.readUInt32BE(0) + 4 :
            this.data.readUInt8(0) + 49;

        while (this.data.length >= 4 && this.data.length >= messageLength()) {
            const message = this.data.subarray(0, messageLength());
            this.data = this.data.subarray(messageLength());
            this.handleMessage(message);
        }
    }

    handleEnd() {

    }

    handleError(error) {
        console.log(`[ERROR_PEER] ${error.message}`);
    }

    handleMessage(messageBuffer) {
        if (!this.handshake) {
            const handshakeMessage = Handshake.deserialize(messageBuffer);
            if (handshakeMessage.pstr === 'BitTorrent protocol' &&
                handshakeMessage.infoHash !== null &&
                handshakeMessage.infoHash.toString('hex') === this.metadata.infoHash
            ) {
                const interestedMessage = new Message(MESSAGE_INTERESTED_ID);
                this.socket.write(interestedMessage.serialize());
                this.handshake = true;
            }
        }
        else {
            const message = Message.deserialize(messageBuffer)
            console.log(`${this.ip}:${this.port}`, message);
            switch (message.id) {
                case MESSAGE_CHOKE_ID:

                case MESSAGE_UNCHOKE_ID:

                case MESSAGE_HAVE_ID:

                case MESSAGE_BITFIELD_ID:

                case MESSAGE_PIECE_ID:

            }
        }
    }
}