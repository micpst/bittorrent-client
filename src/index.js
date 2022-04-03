import * as torrentParser from './torrent-parser.js';
import Tracker from './tracker/index.js';

const torrent = torrentParser.open('lgaga.torrent');
torrent.announce.forEach(async url => {
    const tracker = new Tracker(url, torrent);
    try {
        const data = await tracker.fetchPeers();
        // console.log(url, `list of peers: ${data}`);
        console.dir(data.peers);
    }
    catch (error) {
        console.log(url, error.message);
    }
});
