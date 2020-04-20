pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Libraries/PriceUtil.sol";
import "../Sand.sol";
import "../Asset.sol";
import "../../../contracts_common/src/Interfaces/ERC20.sol";
import "../TheSandbox712.sol";

contract BuyerMinting is
    TheSandbox712

    // bytes32 constant AUCTION_TYPEHASH = keccak256("MintAuction(address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,string uris,bytes lengths,bytes _supplies)");

    // mapping (address => mapping (uint256 => uint256)) claimed;

    // Asset asset;
    // Sand sand;
    // constructor(Sand _sand, Asset _asset) public {
    //     asset = _asset;
    //     sand = _sand;
    //     init712();
    // }

    // function claimMintOffer(
    //     address buyer,
    //     address payable seller,
    //     address token,
    //     uint256 buyAmount,
    //     uint256[] calldata auctionData,
    //     string uris,
    //     uint256[] lengths,
    //     uint256[] indexes,
    //     uint256[] amounts,
    //     bytes calldata signature
    // ) external payable {

    //     if(notMintedYet) {
    //         ids = asset.mintMultipleWithNFT(creator, sandAmount, uris, lengths, supplies, numNFTs, creator); // TODO minting should return the i
    //     } else {
    //         // TODO ids need to passed to the call and uris need to be checked
    //         // => this means 2 asset with same uri can't exist => problem with extraction
    //     }
    //     uint256[] memory packAmounts = new uint[](amounts.length);
    //     for(uint256 i = 0; i < packAmounts.length; i++){
    //         packAmounts[i] = amounts[i] * buyAmount;
    //     }
    //     asset.batchTransferFrom(seller, buyer, ids, packAmounts);
    // }
{}
