//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "../../../Interfaces/ERC677.sol";
import "../../../Interfaces/ERC677Receiver.sol";
import "./ERC20Internal.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract ERC677Extension is ERC20Internal, ERC677 {
    using Address for address;

    /**
     * @dev transfer token to a contract address with additional data if the recipient is a contact.
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     * @param _data The extra data to be passed to the receiving contract.
     */
    function transferAndCall(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external override returns (bool success) {
        _transfer(msg.sender, _to, _value);
        if (_to.isContract()) {
            ERC677Receiver receiver = ERC677Receiver(_to);
            receiver.onTokenTransfer(msg.sender, _value, _data);
        }
        return true;
    }
}
