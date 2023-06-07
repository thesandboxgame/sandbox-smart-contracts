// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {
  IOperatorFilterRegistry
} from "operator-filter-registry/src/IOperatorFilterRegistry.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title  OwnedRegistrant
 * @notice Ownable contract that registers itself with the OperatorFilterRegistry and administers its own entries,
 *         to facilitate a subscription whose ownership can be transferred.
 */

contract MockOwnedRegistrant is Ownable2Step {
  /// @dev The constructor that is called when the contract is being deployed.
  /// @dev This contract is based on OpenSea's OwnedRegistrant.
  /// @dev The param _localRegistry has been added to the constructor to enable local testing.
  constructor(address _owner, address _localRegistry) {
    IOperatorFilterRegistry(_localRegistry).register(address(this));
    transferOwnership(_owner);
  }
}
