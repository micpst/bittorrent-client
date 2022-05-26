import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

import Peer from '../peer/index.js';
import Tracker from '../tracker/index.js';
import PieceManager from './pieces.js';
import TorrentMetadata from './torrent-parser.js';


export default class Torrent extends EventEmitter {

    clientConfig;
    downloadPath;
    metadata;
    file;
    peers = [];
    trackers = [];
    piecesManager;

    constructor(torrentId, clientConfig, downloadPath) {
        super();
        this.clientConfig = clientConfig;
        this.downloadPath = downloadPath;
        this.metadata = new TorrentMetadata(torrentId);
        this.pieceManager = new PieceManager();
        this.file = fs.openSync(path.join(downloadPath, this.metadata.infoName), 'w');
        this.updateTrackers();
    }

    updateTrackers() {
        this.trackers = this.metadata.announce.map(url => new Tracker(url, this.clientConfig, this.metadata));
    }

    async updatePeers() {
        const peersData = await Promise.all(this.trackers.map(tracker => tracker.fetchPeers()));
        this.peers = peersData.flat().map(({ ip, port }) =>
            new Peer(ip, port, this.clientConfig, this.metadata, this.pieceManager)
        );
    }

    async download() {
        await this.updatePeers();
        this.peers.forEach(peer => {
            peer.connect();
            peer.on('piece', this.handlePieceResponse.bind(this))
        });
    }

    handlePieceResponse(response) {
        const offset = response.index * this.metadata.infoPieceLength + response.begin;
        fs.write(this.file, response.block, 0, response.block.length, offset, () => {});
        try {
            fs.closeSync(this.file);
        } catch(err) {
            console.error('Failed to close the file');
        }
    }
}