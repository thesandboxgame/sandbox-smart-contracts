pragma solidity 0.5.9;

import "../../contracts_common/Libraries/BytesUtil.sol";

contract ERC20BasicApproveExtension {

    /// @notice approve `target` to spend `amount` and call it with data.
    /// @param target address to be given rights to transfer and destination of the call.
    /// @param amount the number of tokens allowed.
    /// @param data bytes for the call.
    /// @return data of the call.
    function approveAndCall(
        address target,
        uint256 amount,
        bytes calldata data
    ) external payable returns (bytes memory) {
        require(
            BytesUtil.doFirstParamEqualsAddress(data, msg.sender),
            "first param != sender"
        );

        _approveFor(msg.sender, target, amount);

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(msg.value)(data);
        require(success, string(returnData));
        return returnData;
    }

    /// @notice temporarly approve `target` to spend `amount` and call it with data. Previous approvals remains unchanged.
    /// @param target destination of the call, allowed to spend the amount specified
    /// @param amount the number of tokens allowed to spend.
    /// @param data bytes for the call.
    /// @return data of the call.
    function paidCall(
        address target,
        uint256 amount,
        bytes calldata data
    ) external payable returns (bytes memory) {
        require(
            BytesUtil.doFirstParamEqualsAddress(data, msg.sender),
            "first param != sender"
        );

        if (amount > 0) {
            _addAllowanceIfNeeded(msg.sender, target, amount);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(msg.value)(data);
        require(success, string(returnData));

        return returnData;
    }

    function _approveFor(address owner, address target, uint256 amount) internal;
    function _addAllowanceIfNeeded(address owner, address spender, uint256 amountNeeded) internal;
}
