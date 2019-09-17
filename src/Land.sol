pragma solidity 0.5.9;

import "./Land/erc721/ERC721BaseToken.sol";

contract Land is ERC721BaseToken {
    uint256 lastId;

    constructor(address _sandContract) public ERC721BaseToken(_sandContract) {
        lastId = 1;
    }

    // TODO :
    function mint(address _to) public {
        numNFTPerAddress[_to]++;
        owners[++lastId] = _to;
        emit Transfer(address(0), _to, lastId);
    }
}
