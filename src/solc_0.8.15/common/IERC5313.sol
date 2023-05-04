// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// @note 
// take from: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/interfaces/IERC5313.sol
// as of 2023.04.25 version 4.9 of OpenZeppelin/openzeppelin-contracts, that holds this interface, is not released. Will change it when it will be

/**
 * @dev Interface for the Light Contract Ownership Standard.
 *
 * A standardized minimal interface required to identify an account that controls a contract
 *
 * _Available since v4.9._
 */
interface IERC5313 {
    /**
     * @dev Gets the address of the owner.
     */
    function owner() external view returns (address);
}