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

    static deserialize(data) {
        const id = (data.length > 4) ? data.readInt8(4) : null;
        const payload = (data.length > 5) ? data.subarray(5) : null;
        return new Message(id, payload);
    }

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
}
