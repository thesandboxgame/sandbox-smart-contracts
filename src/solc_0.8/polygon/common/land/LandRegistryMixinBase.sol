// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {ILandRegistryMixin} from "../../../common/interfaces/ILandRegistryMixin.sol";
import {IPremiumLandRegistry} from "../../../common/interfaces/IPremiumLandRegistry.sol";
import {QuadLib} from "./QuadLib.sol";

/// @title A mixing to support the registry for the land token
abstract contract LandRegistryMixinBase is ILandRegistryMixin {
    struct LandRegistryMixinStorage {
        IPremiumLandRegistry registry;
        mapping(address => uint256) balances;
    }

    event RegistrySet(IPremiumLandRegistry registry);

    function setPremiumRegistry(IPremiumLandRegistry registry) external {
        _onlyAdmin();
        require(address(registry) != address(0), "invalid address");
        if (address(_s().registry) != address(0)) {
            require(registry.isEmpty() && _s().registry.isEmpty(), "registry must be empty");
        }
        _s().registry = registry;
        emit RegistrySet(registry);
    }

    function updatePremiumBalances(
        uint256 x,
        uint256 y,
        uint256 size,
        bool set
    ) external virtual override {
        IPremiumLandRegistry registry = _s().registry;
        require(msg.sender == address(registry), "only registry");
        mapping(address => uint256) storage balances = _s().balances;
        address owner;
        for (uint256 xi; xi < size; xi++) {
            for (uint256 yi; yi < size; yi++) {
                owner = QuadLib._ownerOfQuad(_s_owners(), 1, x + xi, y + yi);
                if (set) {
                    balances[owner]++;
                } else {
                    balances[owner]--;
                }
            }
        }
    }

    /// @notice get the balance of premium lands for some owner
    /// @param owner address of the owner
    /// @return the quantity of premium lands
    function getPremiumBalance(address owner) external view returns (uint256) {
        // owner == 0 is the balance of non minted lands!!!
        return _s().balances[owner];
    }

    function _onAfterTransferQuadMinting(
        QuadLib.QuadTransferred memory quadTransferred,
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        IPremiumLandRegistry registry = _s().registry;
        if (address(registry) != address(0)) {
            uint256 total = registry.countPremium(x, y, size);
            uint256 transferred = registry.countPremium(quadTransferred.quad);
            uint256 minted = total - transferred;
            mapping(address => uint256) storage balances = _s().balances;
            balances[from] -= transferred;
            balances[address(0)] -= minted;
            balances[to] += total;
        }
    }

    function _onAfterBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids
    ) internal virtual {
        // backward compatibility
        IPremiumLandRegistry registry = _s().registry;
        if (address(registry) == address(0)) {
            return;
        }
        uint256 len = ids.length;
        uint256 cant;
        for (uint256 i = 0; i < len; i++) {
            (uint256 size, uint256 x, uint256 y) = QuadLib._getQuadById(ids[i]);
            cant += registry.countPremium(x, y, size);
        }
        if (cant > 0) {
            _s().balances[from] -= cant;
            _s().balances[to] += cant;
        }
    }

    function _onAfterTransferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        (uint256 size, uint256 x, uint256 y) = QuadLib._getQuadById(id);
        _onAfterTransferQuad(from, to, x, y, size);
    }

    function _onAfterBurn(address from, uint256 id) internal {
        // TODO: do we need to check the burned flag ?
        (uint256 size, uint256 x, uint256 y) = QuadLib._getQuadById(id);
        _onAfterTransferQuad(from, address(0), x, y, size);
    }

    /// @dev we trust the land contract to check from and to
    function _onAfterTransferQuad(
        address from,
        address to,
        uint256 x,
        uint256 y,
        uint256 size
    ) internal {
        IPremiumLandRegistry registry = _s().registry;

        // backward compatibility
        if (address(registry) == address(0)) {
            return;
        }
        uint256 cantPremium = registry.countPremium(x, y, size);
        if (cantPremium > 0) {
            _s().balances[from] -= cantPremium;
            _s().balances[to] += cantPremium;
        }
    }

    function _s() private pure returns (LandRegistryMixinStorage storage ds) {
        bytes32 storagePosition = keccak256("LandRegistryMixinBase.LandRegistryMixinBaseStorage");
        assembly {
            ds.slot := storagePosition
        }
    }

    /// @dev implement
    function _onlyAdmin() internal view virtual;

    /// @dev implement
    function _s_owners() internal view virtual returns (mapping(uint256 => uint256) storage);
}
