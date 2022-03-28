import crypto from 'crypto';
import fs from 'fs';

import bencode from 'bencode';
import magnet from 'magnet-uri';

export const open = torrentId => {
    if (torrentId.startsWith('magnet:')) {
        return decodeMagnetUri(torrentId);
    }
    if (torrentId.endsWith('.torrent')) {
        return decodeTorrentFile(torrentId);
    }
}

const ensure = (boolean, fieldName) => {
    if (!boolean)
        throw new Error(`Torrent is missing required field: ${fieldName}`);
}

const getInfoHash = (torrent, encoding) =>
    crypto.createHash('sha1').update(bencode.encode(torrent.info)).digest(encoding);

const getInfoName = torrent =>
    torrent.info.name.toString();

const getAnnounce = torrent => {
    const announce = [];
    if (Array.isArray(torrent['announce-list']) && torrent['announce-list'].length) {
        torrent['announce-list'].forEach(urls => urls.forEach(url => announce.push(url.toString())));
    }
    else if (torrent.announce) {
        announce.push(torrent.announce.toString());
    }
    return announce;
}

const getInfoLength = torrent =>
    torrent.info.files
        ? torrent.info.files.map(file => BigInt(file.length)).reduce((sum, len) => sum + len)
        : BigInt(torrent.info.length);

const decodeMagnetUri = uri => {
    const torrentObject = magnet.decode(uri);
    ensure(torrentObject['infoHash'], 'infoHash');
    return torrentObject;
}

const decodeTorrentFile = filename => {
    const result = {};
    const torrentObject = bencode.decode(fs.readFileSync(filename));

    ensure(torrentObject['info'], 'info');
    ensure(torrentObject['info']['name'], 'info.name');
    ensure(torrentObject['info']['piece length'], 'info.pieceLength');
    ensure(torrentObject['info']['pieces'], 'info.pieces');

    result.announce = getAnnounce(torrentObject);
    result.infoHash = getInfoHash(torrentObject, 'hex');
    result.infoHashBuffer = getInfoHash(torrentObject);
    result.length = getInfoLength(torrentObject);
    result.name = getInfoName(torrentObject);

    return result;
}
