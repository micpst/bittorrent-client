import crypto from "crypto";
import Torrent from "./torrent.js";

export default class Client {

    downloadPath;
    id;
    port;
    torrents = {};

    constructor(options = {}) {
        this.generatePeerId(options.id);
        this.port = options.port || 6681;
        this.downloadPath = options.downloadPath || '.';
    }

    generatePeerId(clientId = '-MP0001-') {
        this.id = Buffer.alloc(20);
        this.id.set(Buffer.from(clientId), 0);
        this.id.set(crypto.randomBytes(20 - clientId.length), clientId.length);
    }

    addTorrent(torrentUrl) {
        const config = { peerId: this.id, port: this.port };
        const torrent = new Torrent(torrentUrl, config, this.downloadPath);

        if (!this.torrents[torrent.metadata.infoHash]) {
            this.torrents[torrent.metadata.infoHash] = torrent;
        }

        return torrent;
    }

    removeTorrent(infoHash) {
        if (this.torrents[infoHash]) {
            delete this.torrents[infoHash];
        }
    }
}