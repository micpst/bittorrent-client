import crypto from 'crypto';

let id = null;

export const generatePeerId = () => {
    if (id !== null)
        return id;
    const newId = Buffer.alloc(20, '-MP0001-');
    crypto.randomBytes(13).copy(newId, 7);
    return newId;
}

export const chunk = (iterable, chunkSize) =>
    Array(Math.ceil(iterable.length / chunkSize))
        .map((_, index) => index * chunkSize)
        .map(begin => iterable.subarray(begin, begin + chunkSize));