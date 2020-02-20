const {read} = require('../lib/spreadsheet');
const fs = require('fs');
const ethers = require('ethers');

(async () => {
    const values = await read('1ND3IZdBRaEdWDaoBIqMnp4tS4FIZEWomJ9c0n1Lmw04', 'ROUND 2 — Bounties Giveaway (LANDS)');
    // console.log(values);
    const data = [];
    for (const row of values) {
        if (row.length === 0 || row[0] !== '1') {
            continue;
        }
        let campaign;
        if (row.length > 1) {
            campaign = row[1];
        }
        let email;
        if (row.length > 6) {
            email = row[6];
        }

        let name;
        if (row.length > 3) {
            if (row[3] !== '-' && row[3] !== '') {
                name = row[3];
            }
            if (row.length > 4) {
                if (row[4] !== '-' && row[4] !== '') {
                    name = row[4] + ' ' + name;
                }
            }
        }
        if (!name) {
            name = email;
        }
        if (!name) {
            name = 'FOR CAMPAIGN ' + campaign;
        }

        let address;
        if (row.length > 7) {
            if (ethers.utils.isAddress(row[7])) {
                address = row[7];
            }
        }
        let coordinates;
        if (row.length > 13) {
            const s = row[13];
            let xy;
            if (s.indexOf(',') !== -1) {
                xy = s.split(',');
            } else if (s.indexOf(';') !== -1) {
                xy = s.split(';');
            } else {
                console.log('s', s);
            }
            if (xy) {
                coordinates = {
                    x: parseInt(xy[0], 10), // + 204,
                    y: parseInt(xy[1], 10), // + 204,
                };
                if (!coordinates.x || !coordinates.y) {
                    console.log(coordinates);
                    console.log(xy);
                }
            }
        }
        let size;
        if (row.length > 2) {
            const sizeSpec = row[2];
            if (sizeSpec === '1 ESTATE (L, 12x12)') {
                size = 12;
            } else if (sizeSpec === '1 ESTATE (S, 3x3)') {
                size = 3;
            } else if (sizeSpec === '1 LAND (Random)') {
                size = 1;
            } else {
                console.log('unsuported size spec : ', sizeSpec);
            }
        }
        let sent;
        if (row.length > 8) {
            sent = row[8].toLowerCase() === 'sent';
        }
        data.push({
            campaign,
            name,
            email,
            address,
            coordinates,
            sent,
            size,
        });
    }
    // console.log(JSON.stringify(data.filter((r) => (r.address && r.coordinates)), null, '  '));
    fs.writeFileSync('giveaway.json', JSON.stringify(data.filter((r) => (r.address && r.coordinates && r.size)), null, '  '));
})();
