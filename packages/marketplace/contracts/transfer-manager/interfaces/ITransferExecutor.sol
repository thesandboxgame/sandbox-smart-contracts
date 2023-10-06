// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../../lib-asset/LibAsset.sol";

abstract contract ITransferExecutor {
    function transfer(LibAsset.Asset memory asset, address from, address to) internal virtual;
}
