import crypto from 'crypto';
import fs from 'fs';
import bencode from 'bencode';

export const open = filepath =>
    bencode.decode(fs.readFileSync(filepath));

export const size = torrent =>
    torrent.info.files ?
        torrent.info.files
            .map(file => BigInt(file.length))
            .reduce((a, b) => a + b) :
        BigInt(torrent.info.length);

export const infoHash = torrent =>
    crypto
        .createHash('sha1')
        .update(bencode.encode(torrent.info))
        .digest();
