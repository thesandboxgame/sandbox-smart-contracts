pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/BytesUtil.sol";

contract ERC20BasicApproveExtension {

    /// @notice approve `target` to spend `amount` and call it with data.
    /// @param target address to be given rights to transfer and destination of the call and address.
    /// @param amount the number of tokens allowed.
    /// @param data bytes for the call.
    /// @return data of the call.
    function approveAndCall(
        address target,
        uint256 amount,
        bytes memory data
    ) public payable returns (bytes memory) {

        require(
            BytesUtil.doFirstParamEqualsAddress(data, msg.sender),
            "first param != sender"
        );

        uint256 before = allowance(msg.sender, target);
        bool allowanceChanged = false;
        if (before != 2**256 - 1) { // assume https://github.com/ethereum/EIPs/issues/717
            allowanceChanged = true;
            _approveForWithoutEvent(msg.sender, target, amount);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(msg.value)(data);
        require(success, "the call failed");

        if (allowanceChanged) {
            _approveForWithoutEvent(msg.sender, target, before);
        }

        return returnData;
    }


    function allowance(address _owner, address _spender)
        public
        view
        returns (uint256 remaining);
    function _approveForWithoutEvent(address owner, address target, uint256 amount)
        internal;
}
