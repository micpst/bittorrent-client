import { BLOCK_LENGTH } from './torrent-parser.js';


export default class PieceManager {

    requested = [];
    received = [];

    constructor(metadata) {
        function buildPiecesArray() {
            const nPieces = metadata.infoPieceLength / 20;
            const arr = new Array(nPieces).fill(null);
            return arr.map((_, i) => new Array(metadata.getBlocksPerPiece(i)).fill(false));
        }

        this.requested = buildPiecesArray();
        this.received = buildPiecesArray();
    }

    addRequested(pieceBlock) {
        const blockIndex = pieceBlock.begin / BLOCK_LENGTH;
        this.requested[pieceBlock.index][blockIndex] = true;
    }

    addReceived(pieceBlock) {
        const blockIndex = pieceBlock.begin / BLOCK_LENGTH;
        this.received[pieceBlock.index][blockIndex] = true;
    }

    needed(pieceBlock) {
        if (this.requested.every(blocks => blocks.every(Boolean))) {
            this.requested = this.received.map(blocks => blocks.slice());
        }
        const blockIndex = pieceBlock.begin / BLOCK_LENGTH;
        return !this.requested[pieceBlock.index][blockIndex];
    }

    isDone() {
        return this.received.every(blocks => blocks.every(Boolean));
    }

    printPercentDone() {
        const downloaded = this.received.reduce((totalBlocks, blocks) => totalBlocks + blocks.filter(Boolean).length, 0);
        const total = this.received.reduce((totalBlocks, blocks) => totalBlocks + blocks.length, 0);
        const percent = Math.floor(downloaded / total * 100);
        console.log(`Progress: ${percent}% [${downloaded}/${total}]`);
    }
}