pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC777TokensRecipient.sol";
import "../../contracts_common/src/Interfaces/ERC777Token.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import {
    ERC820Implementer
} from "../../contracts_common/src/Base/ERC820Implementer.sol";

contract Sand777Receiver is ERC777TokensRecipient, ERC820Implementer {
    bool private allowTokensReceived;

    address private owner;
    ERC777Token private tokenContract;
    uint256 private tokenBalance;

    constructor(ERC777Token _tokenContract, bool _allowTokensReceived) public {
        tokenContract = _tokenContract;
        allowTokensReceived = _allowTokensReceived;
        owner = msg.sender;

        setInterfaceImplementation("ERC777TokensRecipient", address(this));
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function send(address _to, uint256 _amount) public {
        tokenContract.send(_to, _amount, "");
    }

    function transfer(address _to, uint256 _amount) public {
        ERC20(address(tokenContract)).transfer(_to, _amount);
    }

    function tokensReceived(
        address, // operator,
        address, // from,
        address, // to,
        uint256 amount,
        bytes memory, // data,
        bytes memory // operatorData
    ) public {
        require(
            address(tokenContract) == msg.sender,
            "only accept tokenContract as sender"
        );
        require(allowTokensReceived, "Receive not allowed");
        tokenBalance += amount;
    }

    function acceptTokens() public onlyOwner {
        allowTokensReceived = true;
    }
    function rejectTokens() public onlyOwner {
        allowTokensReceived = false;
    }

    function receiveMeta(
        address sender,
        string calldata name,
        uint256 value,
        uint256 test
    ) external {
        // for test matching erc20Receiver
    }
}
