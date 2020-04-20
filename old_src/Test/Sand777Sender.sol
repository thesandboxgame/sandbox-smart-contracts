pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC777TokensRecipient.sol";
import "../../contracts_common/src/Interfaces/ERC777Token.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import {
    ERC820Implementer
} from "../../contracts_common/src/Base/ERC820Implementer.sol";

contract Sand777Sender is ERC777TokensRecipient, ERC820Implementer {
    bool private allowTokensSent;

    address private owner;
    ERC777Token private tokenContract;
    uint256 private tokenBalance;

    constructor(ERC777Token _tokenContract, bool _allowTokensSent) public {
        tokenContract = _tokenContract;
        allowTokensSent = _allowTokensSent;
        owner = msg.sender;

        setInterfaceImplementation("ERC777TokensSender", address(this));
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
        tokenBalance += amount;
    }

    function tokensToSend(
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
        require(allowTokensSent, "Sending not allowed");
        tokenBalance -= amount;
    }

    function acceptTokens() public onlyOwner {
        allowTokensSent = true;
    }
    function rejectTokens() public onlyOwner {
        allowTokensSent = false;
    }

}
