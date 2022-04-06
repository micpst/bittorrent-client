// import HttpHandler from "./http.js";
import UdpHandler from './udp.js';

export default class Tracker {

    handler;
    torrent;
    url;

    constructor(url, torrent) {
        this.torrent = torrent;
        this.url = new URL(url);
        // Supporting only udp trackers for now
        this.handler = this.url.protocol === 'udp:' && new UdpHandler();
    }

    fetchPeers() {
        return new Promise(async (resolve, reject) => {
            if (this.handler) {
                await this.handler.handleAnnounce(this.url, this.torrent, (data, error) =>
                    error ? reject(error) : resolve(data)
                );
            }
            else {
                reject(new Error(`Unsupported tracker protocol '${this.url.protocol}'`));
            }
        });
    }
}
