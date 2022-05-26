// Message ids:
export const MESSAGE_CHOKE_ID = 0;
export const MESSAGE_UNCHOKE_ID = 1;
export const MESSAGE_INTERESTED_ID = 2;
export const MESSAGE_NOT_INTERESTED_ID = 3;
export const MESSAGE_HAVE_ID = 4;
export const MESSAGE_BITFIELD_ID = 5;
export const MESSAGE_REQUEST_ID = 6;
export const MESSAGE_PIECE_ID = 7;
export const MESSAGE_CANCEL_ID = 8;

export class Message {

    id;
    payload;

    constructor(id = null, payload = null) {
        this.id = id;
        this.payload = payload;
    }

    serialize() {
        const messageLength = (this.payload?.length || 0) + !!this.id;
        const messageBuffer = Buffer.alloc(4 + messageLength);

        messageBuffer.writeUInt32BE(messageLength, 0);

        this.id && messageBuffer.writeUInt8(this.id, 4);
        this.payload && messageBuffer.set(this.payload, 5);

        return messageBuffer;
    }

    static deserialize(data) {
        const id = (data.length > 4) ? data.readInt8(4) : null;
        const payload = (data.length > 5) ? data.subarray(5) : null;
        return new Message(id, payload);
    }

    static buildRequest(index, begin, length) {
        const payload = Buffer.alloc(12);

        payload.writeUInt32BE(0, index);
        payload.writeUInt32BE(4, begin);
        payload.writeUInt32BE(8, length);

        return new Message(MESSAGE_REQUEST_ID, payload);
    }

    parseHave() {
        if (this.id !== MESSAGE_HAVE_ID || this.payload.length !== 4) {
            return { index: null };
        }
        const index = this.payload.readUInt32BE(0);
        return { index };
    }

    parseBitfield() {
        if (this.id !== MESSAGE_BITFIELD_ID) {
            return { index: null, bitfield: null };
        }
        const bitfield = [];
        this.payload.forEach((byte, i) => {
            for (let j = 0; j < 8; j++) {
                if (byte % 2) {
                    bitfield.push(i * 8 + 7 - j);
                }
                byte = Math.floor(byte / 2);
            }
        });
        return { bitfield };
    }

    parsePiece() {
        if (this.id !== MESSAGE_PIECE_ID || this.payload.length < 8) {
            return { index: null, begin: null, block: null };
        }
        const index = this.payload.readUInt32BE(0);
        const begin = this.payload.readUInt32BE(4);
        const block = this.payload.subarray(8);

        return { index, begin, block };
    }
}
