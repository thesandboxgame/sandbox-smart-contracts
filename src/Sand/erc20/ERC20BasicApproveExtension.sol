pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/BytesUtil.sol";

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

        uint256 before = 0;
        bool allowanceChanged = false;
        if (amount > 0 && !isSuperOperator(target)) {
            before = allowance(msg.sender, target);
            if (before != 2**256 - 1) { // assume https://github.com/ethereum/EIPs/issues/717
                allowanceChanged = true;
                _activateTemporaryApproval(msg.sender, target, amount);
            }
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(msg.value)(data);
        require(success, string(returnData));

        if (allowanceChanged) {
            _deactivateTemporaryApproval(msg.sender, target, before);
        }

        return returnData;
    }

    function isSuperOperator(address who) public view returns (bool);
    function _approveFor(address owner, address target, uint256 amount) internal;
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);
    function _activateTemporaryApproval(address owner, address target, uint256 amount) internal;
    function _deactivateTemporaryApproval(address owner, address spender, uint256 before) internal;
}
