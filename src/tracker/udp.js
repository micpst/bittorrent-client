import crypto from 'crypto';
import dgram from 'dgram';

import * as utility from '../utility.js';

const PROTOCOL_ID = 0x41727101980n;

const ACTION_CONNECT = 0;
const ACTION_ANNOUNCE = 1;
const ACTION_SCRAPE = 2;
const ACTION_ERROR = 3;

const UDP_BASE_TIMEOUT_MS = 15000;
const UDP_MAX_TRIES = 8;

export default class UdpHandler {

    callback;
    connectionExpiration;
    connectionId;
    socket;
    timeoutId;
    torrent;
    transactionId;
    triesCounter = 0;
    url;

    async openConnection(url, torrent, callback) {
        this.socket = dgram.createSocket('udp4')
            .on('message', this.handleMessage.bind(this))
            .on('error', this.handleError.bind(this));

        this.callback = callback;
        this.torrent = torrent;
        this.url = url;

        await this.sendConnectRequest();
    }

    closeConnection(data, error) {
        this.clearTimeout();
        this.socket.close();
        this.callback(data, error);
    }

    async handleMessage(response) {
        this.clearTimeout();

        const action = response.readUInt32BE(0);
        const transactionId = response.readUInt32BE(4);

        if (transactionId !== this.transactionId) {
            this.closeConnection(null, new Error('Received invalid transaction ID from the tracker server'));
            return;
        }

        switch (action) {
            case ACTION_CONNECT:
                const { connectionId } = this.parseConnectionResponse(response);
                this.setConnectionId(connectionId);
                await this.sendAnnounceRequest();
                break;
            case ACTION_ANNOUNCE:
                const announceResponse = this.parseAnnounceResponse(response);
                this.closeConnection(announceResponse, null);
                break;
            case ACTION_SCRAPE:
                break;
            case ACTION_ERROR:
                const message = response.subarray(8).toString();
                this.closeConnection(null, new Error(message));
                break;
            default:
                // Unknown action received from server.
        }
    }

    handleError(error) {
        this.closeConnection(null, new Error(error.message));
    }

    sendData(data) {
        const { hostname, port } = this.url;
        return new Promise((resolve, reject) => {
            this.socket.send(data, 0, data.length, port, hostname, (error) =>
                error ? reject(error) : resolve()
            );
        });
    }

    setTimeout(callback, ...args) {
        if (this.triesCounter <= UDP_MAX_TRIES) {
            const timeout = UDP_BASE_TIMEOUT_MS * 2 ** this.triesCounter++;
            this.timeoutId = setTimeout(callback.bind(this), timeout, ...args);
        }
        else {
            this.handleError(new Error('Tracker server timeout'));
        }
    }

    clearTimeout() {
        clearTimeout(this.timeoutId);
        this.triesCounter = 0;
    }

    generateTransactionId() {
        this.transactionId = crypto.randomBytes(4).readUInt32BE();
    }

    setConnectionId(connectionId) {
        this.connectionId = connectionId;
        this.connectionExpiration = new Date().getTime() + 1.5 * 60 * 1000;
    }

    isConnectionIdValid() {
        const now = new Date().getTime();
        return now <= this.connectionExpiration;
    }

    async sendConnectRequest() {
        try {
            this.generateTransactionId();
            await this.sendData(this.buildConnectionRequest());
            this.setTimeout(this.sendConnectRequest);
        }
        catch (error) {
            this.handleError(error);
        }
    }

    async sendAnnounceRequest() {
        try {
            if (this.isConnectionIdValid()) {
                this.generateTransactionId();
                await this.sendData(this.buildAnnounceRequest());
                this.setTimeout(this.sendAnnounceRequest);
            }
            else {
                await this.sendConnectRequest();
            }
        }
        catch (error) {
            this.handleError(error);
        }
    }

    buildConnectionRequest() {
        const requestBuffer = Buffer.alloc(16);

        requestBuffer.writeBigUInt64BE(PROTOCOL_ID, 0);
        requestBuffer.writeUInt32BE(ACTION_CONNECT, 8);
        requestBuffer.writeUInt32BE(this.transactionId, 12);

        return requestBuffer;
    }

    buildAnnounceRequest(port=6681) {
        const key = crypto.randomBytes(4).readUInt32BE();
        const requestBuffer = Buffer.alloc(98);

        requestBuffer.writeBigUInt64BE(this.connectionId, 0);
        requestBuffer.writeUInt32BE(ACTION_ANNOUNCE, 8);
        requestBuffer.writeUInt32BE(this.transactionId, 12);
        requestBuffer.set(this.torrent.infoHashBuffer, 16);
        requestBuffer.set(utility.generatePeerId(), 36);
        requestBuffer.writeBigUInt64BE(0n, 56);
        requestBuffer.writeBigUInt64BE(this.torrent.length, 64)
        requestBuffer.writeBigUInt64BE(0n, 72);
        requestBuffer.writeUInt32BE(0, 80);
        requestBuffer.writeUInt32BE(0, 84);
        requestBuffer.writeUInt32BE(key, 88);
        requestBuffer.writeInt32BE(-1, 92);
        requestBuffer.writeUInt16BE(port, 96);

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
}
