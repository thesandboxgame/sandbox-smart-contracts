pragma solidity 0.7.1;
import "../common/Interfaces/ERC677Receiver.sol";

contract MockERC677Receiver is ERC677Receiver {
    event OnTokenTransferEvent(address indexed _sender, uint256 _value, bytes _data);

    function onTokenTransfer(
        address _sender,
        uint256 _value,
        bytes calldata _data
    ) external override {
        emit OnTokenTransferEvent(_sender, _value, _data);
    }
}
