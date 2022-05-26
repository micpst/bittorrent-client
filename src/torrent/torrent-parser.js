import crypto from 'crypto';
import fs from 'fs';
import bencode from 'bencode';


export const BLOCK_LENGTH = 2 ** 14;

export default class TorrentMetadata {

    announce = [];
    infoHash;
    infoHashBuffer;
    infoName;
    infoLength;
    infoPieceLength;
    infoPieces;

    constructor(torrentId) {
        if (torrentId.endsWith('.torrent')) {
            this.decodeTorrentFile(torrentId);
        }
        else {
            throw new Error('Unsupported torrent file extension')
        }
    }

    decodeTorrentFile(filename) {
        const torrentObject = bencode.decode(fs.readFileSync(filename));
        this.extractAnnounce(torrentObject);
        this.extractInfoHash(torrentObject);
        this.extractInfoName(torrentObject);
        this.extractInfoLength(torrentObject);
        this.extractPieceLength(torrentObject);
        this.infoPieces = torrentObject.info.pieces;
    }

    extractAnnounce(torrent) {
        if (Array.isArray(torrent['announce-list'])) {
            torrent['announce-list'].forEach(urls => urls.forEach(url => this.announce.push(url.toString())));
        }
        else if (torrent.announce) {
            this.announce.push(torrent.announce.toString());
        }
    }

    extractInfoHash(torrent) {
        this.infoHash = crypto.createHash('sha1').update(bencode.encode(torrent.info)).digest('hex');
        this.infoHashBuffer = crypto.createHash('sha1').update(bencode.encode(torrent.info)).digest();
    }

    extractInfoName(torrent) {
        this.infoName = torrent.info.name.toString();
    }

    extractInfoLength(torrent) {
        this.infoLength = torrent.info.files
            ? torrent.info.files.map(file => BigInt(file.length)).reduce((sum, len) => sum + len)
            : BigInt(torrent.info.length);
    }

    extractPieceLength(torrent) {
        this.infoPieceLength = torrent['info']['piece length'];
    }

    getPieceLength(pieceIndex) {
        const lastPieceLength = Number(this.infoLength) % this.infoPieceLength;
        const lastPieceIndex = Math.floor(Number(this.infoLength) / this.infoPieceLength);
        return (pieceIndex === lastPieceIndex) ? lastPieceLength : this.infoPieceLength;
    }

    getPieceBlockLength(pieceIndex, blockIndex) {
        const pieceLength = this.getPieceLength(pieceIndex);
        const lastPieceLength = pieceLength % BLOCK_LENGTH;
        const lastPieceIndex = Math.floor(pieceLength / BLOCK_LENGTH);
        return (blockIndex === lastPieceIndex) ? lastPieceLength : BLOCK_LENGTH;
    }

    getBlocksPerPiece(pieceIndex) {
        return Math.ceil(this.getPieceLength(pieceIndex) / BLOCK_LENGTH);
    }

    getPieceBlocks(pieceIndex) {
        const length = this.getBlocksPerPiece(pieceIndex);
        return Array.from({ length }, (_, i) => ({
            index: pieceIndex,
            begin: i * BLOCK_LENGTH,
            length: this.getPieceBlockLength(pieceIndex, i)
        }));
    }
}
