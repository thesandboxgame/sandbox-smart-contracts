to mint asset on rinkeby from user and assets id :

This one mint the asset with destination being the creator itself.
For specific destination can add option -d <address>
Also this is in test mode, to actually perform the tx, remove -t
```
yarn attach-rinkeby "node scripts\mintGenesisAssets.js mintIds -u staging -t 1450fe3d-9b0d-4c38-8afb-be21fa2ad10d e1a901d8-8574-45b4-9d60-01fb4217917f 9b2e7918-2488-4ca0-a942-8d7ada2e6aae"
```

to setup bundle :
```
yarn attach-rinkeby "node scripts\setupBundleSandSale.js setup"
```


generate land config from back office tool
```
node scripts\generateLandPreSaleJSON.js <lands.json> data\land_presale_001.json
```
