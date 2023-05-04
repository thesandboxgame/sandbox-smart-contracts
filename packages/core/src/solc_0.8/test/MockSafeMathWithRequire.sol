//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/Libraries/SafeMathWithRequire.sol";

/**
 * @title SafeMathWithRequire
 * @dev Specific Mock to test SafeMathWithRequire
 */
contract MockSafeMathWithRequire {
    function sqrt6(uint256 a) external pure returns (uint256 c) {
        return SafeMathWithRequire.sqrt6(a);
    }

    function sqrt3(uint256 a) external pure returns (uint256 c) {
        return SafeMathWithRequire.sqrt3(a);
    }

    function cbrt6(uint256 a) external pure returns (uint256 c) {
        return SafeMathWithRequire.cbrt6(a);
    }

    function cbrt3(uint256 a) external pure returns (uint256 c) {
        return SafeMathWithRequire.cbrt3(a);
    }
}
