import * as torrentParser from './torrent-parser';
import * as tracker from './tracker';

const torrent = torrentParser.open('puppy.torrent');

tracker.getPeers(torrent, peers => {
    console.log(`List of peers: ${peers}`);
});