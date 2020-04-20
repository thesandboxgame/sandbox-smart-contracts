pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC20.sol";

contract ERC20MetaTxReceiver {
    ERC20 token;
    address owner;
    uint256 price;
    uint256 balance;

    event Received(address sender, uint256 value, string name, uint256 test);

    constructor(ERC20 _token, uint256 _price) public {
        token = _token;
        price = _price;
        owner = msg.sender;
    }

    function receiveMeta(
        address sender,
        uint256 value,
        string calldata name,
        uint256 test
    ) external {
        require(
            msg.sender == sender || msg.sender == address(token),
            "sender != msg.sender || token"
        );
        require(value == price, "not enough value");
        token.transferFrom(sender, address(this), value);

        balance += value;
        emit Received(sender, value, name, test);
    }

    function withdrawnAll() external {
        require(owner == msg.sender, "only owner can withdraw");
        uint256 tmpBalance = balance;
        balance = 0;
        token.transfer(msg.sender, tmpBalance);
    }
}
