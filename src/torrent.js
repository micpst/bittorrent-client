import EventEmitter from 'events';
import Peer from './peer/index.js';
import Tracker from './tracker/index.js';
import * as torrentParser from './torrent-parser.js';

export default class Torrent extends EventEmitter {

    clientConfig;
    downloadPath;
    metadata;
    peers = [];
    trackers = [];

    constructor(torrentId, clientConfig, downloadPath) {
        super();
        this.clientConfig = clientConfig;
        this.downloadPath = downloadPath;
        this.metadata = torrentParser.open(torrentId);
        this.trackers = this.metadata.announce.map(url => new Tracker(url, this.clientConfig, this.metadata));
        this.updatePeers();
    }

    async updatePeers() {
        const peers = await Promise.all(this.trackers.map(tracker => tracker.fetchPeers()));
        this.peers = peers.flat().map(({ip, port}) => new Peer(ip, port, this.metadata, this.clientConfig));
    }
}