// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IMultiRoyaltyRecipients} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IMultiRoyaltyRecipients.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {IRoyaltiesProvider, BASIS_POINTS} from "./interfaces/IRoyaltiesProvider.sol";

/// @title royalties registry contract
/// @notice contract allows to processing different types of royalties
contract RoyaltiesRegistry is OwnableUpgradeable, IRoyaltiesProvider {
    /// @notice emitted when royalties is set for token
    /// @param token token address
    /// @param royalties array of royalties
    event RoyaltiesSetForContract(address indexed token, Part[] royalties);

    /// @dev struct to store royalties in royaltiesByToken
    struct RoyaltiesSet {
        bool initialized;
        Part[] royalties;
    }

    enum RoyaltiesType {
        UNSET,
        BY_TOKEN,
        EXTERNAL_PROVIDER,
        EIP2981,
        UNSUPPORTED_NONEXISTENT
    }

    /// used to call EIP2981 royaltyInfo to calculate the royalties percentage
    uint256 public constant WEIGHT_VALUE = 1e6;

    /// @notice stores royalties for token contract, set in setRoyaltiesByToken() method
    mapping(address token => RoyaltiesSet royalties) public royaltiesByToken;

    /// @notice stores external provider and royalties type for token contract
    mapping(address token => uint256 provider) public royaltiesProviders;

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Royalties registry initializer
    // solhint-disable-next-line func-name-mixedcase
    function __RoyaltiesRegistry_init() external initializer {
        __Ownable_init();
    }

    /// @notice sets external provider for token contract, and royalties type = 4
    /// @param token token address
    /// @param provider address of provider
    function setProviderByToken(address token, address provider) external {
        _checkOwner(token);
        _setRoyaltiesType(token, RoyaltiesType.EXTERNAL_PROVIDER, provider);
    }

    /// @notice returns royalties type for token contract
    /// @param token token address
    /// @return royalty type
    function getRoyaltiesType(address token) external view returns (RoyaltiesType) {
        return _getRoyaltiesType(royaltiesProviders[token]);
    }

    /// @notice returns provider address for token contract from royaltiesProviders mapping
    /// @param token token address
    /// @return address of provider
    function getProvider(address token) public view returns (address) {
        return address(uint160(royaltiesProviders[token]));
    }

    /// @notice clears and sets new royalties type for token contract
    /// @param token address of token
    /// @param royaltiesType roayalty type
    function forceSetRoyaltiesType(address token, RoyaltiesType royaltiesType) external {
        _checkOwner(token);
        _setRoyaltiesType(token, royaltiesType, getProvider(token));
    }

    /// @notice clears royalties type for token contract
    /// @param token address of token
    function clearRoyaltiesType(address token) external {
        _checkOwner(token);
        royaltiesProviders[token] = uint256(uint160(getProvider(token)));
    }

    /// @notice sets royalties for token contract in royaltiesByToken mapping and royalties type = 1
    /// @param token address of token
    /// @param royalties array of royalties
    function setRoyaltiesByToken(address token, Part[] memory royalties) external {
        _checkOwner(token);
        //clearing royaltiesProviders value for the token
        delete royaltiesProviders[token];
        // setting royaltiesType = 1 for the token
        _setRoyaltiesType(token, RoyaltiesType.BY_TOKEN, address(0));
        uint256 sumRoyalties = 0;
        delete royaltiesByToken[token];
        for (uint256 i = 0; i < royalties.length; ++i) {
            require(royalties[i].account != address(0x0), "recipient should be present");
            require(royalties[i].value != 0, "royalty value should be > 0");
            royaltiesByToken[token].royalties.push(royalties[i]);
            sumRoyalties += royalties[i].value;
        }
        require(sumRoyalties < BASIS_POINTS, "royalties sum more, than 100%");
        royaltiesByToken[token].initialized = true;
        emit RoyaltiesSetForContract(token, royalties);
    }

    /// @notice returns royalties type from uint
    /// @param data in uint256
    /// @return royalty type
    function _getRoyaltiesType(uint256 data) internal pure returns (RoyaltiesType) {
        for (uint256 i = 1; i <= uint256(type(RoyaltiesType).max); ++i) {
            if (data / 2 ** (256 - i) == 1) {
                return RoyaltiesType(i);
            }
        }
        return RoyaltiesType.UNSET;
    }

    /// @notice sets royalties type for token contract
    /// @param token address of token
    /// @param royaltiesType uint256 of royalty type
    /// @param royaltiesProvider address of royalty provider
    function _setRoyaltiesType(address token, RoyaltiesType royaltiesType, address royaltiesProvider) internal {
        require(royaltiesType != RoyaltiesType.UNSET, "wrong royaltiesType");
        royaltiesProviders[token] = uint256(uint160(royaltiesProvider)) + 2 ** (256 - uint256(royaltiesType));
    }

    /// @notice checks if msg.sender is owner of this contract or owner of the token contract
    /// @param token address of token
    function _checkOwner(address token) internal view {
        if ((owner() != _msgSender()) && (OwnableUpgradeable(token).owner() != _msgSender())) {
            revert("Token owner not detected");
        }
    }

    /// @notice calculates royalties type for token contract
    /// @param token address of token
    /// @param royaltiesProvider address of royalty provider
    /// @return royalty type
    function _calculateRoyaltiesType(address token, address royaltiesProvider) internal view returns (RoyaltiesType) {
        try IERC165Upgradeable(token).supportsInterface(type(IERC2981).interfaceId) returns (bool result2981) {
            if (result2981) {
                return RoyaltiesType.EIP2981;
            }
            // solhint-disable-next-line no-empty-blocks
        } catch {}

        if (royaltiesProvider != address(0)) {
            return RoyaltiesType.EXTERNAL_PROVIDER;
        }

        return RoyaltiesType.UNSUPPORTED_NONEXISTENT;
    }

    /// @notice returns royalties for token contract and token id
    /// @param token address of token
    /// @param tokenId id of token
    /// @return royalties in form of an array of Parts
    function getRoyalties(address token, uint256 tokenId) external override returns (Part[] memory) {
        uint256 royaltiesProviderData = royaltiesProviders[token];

        address royaltiesProvider = address(uint160(royaltiesProviderData));
        RoyaltiesType royaltiesType = _getRoyaltiesType(royaltiesProviderData);

        // case when royaltiesType is not set
        if (royaltiesType == RoyaltiesType.UNSET) {
            // calculating royalties type for token
            royaltiesType = _calculateRoyaltiesType(token, royaltiesProvider);

            //saving royalties type
            _setRoyaltiesType(token, royaltiesType, royaltiesProvider);
        }

        //case royaltiesType = 1, royalties are set in royaltiesByToken
        if (royaltiesType == RoyaltiesType.BY_TOKEN) {
            return royaltiesByToken[token].royalties;
        }

        //case royaltiesType = 2, royalties from external provider
        if (royaltiesType == RoyaltiesType.EXTERNAL_PROVIDER) {
            return _providerExtractor(token, tokenId, royaltiesProvider);
        }

        //case royaltiesType = 3, royalties EIP-2981
        if (royaltiesType == RoyaltiesType.EIP2981) {
            return _getRoyaltiesEIP2981(token, tokenId);
        }

        // case royaltiesType = 4, unknown/empty royalties
        return new Part[](0);
    }

    /// @notice tries to get royalties EIP-2981 for token and tokenId
    /// @param token address of token
    /// @param tokenId id of token
    /// @return royalties 2981 royalty array
    function _getRoyaltiesEIP2981(address token, uint256 tokenId) internal view returns (Part[] memory royalties) {
        try IERC2981(token).royaltyInfo(tokenId, WEIGHT_VALUE) returns (address receiver, uint256 royaltyAmount) {
            try IERC165Upgradeable(token).supportsInterface(type(IMultiRoyaltyRecipients).interfaceId) returns (
                bool result
            ) {
                if (result) {
                    try IMultiRoyaltyRecipients(token).getRecipients(tokenId) returns (
                        Recipient[] memory multiRecipients
                    ) {
                        uint256 multiRecipientsLength = multiRecipients.length;
                        royalties = new Part[](multiRecipientsLength);
                        uint256 sum = 0;
                        for (uint256 i; i < multiRecipientsLength; i++) {
                            Recipient memory splitRecipient = multiRecipients[i];
                            royalties[i].account = splitRecipient.recipient;
                            uint256 splitAmount = (splitRecipient.bps * royaltyAmount) / WEIGHT_VALUE;
                            royalties[i].value = splitAmount;
                            sum += splitAmount;
                        }
                        // sum can be less than amount, otherwise small-value listings can break
                        require(sum <= royaltyAmount, "RoyaltiesRegistry: Invalid split");
                        return royalties;
                    } catch {
                        return _calculateRoyalties(receiver, royaltyAmount);
                    }
                } else {
                    return _calculateRoyalties(receiver, royaltyAmount);
                }
            } catch {
                return _calculateRoyalties(receiver, royaltyAmount);
            }
        } catch {
            return new Part[](0);
        }
    }

    /// @notice tries to get royalties for token and tokenId from external provider set in royaltiesProviders
    /// @param token address of token
    /// @param tokenId id of token
    /// @param providerAddress address of external provider
    /// @return external royalties
    function _providerExtractor(
        address token,
        uint256 tokenId,
        address providerAddress
    ) internal returns (Part[] memory) {
        try IRoyaltiesProvider(providerAddress).getRoyalties(token, tokenId) returns (Part[] memory result) {
            return result;
        } catch {
            return new Part[](0);
        }
    }

    /// @notice method for converting amount to percent and forming LibPart
    /// @param to recipient of royalties
    /// @param amount of royalties
    /// @return LibPart with account and value
    function _calculateRoyalties(address to, uint256 amount) internal pure returns (Part[] memory) {
        Part[] memory result;
        if (amount == 0) {
            return result;
        }
        uint256 percent = (amount * BASIS_POINTS) / WEIGHT_VALUE;
        require(percent < BASIS_POINTS, "Royalties 2981 exceeds 100%");
        result = new Part[](1);
        result[0].account = payable(to);
        result[0].value = percent;
        return result;
    }

    // slither-disable-next-line unused-state
    uint256[46] private __gap;
}
