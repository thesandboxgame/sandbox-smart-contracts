pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC20.sol";

contract GenericERC20MetaTxReceiver {
    address metaTxContract;
    ERC20 token;
    address owner;
    uint256 price;
    uint256 balance;

    event Received(address sender, uint256 value);

    constructor(address _metaTxContract, ERC20 _token, uint256 _price) public {
        token = _token;
        owner = msg.sender;
        price = _price;
        metaTxContract = _metaTxContract;
    }

    function erc20_tokensReceived(
        address from,
        address tokenContract,
        uint256 amount,
        bytes calldata data
    ) external {
        // TODO check token being given
        require(
            msg.sender == address(metaTxContract) ||
                msg.sender == tokenContract,
            "sender != metaTxContract && != tokenContract"
        );
        require(amount == price, "not enough value");
        balance += amount;
        emit Received(from, amount);
    }

    function meta_transaction_received(address sender, bytes calldata data)
        external
    {
        (address addr, uint256 value) = abi.decode(data, (address, uint256));
        require(
            sender == msg.sender || msg.sender == address(metaTxContract),
            "sender != sender && != metaTxContract"
        );
        emit Received(addr, value);
    }

    function withdrawnAll() external {
        require(owner == msg.sender, "only owner can withdraw");
        uint256 tmpBalance = balance;
        balance = 0;
        token.transfer(msg.sender, tmpBalance);
    }
}
