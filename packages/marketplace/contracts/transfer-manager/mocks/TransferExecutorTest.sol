// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {TransferExecutor, Initializable, OwnableUpgradeable, LibAsset} from "../TransferExecutor.sol";

contract TransferExecutorTest is Initializable, OwnableUpgradeable, TransferExecutor {
    function __TransferExecutorTest_init() external initializer {
        __Ownable_init();
    }

    function transferTest(LibAsset.Asset calldata asset, address from, address to) external payable {
        TransferExecutor.transfer(asset, from, to);
    }
}
