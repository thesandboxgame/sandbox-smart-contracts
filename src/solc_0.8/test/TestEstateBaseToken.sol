//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EstateBaseToken} from "../estate/EstateBaseToken.sol";

import {EstateTokenIdHelperLib} from "../estate/EstateTokenIdHelperLib.sol";

contract TestEstateBaseToken is EstateBaseToken {
    constructor(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) {
        initialize(trustedForwarder, admin, landToken, chainIndex, name_, symbol_);
    }

    function initialize(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) public initializer {
        __ERC2771Context_init_unchained(trustedForwarder);
        __ERC721_init_unchained(name_, symbol_);
        __EstateBaseERC721_init_unchained(admin);
        __EstateBaseToken_init_unchained(landToken, chainIndex);
    }

    function mint(address to) external {
        _mintEstate(to);
    }

    function incrementTokenVersion(uint256 estateId) external returns (uint256 newEstateId) {
        newEstateId = _incrementTokenVersion(estateId);
        return (newEstateId);
    }

    function incrementTokenId(uint256 estateId) external pure returns (uint256 newEstateId) {
        return EstateTokenIdHelperLib.incrementVersion(estateId);
    }

    function packId(
        address creator,
        uint64 subId,
        uint16 chainId,
        uint16 version
    ) external pure returns (uint256) {
        return EstateTokenIdHelperLib.packId(creator, subId, chainId, version);
    }

    function unpackId(uint256 estateId)
        public
        pure
        returns (
            address creator,
            uint64 subId,
            uint16 chainId,
            uint16 version
        )
    {
        return EstateTokenIdHelperLib.unpackId(estateId);
    }
}
