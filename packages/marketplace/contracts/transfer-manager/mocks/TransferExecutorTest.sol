// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {LibAsset} from "../../lib-asset/LibAsset.sol";
import {TransferExecutor} from "../TransferExecutor.sol";

contract TransferExecutorTest is Initializable, OwnableUpgradeable, TransferExecutor {
    function __TransferExecutorTest_init() external initializer {
        __Ownable_init();
    }

    function transferTest(LibAsset.Asset calldata asset, address from, address to) external payable {
        TransferExecutor.transfer(asset, from, to);
    }
}
