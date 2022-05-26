import Client from './client.js';

const client = new Client();
const torrent = client.addTorrent('lgaga.torrent');

torrent.on('complete', () => {
    console.log('Torrent downloading completed!');
});
