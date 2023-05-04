pragma solidity 0.5.9;

import "../contracts_common/Libraries/SigUtil.sol";
import "../contracts_common/Libraries/PriceUtil.sol";
import "../Sand.sol";
import "../Asset.sol";
import "../contracts_common/Interfaces/ERC20.sol";
import "../TheSandbox712.sol";
import "../contracts_common/BaseWithStorage/MetaTransactionReceiver.sol";

import "../contracts_common/Interfaces/ERC1271.sol";
import "../contracts_common/Interfaces/ERC1271Constants.sol";
import "../contracts_common/Interfaces/ERC1654.sol";
import "../contracts_common/Interfaces/ERC1654Constants.sol";
import "../contracts_common/Libraries/SafeMathWithRequire.sol";

contract AssetSignedAuction is ERC1654Constants, ERC1271Constants, TheSandbox712, MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    enum SignatureType { DIRECT, EIP1654, EIP1271 }

    bytes32 constant AUCTION_TYPEHASH = keccak256(
        "Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)"
    );

    event OfferClaimed(
        address indexed seller,
        address indexed buyer,
        uint256 indexed offerId,
        uint256 amount,
        uint256 pricePaid,
        uint256 feePaid
    );
    event OfferCancelled(address indexed seller, uint256 indexed offerId);

    uint256 constant MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // Stack too deep, grouping parameters
    // AuctionData:
    uint256 constant AuctionData_OfferId = 0;
    uint256 constant AuctionData_StartingPrice = 1;
    uint256 constant AuctionData_EndingPrice = 2;
    uint256 constant AuctionData_StartedAt = 3;
    uint256 constant AuctionData_Duration = 4;
    uint256 constant AuctionData_Packs = 5;

    mapping(address => mapping(uint256 => uint256)) claimed;

    Asset _asset;
    uint256 _fee10000th = 0;
    address payable _feeCollector;

    event FeeSetup(address feeCollector, uint256 fee10000th);

    constructor(Asset asset, address admin, address initialMetaTx, address payable feeCollector, uint256 fee10000th) public {
        _asset = asset;
        _feeCollector = feeCollector;
        _fee10000th = fee10000th;
        emit FeeSetup(feeCollector, fee10000th);
        _admin = admin;
        _setMetaTransactionProcessor(initialMetaTx, true);
        init712();
    }

    /// @notice set fee parameters
    /// @param feeCollector address receiving the fee
    /// @param fee10000th fee in 10,000th
    function setFee(address payable feeCollector, uint256 fee10000th) external {
        require(msg.sender == _admin, "only admin can change fee");
        _feeCollector = feeCollector;
        _fee10000th = fee10000th;
        emit FeeSetup(feeCollector, fee10000th);
    }

    function _verifyParameters(
        address buyer,
        address payable seller,
        address token,
        uint256 buyAmount,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal view {
        require(ids.length == amounts.length, "ids and amounts length not matching");
        require(buyer == msg.sender || (token != address(0) && _metaTransactionContracts[msg.sender]), "not authorized");
        uint256 amountAlreadyClaimed = claimed[seller][auctionData[AuctionData_OfferId]];
        require(amountAlreadyClaimed != MAX_UINT256, "Auction cancelled");

        uint256 total = amountAlreadyClaimed.add(buyAmount);
        require(total >= amountAlreadyClaimed, "overflow");
        require(total <= auctionData[AuctionData_Packs], "Buy amount exceeds sell amount");

        require(
            auctionData[AuctionData_StartedAt] <= block.timestamp,
            "Auction didn't start yet"
        );
        require(
            auctionData[AuctionData_StartedAt].add(auctionData[AuctionData_Duration]) > block.timestamp,
            "Auction finished"
        );

    }

    /// @notice claim offer using EIP712
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOffer(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.DIRECT, true);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    /// @notice claim offer using EIP712 and EIP1271 signature verification scheme
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOfferViaEIP1271(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.EIP1271, true);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    /// @notice claim offer using EIP712 and EIP1654 signature verification scheme
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOfferViaEIP1654(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.EIP1654, true);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    /// @notice claim offer using Basic Signature
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOfferUsingBasicSig(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.DIRECT, false);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    /// @notice claim offer using Basic Signature and EIP1271 signature verification scheme
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOfferUsingBasicSigViaEIP1271(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.EIP1271, false);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    /// @notice claim offer using Basic Signature and EIP1654 signature verification scheme
    /// @param buyer address paying for the offer
    /// @param seller address of the seller
    /// @param token token used for payment
    /// @param purchase buyAmount, maxTokenAmount
    /// @param auctionData offerId, startingPrice, endingPrice, startedAt, duration, packs
    /// @param ids ids of the Assets being sold
    /// @param amounts amounts of Assets per pack
    /// @param signature signature of seller
    function claimSellerOfferUsingBasicSigViaEIP1654(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts
        );
        _ensureCorrectSigner(seller, token, auctionData, ids, amounts, signature, SignatureType.EIP1654, false);
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    function _executeDeal(
        address token,
        uint256[] memory purchase,
        address buyer,
        address payable seller,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal {
        uint256 offer = PriceUtil.calculateCurrentPrice(
                auctionData[AuctionData_StartingPrice],
                auctionData[AuctionData_EndingPrice],
                auctionData[AuctionData_Duration],
                block.timestamp.sub(auctionData[AuctionData_StartedAt])
            ).mul(purchase[0]);
        claimed[seller][auctionData[AuctionData_OfferId]] = claimed[seller][auctionData[AuctionData_OfferId]].add(purchase[0]);

        uint256 fee = 0;
        if(_fee10000th > 0) {
            fee = PriceUtil.calculateFee(offer, _fee10000th);
        }

        uint256 total = offer.add(fee);
        require(total <= purchase[1], "offer exceeds max amount to spend");

        if (token != address(0)) {
            require(ERC20(token).transferFrom(buyer, seller, offer), "failed to transfer token price");
            if(fee > 0) {
                require(ERC20(token).transferFrom(buyer, _feeCollector, fee), "failed to collect fee");
            }
        } else {
            require(msg.value >= total, "ETH < offer+fee");
            if(msg.value > total) {
                msg.sender.transfer(msg.value.sub(total));
            }
            seller.transfer(offer);
            if(fee > 0) {
                _feeCollector.transfer(fee);
            }
        }

        uint256[] memory packAmounts = new uint256[](amounts.length);
        for (uint256 i = 0; i < packAmounts.length; i++) {
            packAmounts[i] = amounts[i].mul(purchase[0]);
        }
        _asset.safeBatchTransferFrom(seller, buyer, ids, packAmounts, "");
        emit OfferClaimed(
            seller,
            buyer,
            auctionData[AuctionData_OfferId],
            purchase[0],
            offer,
            fee
        );
    }

    /// @notice cancel a offer previously signed, new offer need to use a id not used yet
    /// @param offerId offer to cancel
    function cancelSellerOffer(uint256 offerId) external {
        claimed[msg.sender][offerId] = MAX_UINT256;
        emit OfferCancelled(msg.sender, offerId);
    }

    function _ensureCorrectSigner(
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory signature,
        SignatureType signatureType,
        bool eip712
    ) internal view returns (address) {
        bytes memory dataToHash;

        if(eip712) {
            dataToHash = abi.encodePacked(
                "\x19\x01",
                domainSeparator(),
                _hashAuction(from, token, auctionData, ids, amounts)
            );
        } else {
            dataToHash = _encodeBasicSignatureHash(from, token, auctionData, ids, amounts);
        }

        if (signatureType == SignatureType.EIP1271) {
            require(
                ERC1271(from).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "invalid 1271 signature"
            );
        } else if(signatureType == SignatureType.EIP1654){
            require(
                ERC1654(from).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "invalid 1654 signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(dataToHash), signature);
            require(signer == from, "signer != from");
        }
    }

    function _encodeBasicSignatureHash(
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal view returns (bytes memory) {
        return SigUtil.prefixed(keccak256(abi.encodePacked(
                address(this),
                AUCTION_TYPEHASH,
                from,
                token,
                auctionData[AuctionData_OfferId],
                auctionData[AuctionData_StartingPrice],
                auctionData[AuctionData_EndingPrice],
                auctionData[AuctionData_StartedAt],
                auctionData[AuctionData_Duration],
                auctionData[AuctionData_Packs],
                keccak256(abi.encodePacked(ids)),
                keccak256(abi.encodePacked(amounts))
            )));
    }

    function _hashAuction(
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    AUCTION_TYPEHASH,
                    from,
                    token,
                    auctionData[AuctionData_OfferId],
                    auctionData[AuctionData_StartingPrice],
                    auctionData[AuctionData_EndingPrice],
                    auctionData[AuctionData_StartedAt],
                    auctionData[AuctionData_Duration],
                    auctionData[AuctionData_Packs],
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts))
                )
            );
    }
}
