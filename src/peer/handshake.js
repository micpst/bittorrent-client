export default class Handshake {

    pstr;
    infoHash;
    peerId;

    constructor({ pstr, infoHash, peerId }) {
        this.pstr = pstr || 'BitTorrent protocol';
        this.infoHash = infoHash || null;
        this.peerId = peerId || null;
    }

    serialize() {
        const messageBuffer = Buffer.alloc(68);

        messageBuffer.writeUInt8(this.pstr.length, 0);
        messageBuffer.write(this.pstr, 1, 20);
        messageBuffer.writeBigUInt64BE(0n, 20);

        this.infoHash && messageBuffer.set(this.infoHash, 28);
        this.peerId && messageBuffer.set(this.peerId, 48);

        return messageBuffer;
    }

    static deserialize(data) {
        const pstrlen = (data.length > 0) ? data.readUInt8(0) : 0;
        const pstr = data.toString('utf8', 1, 1 + pstrlen);

        const infoHash = (data.length > 47) ? data.subarray(28, 48) : null;
        const peerId = (data.length > 48) ? data.subarray(48) : null;

        return new Handshake({ pstr, infoHash, peerId });
    }
}
