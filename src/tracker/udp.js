import crypto from 'crypto';
import dgram from 'dgram';

import * as utility from '../utility.js';

const UDP_PROTOCOL_ID = 0x41727101980n;

const UDP_ACTION_CONNECT = 0;
const UDP_ACTION_ANNOUNCE = 1;
const UDP_ACTION_SCRAPE = 2;
const UDP_ACTION_ERROR = 3;

const UDP_BASE_TIMEOUT_MS = 15000;
const UDP_MAX_TRIES = 0; // Should be 8, set to 0 for speed

export default class UdpHandler {

    callback;
    config;
    connectionExpiration;
    connectionId;
    metadata;
    socket;
    timeoutId;
    transactionId;
    triesCounter = 0;
    url;

    handleConnection(url, config, metadata, callback) {
        this.callback = callback;
        this.config = config;
        this.metadata = metadata;
        this.url = url;
        this.socket = dgram.createSocket('udp4')
            .on('message', this.handleMessage.bind(this))
            .on('error', this.handleError.bind(this));

        this.sendAnnounceRequest();
    }

    closeConnection(data, error) {
        this.clearTimeout();
        this.socket.close();
        this.callback(data, error);
    }

    sendAnnounceRequest() {
        this.generateTransactionId();
        const request = this.isConnectionIdValid() ?
            this.buildAnnounceRequest() :
            this.buildConnectionRequest();

        this.sendData(request)
            .then(() => this.setTimeout(this.sendAnnounceRequest))
            .catch(error => this.handleError(error));
    }

    handleMessage(response) {
        this.clearTimeout();

        const action = response.readUInt32BE(0);
        const transactionId = response.readUInt32BE(4);

        if (transactionId !== this.transactionId) {
            this.handleError(new Error('Received invalid transaction ID from the server'));
        }
        else {
            switch (action) {
                case UDP_ACTION_CONNECT:
                    const { connectionId } = this.parseConnectionResponse(response);
                    this.updateConnectionId(connectionId);
                    this.sendAnnounceRequest();
                    break;
                case UDP_ACTION_ANNOUNCE:
                    const announceResponse = this.parseAnnounceResponse(response);
                    this.handleResponse(announceResponse);
                    break;
                case UDP_ACTION_SCRAPE:
                    this.handleError(new Error('Scrape action is not supported'));
                    break;
                case UDP_ACTION_ERROR:
                    const { message } = this.parseErrorResponse(response);
                    this.handleError(new Error(message));
                    break;
                default:
                    this.handleError(new Error('Unknown action received from server'));
            }
        }
    }

    handleError(error) {
        this.closeConnection(null, error);
    }

    handleResponse(data) {
        this.closeConnection(data, null);
    }

    sendData(data) {
        const { hostname, port } = this.url;
        return new Promise((resolve, reject) => {
            this.socket.send(data, 0, data.length, port, hostname, error => error ? reject(error) : resolve());
        });
    }

    setTimeout(callback) {
        if (this.triesCounter > UDP_MAX_TRIES) {
            throw new Error('Server timeout');
        }
        const timeout = UDP_BASE_TIMEOUT_MS * 2 ** this.triesCounter++;
        this.timeoutId = setTimeout(callback.bind(this), timeout);
    }

    clearTimeout() {
        clearTimeout(this.timeoutId);
        this.triesCounter = 0;
    }

    generateTransactionId() {
        this.transactionId = crypto.randomBytes(4).readUInt32BE();
    }

    updateConnectionId(connectionId) {
        this.connectionId = connectionId;
        this.connectionExpiration = new Date().getTime() + 1.5 * 60 * 1000;
    }

    isConnectionIdValid() {
        const now = new Date().getTime();
        return now <= this.connectionExpiration;
    }

    buildConnectionRequest() {
        const requestBuffer = Buffer.alloc(16);

        requestBuffer.writeBigUInt64BE(UDP_PROTOCOL_ID, 0);
        requestBuffer.writeUInt32BE(UDP_ACTION_CONNECT, 8);
        requestBuffer.writeUInt32BE(this.transactionId, 12);

        return requestBuffer;
    }

    buildAnnounceRequest() {
        const key = crypto.randomBytes(4).readUInt32BE();
        const requestBuffer = Buffer.alloc(98);

        requestBuffer.writeBigUInt64BE(this.connectionId, 0);
        requestBuffer.writeUInt32BE(UDP_ACTION_ANNOUNCE, 8);
        requestBuffer.writeUInt32BE(this.transactionId, 12);
        requestBuffer.set(this.metadata.infoHashBuffer, 16);
        requestBuffer.set(this.config.peerId, 36);
        requestBuffer.writeBigUInt64BE(0n, 56);
        requestBuffer.writeBigUInt64BE(this.metadata.infoLength, 64)
        requestBuffer.writeBigUInt64BE(0n, 72);
        requestBuffer.writeUInt32BE(0, 80);
        requestBuffer.writeUInt32BE(0, 84);
        requestBuffer.writeUInt32BE(key, 88);
        requestBuffer.writeInt32BE(-1, 92);
        requestBuffer.writeUInt16BE(this.config.port, 96);

        return requestBuffer;
    }

    parseConnectionResponse(response) {
        return {
            action: response.readUInt32BE(0),
            transactionId: response.readUInt32BE(4),
            connectionId: response.readBigUInt64BE(8)
        };
    }

    parseAnnounceResponse(response) {
        return {
            action: response.readUInt32BE(0),
            transactionId: response.readUInt32BE(4),
            interval: response.readUInt32BE(8),
            leechers: response.readUInt32BE(12),
            seeders: response.readUInt32BE(16),
            peers: utility.chunk(response.subarray(20), 6)
                .map(address => ({
                    ip: address.subarray(0, 4).join('.'),
                    port: address.readUInt16BE(4)
                }))
        };
    }

    parseErrorResponse(response) {
        return {
            action: response.readUInt32BE(0),
            transactionId: response.readUInt32BE(4),
            message: response.subarray(8).toString()
        };
    }
}
