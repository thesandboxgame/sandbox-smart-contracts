// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {TransferManager} from "../transfer-manager/TransferManager.sol";
import {TransferExecutor, LibAsset} from "../transfer-manager/TransferExecutor.sol";
import {LibPart} from "../lib-part/LibPart.sol";

contract SimpleTest is TransferManager, TransferExecutor {
    function getRoyaltiesByAssetTest(LibAsset.AssetType memory matchNft) external returns (LibPart.Part[] memory) {
        return getRoyaltiesByAssetType(matchNft);
    }

    /// @dev returning false for mock contract
    function _applyFees(address /* from */) internal pure override returns (bool) {
        return false;
    }
}
