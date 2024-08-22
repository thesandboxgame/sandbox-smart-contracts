// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {NFTCollection} from "../nft-collection/NFTCollection.sol";


contract NFTCollectionMock is NFTCollection {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _collectionOwner, address _initialTrustedForwarder)  {
        _transferOwnership(_collectionOwner);
        _setTrustedForwarder(_initialTrustedForwarder);
    }

    function NFTCollection_init(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        MintingDefaults memory _mintingDefaults
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
            _maxSupply,
            _mintingDefaults
        );
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
