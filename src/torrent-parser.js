import fs from 'fs';
import bencode from 'bencode';

const open = filepath => bencode.decode(fs.readFileSync(filepath));

export { open };
