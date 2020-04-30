pragma solidity 0.6.5;


interface AssetToken {
    function collectionOf(uint256 id) external view returns (uint256);

    // fails on non-NFT or nft who do not have collection (was a mistake)

    //     require(_ownerOf(id) != address(0), "NFT does not exist");
    //     uint256 collectionId = id & NOT_NFT_INDEX & NOT_IS_NFT;
    //     require(wasEverMinted(collectionId), "no collection ever minted for that token");
    //     return collectionId;
    // }

    function isCollection(uint256 id) external view returns (bool);

    // return true for Non-NFT ERC1155 tokens which exists

    //     uint256 collectionId = id & NOT_NFT_INDEX & NOT_IS_NFT;
    //     return wasEverMinted(collectionId);
    // }

    function collectionIndexOf(uint256 id) external view returns (uint256);
    //     collectionOf(id); // this check if id and collection indeed was ever minted
    //     return uint32((id & NFT_INDEX) >> NFT_INDEX_OFFSET);
    // }
}
