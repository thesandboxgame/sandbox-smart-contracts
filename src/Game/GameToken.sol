pragma solidity 0.6.5;

import "../BaseWithStorage/ERC721BaseToken.sol";


contract GameToken is ERC721BaseToken {
    uint256 public _number;

    address _owner; // is this ownable?
    address _gameEditor; // do we need more than 1?
    uint256[] assets; // asset ids?

    function setNumber(uint256 number) public {
        _number = number;
    }

    constructor(address metaTransactionContract, address admin) public ERC721BaseToken(metaTransactionContract, admin) {}
}
