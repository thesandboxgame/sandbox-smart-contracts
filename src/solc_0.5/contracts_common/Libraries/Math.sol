pragma solidity ^0.5.2;

/**
 * @title Math
 * @dev Math operations
 */
library Math {
    function max(uint256 a, uint256 b) internal pure returns (uint256 c) {
        return a >= b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256 c) {
        return a < b ? a : b;
    }
}