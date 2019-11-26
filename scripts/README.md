to mint asset on rinkeby from user and assets id :

```
yarn attach-rinkeby "node scripts\mintGenesisAssets.js mintIds -u dev c8b1335f-f1e8-4612-9ac4-385fc4850336 0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20 57282f37-9439-4b1a-bfdc-173b24f2176f c620d1d6-903d-4a34-a1c2-294b5bdf9f02"
```

to setup bundle :
```
yarn attach-rinkeby "node scripts\setupBundleSandSale.js setup"
```


generate land config from back office tool
```
node scripts\generateLandPreSaleJSON.js <lands.json> data\land_presale_001.json
```
