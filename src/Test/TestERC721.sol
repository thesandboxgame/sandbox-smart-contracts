pragma solidity 0.6.4;

import "../BaseWithStorage/ERC721BaseToken.sol";


contract TestERC721 is ERC721BaseToken {
    constructor(
        address metaTransactionContract,
        address admin
    ) public ERC721BaseToken(
        metaTransactionContract,
        admin
    ) {
    }

    function mint(
        address to,
        uint256 tokenId
    ) external {
        require(to != address(0), "Wrong to");

        _owners[tokenId] = uint256(to);
        _numNFTPerAddress[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
}
