//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// import IAsset from "./IAsset.sol";
import "../libraries/TokenIdUtils.sol";

contract MockMinter {
    using TokenIdUtils for uint256;

    IAsset public assetContract;

    mapping(address => uint16) public creatorNonces;

    event Minted(uint256 tokenId, uint256 amount);

    constructor(address _assetContract) {
        assetContract = IAsset(_assetContract);
    }

    /// @dev Mints a specified number of unrevealed copies of specific tier
    function mintAsset(
        address recipient,
        uint256 amount,
        uint8 tier,
        bool revealed,
        string calldata metadataHash
    ) public {
        // increment nonce
        unchecked {creatorNonces[msg.sender]++;}
        // get current creator nonce
        uint16 creatorNonce = creatorNonces[msg.sender];
        uint256 tokenId = TokenIdUtils.generateTokenId(msg.sender, tier, creatorNonce, revealed ? 1 : 0, false);

        assetContract.mint(recipient, tokenId, amount, metadataHash);
        emit Minted(tokenId, amount);
    }
}
