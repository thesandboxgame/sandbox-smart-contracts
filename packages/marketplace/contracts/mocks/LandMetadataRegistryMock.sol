// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {LandMetadataRegistry} from "./land/LandMetadataRegistry.sol";

contract LandMetadataRegistryMock is LandMetadataRegistry {
    function getLandMetadataStorageSlot() external pure returns (bytes32) {
        return METADATA_STORAGE_LOCATION;
    }
}
