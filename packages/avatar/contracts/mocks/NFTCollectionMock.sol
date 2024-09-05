// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {IERC20Metadata} from "@openzeppelin/contracts-5.0.2/token/ERC20/extensions/IERC20Metadata.sol";
import {NFTCollection} from "../nft-collection/NFTCollection.sol";


contract NFTCollectionMock is NFTCollection {
    struct V5VarsStorage {
        bytes32 erc721BurnMemoryUpgradable;
        bytes32 erc2771HandlerUpgradable;
        bytes32 updatableOperatorFiltererUpgradeable;
        bytes32 nftCollection;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _collectionOwner, address _initialTrustedForwarder)  {
        _transferOwnership(_collectionOwner);
        _setTrustedForwarder(_initialTrustedForwarder);
    }

    function NFTCollection_init(
        address _collectionOwner,
        string calldata _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        IERC20Metadata _allowedToExecuteMint,
        uint256 _maxSupply
    ) external {
        __NFTCollection_init(
            _collectionOwner,
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _initialTrustedForwarder,
            _allowedToExecuteMint,
            _maxSupply
        );
    }

    function getV5VarsStorageStructure() external pure returns (V5VarsStorage memory ret) {
        ret.erc721BurnMemoryUpgradable = ERC721_BURN_MEMORY_UPGRADABLE_STORAGE_LOCATION;
        ret.erc2771HandlerUpgradable = ERC2771_HANDLER_UPGRADABLE_STORAGE_LOCATION;
        ret.updatableOperatorFiltererUpgradeable = UPDATABLE_OPERATOR_FILTERER_UPGRADABLE_STORAGE_LOCATION;
        ret.nftCollection = NFT_COLLECTION_STORAGE_LOCATION;
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
