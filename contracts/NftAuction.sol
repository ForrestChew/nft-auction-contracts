// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionItemStorage/DLLStack.sol";

contract NftAuction is ReentrancyGuard, Ownable, DLLStack {
    enum AuctionState {
        INACTIVE,
        ACTIVE
    }

    AuctionState public auctionState;

    address public auctionOwner;
    uint256 public listingFee;

    event AuctionNft(
        address seller,
        address tokenFactAddr,
        uint256 tokenId,
        uint256 price
    );
    event NewPrice(uint256 tokenId, uint256 price, uint256 newPrice);
    event AuctionStatus(bool auctionStatus);

    modifier auctionActive() {
        require(auctionState == AuctionState.ACTIVE, "Auction must be ACTIVE");
        _;
    }

    modifier auctionInactive() {
        require(
            auctionState == AuctionState.INACTIVE,
            "Auction must be INACTIVE"
        );
        _;
    }

    modifier onlyLister(bytes32 key) {
        require(
            msg.sender == DLLStack._nodes[key].nftListing.seller,
            "Only Lister"
        );
        _;
    }

    constructor(address _auctionOwner, uint256 _listingFee) {
        auctionOwner = _auctionOwner;
        listingFee = _listingFee;
    }

    function listNft(
        address tokenFactAddr,
        uint256 tokenId,
        uint256 price
    ) external payable auctionInactive {
        require(msg.value == listingFee, "listNft: Incorrect amount");
        DLLStack._pushToStack(tokenFactAddr, tokenId, price);
        IERC721(tokenFactAddr).transferFrom(msg.sender, address(this), tokenId);
        emit AuctionNft(msg.sender, tokenFactAddr, tokenId, price);
    }

    function delistNft(address tokenFactAddr, bytes32 key)
        external
        onlyLister(key)
        auctionInactive
    {
        uint256 tokenId = DLLStack._nodes[key].nftListing.tokenId;
        uint256 price = DLLStack._nodes[key].nftListing.price;
        DLLStack._removeStackItem(key);
        IERC721(tokenFactAddr).transferFrom(address(this), msg.sender, tokenId);
        emit AuctionNft(msg.sender, tokenFactAddr, tokenId, price);
    }

    function changeNftPrice(bytes32 key, uint256 newPrice)
        external
        onlyLister(key)
    {
        uint256 price = DLLStack._nodes[key].nftListing.price;
        uint256 tokenId = DLLStack._nodes[key].nftListing.tokenId;
        DLLStack._changeNftListingPrice(key, newPrice);
        emit NewPrice(tokenId, price, newPrice);
    }

    function startAuction() external onlyOwner {
        require(DLLStack.stackSize > 0, "startAuction: No listings");
        DLLStack.Node memory firstListing = _getTopOfStack();
        bytes32 firstListingKey = firstListing.key;
        DLLStack._auctionItemStart(firstListingKey);
        auctionState = AuctionState.ACTIVE;
        emit AuctionStatus(true);
    }

    // TODO: FIGURE OUT A BID SYSTEM.
    // TODO: IMPLEMENT A WAY TO TRANSFER THE NFT TO EITHER THE HIGHEST BIDDER,
    // OR BACK TO THE ORIGINAL SELLER IF NO ONE BIDS ON IT.
    function auctionNextNft() external onlyOwner {
        DLLStack.Node memory listing = _getTopOfStack();
        uint256 startTime = listing.nftListing.startTime;
        require(
            block.timestamp > startTime + 15 minutes,
            "auctionNextNft: Not enough time has ellapsed"
        );
        DLLStack._popFromStack();
        DLLStack.Node memory nextListing = _getTopOfStack();
        DLLStack._auctionItemStart(nextListing.key);
        emit AuctionNft(
            nextListing.nftListing.seller,
            nextListing.nftListing.tokenFactAddr,
            nextListing.nftListing.tokenId,
            nextListing.nftListing.price
        );
    }

    function changeListingFee(uint256 newFee) external onlyOwner {
        listingFee = newFee;
    }

    function getCurrentNft() external view returns (DLLStack.Node memory) {
        return DLLStack._getTopOfStack();
    }

    function getAllListings() external view returns (DLLStack.Node[] memory) {
        return DLLStack._getStackItems();
    }
}
