//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
import "../common/Interfaces/IERC677Receiver.sol";

contract MockERC677Receiver is IERC677Receiver {
    event OnTokenTransferEvent(address indexed _sender, uint256 _value, bytes _data);

    function onTokenTransfer(
        address _sender,
        uint256 _value,
        bytes calldata _data
    ) external override {
        emit OnTokenTransferEvent(_sender, _value, _data);
    }
}
