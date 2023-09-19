// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract TestChainId {
    function getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }
}
