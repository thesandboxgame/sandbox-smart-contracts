# How to deploy contracts

## Requirements

If you haven't done it, follow the [getting started](../intro/index.md) tutorial first.

## Prepare your environment

Always on master
```shell
git checkout master
```

Fix format of contracts (optional)
```shell
yarn format:fix
```

Update dependencies
```shell
yarn
```

## Deploy contracts

### Fork deployment

The [fork deployment](https://hardhat.org/hardhat-network/guides/mainnet-forking.html) command simulates the state of the selected network and deploy as if we were on this network but locally. Always run the fork deployment first to check what is about to be really deployed and how.

The first argument is the network you want to simulate. 
The option `--deploy-scripts` overwrites the folders configured in `hardhat.config.ts`.
In case of fork deployment, the network is actually `hardhat`, so if you want to deploy only on L2, you would have to pass `deploy_polygon` in option to `--deploy-scripts`.
The option `--tags` selects the deployment script to execute. For instance, `PolygonSand` will only run the deployments with at least the tag `PolygonSand` defined with `func.tags`.

```ts
func.tags = ['PolygonSand', 'PolygonSand_deploy'];
```

!!! example Fork deployment of PolygonSand on mumbai
    ```shell
    yarn fork:deploy mumbai --deploy-scripts deploy_polygon --tags PolygonSand
    ```

### Deployment

Once the fork deployment is looking good, you can switch to the real network by running the same command without `fork`. 
The option `--deploy-scripts` is not needed for a real deployment because the deploy folders are configured correctly in `hardhat.config.ts`

!!! example Deployment of PolygonSand on mumbai
    ```shell
    yarn deploy mumbai --tags PolygonSand
    ```

Once your contract deployed on the network, a deployment file will be generated in the folder

```shell
./deployments/yournetwork/Contract.json
```

This file contains everything you need to identify the contract:

- abi
- signature
- address on the network
- transaction
- arguments

!!! example
    Take a look at the [deployment file](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/deployments/mumbai/PolygonSand.json) of PolygonSand on mumbai 

## Verify contracts

After deploying, your contract will be accessible on explorers like [etherscan](https://etherscan.io/) or [polygonscan](https://polygonscan.com/) depending on the network. 

!!! warning
    Depending on the network, the explorer url is different

    | Network         | Explorer    | URL                             |
    | --------------- |----------- | -------------------------------  |
    | Ethereum        | Etherscan   | [https://etherscan.io/](https://etherscan.io/)           |
    | Polygon Mainnet | Polygonscan | [https://polygonscan.com/](https://polygonscan.com/)        |
    | Rinkeby         | Etherscan   | [https://rinkeby.etherscan.io/](https://rinkeby.etherscan.io/)   |
    | Goërli          | Etherscan   | [https://goerli.etherscan.io/](https://goerli.etherscan.io/)    |
    | Mumbai Testnet  | Polygonscan | [https://mumbai.polygonscan.com/](https://mumbai.polygonscan.com/) |

For instance, the PolygonSand contract on mumbai located at this address `0xE03489D4E90b22c59c5e23d45DFd59Fc0dB8a025` (you can find this information in the deployment file) would be visible on [https://mumbai.polygonscan.com/]() at this URL

[https://mumbai.polygonscan.com/address/0xE03489D4E90b22c59c5e23d45DFd59Fc0dB8a025]()

Those explorers are useful to interact with your contracts through the interface (tab "Contract" then "Read Contract" or "Write Contract"). But in order for the explorer to be able to interact with the contract, you have to "verify" the contract on the explorer by sending the signature of your contract to the explorer. And this is done with the command `verify` of hardhat.  
This command needs:

- the path and the name of the contract (required if your contract abi is not unique in your repository)
- the address of the contract
- the arguments of the constructor
- the network

Those information can be found in the deployment file of the contract in the right network folder.

!!! example 
    Extract of the [PolygonSand deployment file](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/deployments/mumbai/PolygonSand.json) on mumbai
    ```json
    {
      "address": "0xE03489D4E90b22c59c5e23d45DFd59Fc0dB8a025",
      (...)
      "args": [
        "0xb5505a6d998549090530911180f38aC5130101c6",
        "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b",
        "0x49c4D4C94829B9c44052C5f5Cb164Fc612181165",
        "0x49c4D4C94829B9c44052C5f5Cb164Fc612181165"
      ],
      (...)
    }
    ```

Verify the contract on explorer
```shell
yarn hardhat verify --network yournetwork \
--contract /path/to/the/Contract.sol:Contract \
address arg1 arg2 arg3
```

!!! example 
    Verify the contract PolygonSand on [https://mumbai.polygonscan.com/](https://mumbai.polygonscan.com/)
    ```shell
    yarn hardhat verify --network mumbai \
    --contract src/solc_0.8/polygon/child/sand/PolygonSand.sol:PolygonSand \
    0xE03489D4E90b22c59c5e23d45DFd59Fc0dB8a025 \
    0xb5505a6d998549090530911180f38aC5130101c6 \
    0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b \
    0x49c4D4C94829B9c44052C5f5Cb164Fc612181165 \
    0x49c4D4C94829B9c44052C5f5Cb164Fc612181165
    ```

Next, learn how to interact with your contract with explorers
