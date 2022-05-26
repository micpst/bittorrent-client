import net from 'net';
import EventEmitter from 'events';

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


export default class Peer extends EventEmitter {

    socket = new net.Socket();
    data = Buffer.alloc(0);
    handshake = false;
    active = false;
    choked = true;
    bitfield = [];
    ip;
    port;
    config;
    metadata;
    pieceManager;

    constructor(ip, port, config, metadata, pieceManger) {
        super();
        this.ip = ip;
        this.port = port
        this.config = config;
        this.metadata = metadata;
        this.pieceManager = pieceManger;

        this.socket.on('connect', this.handleConnect.bind(this))
        this.socket.on('data', this.handleData.bind(this))
        this.socket.on('end', this.handleEnd.bind(this))
        this.socket.on('error', this.handleError.bind(this))
        this.socket.on('timeout', this.handleTimeout.bind(this));
    }

    connect() {
        this.socket.connect(this.port, this.ip);
        this.socket.setTimeout(30000);
    }

    close() {
        this.socket.end();
    }

    handleConnect() {
        const handshakeMessage = new Handshake({
            infoHash: this.metadata.infoHashBuffer,
            peerId: this.config.peerId
        });
        this.socket.write(handshakeMessage.serialize());
        this.active = true;
    }

    handleData(data) {
        this.data = Buffer.concat([this.data, data]);

        const messageLength = () => this.handshake ?
            this.data.readUInt32BE(0) + 4 :
            this.data.readUInt8(0) + 49;

        while (this.data.length >= 4 && this.data.length >= messageLength()) {
            const message = this.data.subarray(0, messageLength());
            this.data = this.data.subarray(messageLength());

            if (!this.handshake) this.handleHandshake(message);
            else this.handleMessage(message);
        }
    }

    handleEnd() {
        this.active = false;
    }

    handleError(error) {
        console.log(`[ERROR_PEER] ${error.message}`);
        this.socket.end();
    }

    handleTimeout() {
        console.log(`[ERROR_PEER] Peer socket timeout`);
        this.socket.end();
    }

    handleHandshake(messageBuffer) {
        const handshakeMessage = Handshake.deserialize(messageBuffer);
        if (handshakeMessage.pstr === 'BitTorrent protocol' &&
            handshakeMessage.infoHash !== null &&
            handshakeMessage.infoHash.toString('hex') === this.metadata.infoHash
        ) {
            const interestedMessage = new Message(MESSAGE_INTERESTED_ID);
            this.socket.write(interestedMessage.serialize());
            this.handshake = true;
        }
        else {
            this.handleError(new Error('Handshake error'));
        }
    }

    handleMessage(messageBuffer) {
        const message = Message.deserialize(messageBuffer);
        switch (message.id) {
            case MESSAGE_CHOKE_ID:
                return this.onChokeMessage(message);
            case MESSAGE_UNCHOKE_ID:
                return this.onUnchokeMessage(message);
            case MESSAGE_HAVE_ID:
                return this.onHaveMessage(message);
            case MESSAGE_BITFIELD_ID:
                return this.onBitfieldMessage(message);
            case MESSAGE_PIECE_ID:
                return this.onPieceMessage(message);
        }
    }

    onChokeMessage(message) {
        this.choked = true;
        this.socket.end();
    }

    onUnchokeMessage(message) {
        this.choked = false;
        this.sendPieceRequest();
    }

    onHaveMessage(message) {
        const { index } = message.parseHave();
        this.bitfield.push(...this.metadata.getPieceBlocks(index));
        if (this.bitfield.length === 1) {
            this.sendPieceRequest();
        }
    }

    onBitfieldMessage(message) {
        const { bitfield } = message.parseBitfield();
        bitfield.forEach(index => this.bitfield.push(...this.metadata.getPieceBlocks(index)));
        // console.log(this.bitfield)
        if (this.bitfield.length === bitfield.length) {
            this.sendPieceRequest();
        }
    }

    onPieceMessage(message) {
        // console.log(message.parsePiece())
        this.emit('piece', message.parsePiece());
        if (!this.pieceManager.isDone()) {
            this.sendPieceRequest();
        }
    }

    sendPieceRequest() {
        if (this.choked) {
            return;
        }
        while (this.bitfield.length) {
            const pieceBlock = this.bitfield.shift();
            if (this.pieceManager.needed(pieceBlock)) {
                this.socket.write(Message.buildRequest(pieceBlock).serialize());
                this.pieceManager.addRequested(pieceBlock);
                break;
            }
        }
    }
}
