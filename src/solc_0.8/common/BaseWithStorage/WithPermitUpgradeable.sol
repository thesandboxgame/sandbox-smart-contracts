// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

abstract contract WithPermitUpgradeable is EIP712Upgradeable, IERC20PermitUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    mapping(address => CountersUpgradeable.Counter) private _nonces;

    // solhint-disable-next-line var-name-mixedcase
    bytes32 public constant _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    function __WithPermitUpgradeable_init(string memory name) internal onlyInitializing {
        __EIP712_init_unchained(name, "1");
    }

    /// @notice Function to permit the expenditure of ERC20 token by a nominated spender
    /// @param owner The owner of the ERC20 tokens
    /// @param spender The nominated spender of the ERC20 tokens
    /// @param value The value (allowance) of the ERC20 tokens that the nominated spender will be allowed to spend
    /// @param deadline The deadline for granting permission to the spender
    /// @param v The final 1 byte of signature
    /// @param r The first 32 bytes of signature
    /// @param s The second 32 bytes of signature
    function checkApproveFor(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(block.timestamp <= deadline, "PAST_DEADLINE");
        bytes32 structHash = keccak256(abi.encode(_PERMIT_TYPEHASH, owner, spender, value, _useNonce(owner), deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSAUpgradeable.recover(hash, v, r, s);
        require(signer == owner, "INVALID_SIGNATURE");
    }

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }

    function nonces(address owner) external view virtual override returns (uint256) {
        return _nonces[owner].current();
    }

    function _useNonce(address owner) internal virtual returns (uint256 current) {
        CountersUpgradeable.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }

    uint256[49] private __gap;
}
