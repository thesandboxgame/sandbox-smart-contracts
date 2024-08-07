//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC20Internal} from "./ERC20Internal.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {BytesUtil} from "../libraries/BytesUtil.sol";

abstract contract ERC20BasicApproveExtension is IErrors, ERC20Internal, Context {
    /// @notice Approve `target` to spend `amount` and call it with data.
    /// @param target The address to be given rights to transfer and destination of the call.
    /// @param amount The number of tokens allowed.
    /// @param data The bytes for the call.
    /// @return The data of the call.
    function approveAndCall(
        address target,
        uint256 amount,
        bytes calldata data
    ) external payable returns (bytes memory) {
        if (!BytesUtil.doFirstParamEqualsAddress(data, _msgSender())) {
            revert FirstParamNotSender();
        }

        _approveFor(_msgSender(), target, amount);

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = target.call{value: msg.value}(data);
        if (!success) {
            revert CallFailed(string(returnData));
        }
        return returnData;
    }

    /// @notice Temporarily approve `target` to spend `amount` and call it with data.
    /// Previous approvals remains unchanged.
    /// @param target The destination of the call, allowed to spend the amount specified
    /// @param amount The number of tokens allowed to spend.
    /// @param data The bytes for the call.
    /// @return The data of the call.
    function paidCall(address target, uint256 amount, bytes calldata data) external payable returns (bytes memory) {
        if (!BytesUtil.doFirstParamEqualsAddress(data, _msgSender())) {
            revert FirstParamNotSender();
        }

        if (amount > 0) {
            _addAllowanceIfNeeded(_msgSender(), target, amount);
        }

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = target.call{value: msg.value}(data);
        if (!success) {
            revert CallFailed(string(returnData));
        }

        return returnData;
    }
}
