# to setup development environment
```yarn```

# to run the tests 
```yarn test```

# Notes 

Sand can be instantiated both as an upgradeable smart contract via Proxy (see ```UpgradeableProxy/AdminUpgradeabilityProxy```) or as a immutable Smart contract

Since we want to add functionality to our smart contract we might release it as an upgradeable smart contract, but this might not be the cae if we can provide the same flexibility via super operators as implemented in ```Sand/erc20/ERC20BaseToken.sol```

Our initial release would be ```Sand.sol``` that do not implement ERC777 but emits the events for Transfers, Burning and Minting

in the folder "test":

there is a folder "proxy" that test the logic of upgradeability. It does not test the ERC20 features just the way a smart contract can be upgraded and ensure only the admin can.

you can run test test via : ```yarn test-upgrades```

There is also a folder "sand" that test Sand in a variety of situation (standalone immutable contract, upgradeable contract, upgraded and downgraded sand,...)
This tests both ERC20 and ERC777 as well as approval and meta transaction extensions

you can run these test via : ```yarn test-sand```

The core of Sand is implemented in ```Sand/erc20/ERC20BaseToken.sol```

Then we added ```Sand/erc777/ERC20BaseTokenWithERC777Events.sol``` in order to allow Sand to upgraded to erc777 later (as events can be backtracked they need to be emitted all the time)

Then we added ```Sand/erc20/ERC20ApproveExtension.sol``` 
This add method to approve a smart contract and call it in one transaction allowing us to reduce user interaction.
This also add approval via signature, allowing user to approve addresses to manage their fund without paying the gas. This would be used for subscription for example.



<!-- OUT OF SCOPE : >
<!-- Finally we added ```Sand/erc20/ERC20MetaTxExtension.sol``` which implement native meta transaction support for our ERC20 token Sand

We also have ```MetaProxy/MetaProxy.sol``` that implement a wrapper contract to reduce the risk of loss for our hot wallet responsible to execute meta transaction.

Such hot wallet would never have more than X ether(to cover the gas cost of a meta transaction). If our hot wallet get hacked they can only extract as much per transaction reducing greatly the risk. The MetaProxy will be the one owning the Ether need to resplenish the hot wallet at every meta transaction call.  -->
