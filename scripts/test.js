const request = require('request');
function waitRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve({response, body});
            }
        });
    });
}

(async () => {
    await (async () => {
        const options = {
            // method: 'PATCH',
            method: 'GET',
            url: 'https://api-develop.sandbox.game/users/d0e7d6c8-3e83-4a51-8f5c-43a46e5de0cf',
            headers: {'Content-Type': 'application/json'},
            // body: {
            //     // assetIds,
            //     // creator
            // },
            json: true
        };
        console.log('sending request...');
        const res = await waitRequest(options);
        if (res && res.body) {
            console.log(JSON.stringify(res.body, null, '  '));
        } else {
            console.log(res);
        }
    })();

    await (async () => {
        const options = {
            // method: 'PATCH',
            method: 'GET',
            url: 'https://api-develop.sandbox.game/assets/639474eb-6526-4c4e-bd21-dab75f02c817',
            headers: {'Content-Type': 'application/json'},
            // body: {
            //     // assetIds,
            //     // creator
            // },
            json: true
        };
        console.log('sending request...');
        const res = await waitRequest(options);
        if (res && res.body) {
            console.log(JSON.stringify(res.body, null, '  '));
        } else {
            console.log(res);
        }
    })();

    await (async () => {
        const options = {
            // method: 'PATCH',
            method: 'GET',
            url: 'https://api-develop.sandbox.game/assets/?section=published&userId=d0e7d6c8-3e83-4a51-8f5c-43a46e5de0cf',
            headers: {'Content-Type': 'application/json'},
            // body: {
            //     // assetIds,
            //     // creator
            // },
            json: true
        };
        console.log('sending request...');
        const res = await waitRequest(options);
        if (res && res.body) {
            console.log(JSON.stringify(res.body.assets.filter((asset) => asset.previewHash).map((asset) => asset.id), null, '  '));
        } else {
            console.log(res);
        }
    })();

    await (async () => {
        const options = {
            // method: 'PATCH',
            method: 'GET',
            url: 'https://api-develop.sandbox.game/assets/?section=published&userId=c8b1335f-f1e8-4612-9ac4-385fc4850336',
            headers: {'Content-Type': 'application/json'},
            // body: {
            //     // assetIds,
            //     // creator
            // },
            json: true
        };
        console.log('sending request...');
        const res = await waitRequest(options);
        if (res && res.body) {
            console.log(JSON.stringify(res.body.assets.filter((asset) => asset.previewHash).map((asset) => asset.id), null, '  '));
        } else {
            console.log(res);
        }
    })();
})();
