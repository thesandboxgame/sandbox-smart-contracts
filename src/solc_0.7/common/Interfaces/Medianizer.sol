//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.1;

/**
 * @title Medianizer contract
 * @dev From MakerDAO (https://etherscan.io/address/0x729D19f657BD0614b4985Cf1D82531c67569197B#code)
 */
interface Medianizer {
    function read() external view returns (bytes32);
}
