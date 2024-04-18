// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {LandMetadataRegistry} from "../LandMetadataRegistry.sol";

contract LandMetadataRegistryMock is LandMetadataRegistry {
    function getLandMetadataStorageSlot() external pure returns (uint256) {
        LandMetadataStorage storage $ = _getLandMetadataStorage();
        uint256 ret;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ret := $.slot
        }
        return ret;
    }
}
