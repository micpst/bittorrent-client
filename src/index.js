import * as torrentParser from './torrent-parser.js';
import * as tracker from './tracker.js';

const torrent = torrentParser.open('puppy.torrent');

tracker.getPeers(torrent, peers => {
    console.log(`List of peers: ${peers}`);
});
