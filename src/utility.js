import crypto from 'crypto';

let id = null;

export const generatePeerId = () => {
    if (id === null) {
        id = Buffer.alloc(20, '-MP0001-');
        crypto.randomBytes(13).copy(id, 7);
    }
    return id;
}

export const chunk = (iterable, chunkSize) =>
    Array(Math.ceil(iterable.length / chunkSize))
        .map((_, index) => index * chunkSize)
        .map(begin => iterable.subarray(begin, begin + chunkSize));