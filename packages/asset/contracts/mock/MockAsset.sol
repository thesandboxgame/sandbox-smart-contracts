//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// mock the asset contract to test the _msgData() function

import {Asset} from "../Asset.sol";
import {
    IOperatorFilterRegistry
} from "@sandbox-smart-contracts/operator-filter/contracts/OperatorFilter/interfaces/IOperatorFilterRegistry.sol";

contract MockAsset is Asset {
    /// @notice sets registry and subscribe to subscription
    /// @param registry address of registry
    /// @param subscription address to subscribe
    function setRegistryAndSubscribe(address registry, address subscription) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
        operatorFilterRegistry.registerAndSubscribe(address(this), subscription);
    }

    /// @notice Mint new tokens with out minter role
    /// @param to The address of the recipient
    /// @param id The id of the token to mint
    /// @param amount The amount of the token to mint
    function mintWithoutMinterRole(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        _mint(to, id, amount, "");
    }

    /// @notice set approval for asset transfer without filtering
    /// @param operator operator to be approved
    /// @param approved bool value for giving (true) and canceling (false) approval
    function setApprovalForAllWithoutFilter(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function msgData() external view returns (bytes memory) {
        return _msgData();
    }
}
