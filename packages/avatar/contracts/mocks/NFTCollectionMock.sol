// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {NFTCollection} from "../nft-collection/NFTCollection.sol";

contract NFTCollectionMock is NFTCollection {
    struct V5VarsStorage {
        bytes32 erc721BurnMemoryUpgradable;
        bytes32 erc2771HandlerUpgradable;
        bytes32 updatableOperatorFiltererUpgradeable;
        bytes32 nftCollection;
        bytes32 nftCollectionSignature;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _collectionOwner, address _initialTrustedForwarder) {
        _transferOwnership(_collectionOwner);
        _setTrustedForwarder(_initialTrustedForwarder);
    }

    function NFTCollection_init(InitializationParams calldata params) external {
        __NFTCollection_init(params);
    }

    function getV5VarsStorageStructure() external pure returns (V5VarsStorage memory ret) {
        ret.erc721BurnMemoryUpgradable = ERC721_BURN_MEMORY_UPGRADABLE_STORAGE_LOCATION;
        ret.erc2771HandlerUpgradable = ERC2771_HANDLER_UPGRADABLE_STORAGE_LOCATION;
        ret.updatableOperatorFiltererUpgradeable = UPDATABLE_OPERATOR_FILTERER_UPGRADABLE_STORAGE_LOCATION;
        ret.nftCollection = NFT_COLLECTION_STORAGE_LOCATION;
        ret.nftCollectionSignature = NFT_COLLECTION_SIGNATURE_STORAGE_LOCATION;
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @return sender msg.sender
     */
    function msgSender(address) external view returns (address) {
        return super._msgSender();
    }

    /**
     * @notice ERC2771 compatible msg.data getter
     * @return msg.data
     */
    function msgData(address) external view returns (bytes calldata) {
        return super._msgData();
    }
}
