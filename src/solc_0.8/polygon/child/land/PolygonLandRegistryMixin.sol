// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {QuadLib} from "../../common/land/QuadLib.sol";
import {QuadTransferredLib} from "../../common/land/QuadTransferredLib.sol";
import {LandRegistryMixinBase} from "../../common/land/LandRegistryMixinBase.sol";
import {PolygonLandBaseTokenV6} from "./PolygonLandBaseTokenV6.sol";

/// @title A mixing to support the registry for the land token
abstract contract PolygonLandRegistryMixin is PolygonLandBaseTokenV6, LandRegistryMixinBase {
    function _transferQuadMinting(
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal override returns (QuadTransferredLib.QuadTransferred memory quadTransferred) {
        quadTransferred = super._transferQuadMinting(to, size, x, y);
        _onAfterTransferQuadMinting(quadTransferred, _msgSender(), to, size, x, y);
    }

    function _mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal override {
        super._mintQuad(to, size, x, y);
        _onAfterTransferQuad(address(0), to, x, y, size);
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal override {
        super._transferQuad(from, to, size, x, y);
        _onAfterTransferQuad(from, to, x, y, size);
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal override {
        super._transferFrom(from, to, id);
        _onAfterTransferFrom(from, to, id);
    }

    function _burn(
        address from,
        address owner,
        uint256 id
    ) internal override {
        super._burn(from, owner, id);
        _onAfterBurn(from, id);
    }

    function _batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids
    ) internal override {
        super._batchTransferFrom(from, to, ids);
        _onAfterBatchTransferFrom(from, to, ids);
    }

    function _onlyAdmin()
        internal
        view
        override
        onlyAdmin // solhint-disable-next-line no-empty-blocks
    {}

    function _s_owners() internal view virtual override returns (mapping(uint256 => uint256) storage) {
        return _owners;
    }
}
