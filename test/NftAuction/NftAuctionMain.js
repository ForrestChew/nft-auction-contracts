const {
  loadFixture,
  mine,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const {
  contractFixtures,
  createSingleNftAndApproveAuction,
  createMultipleNftsAndApproveAuction,
  listMultipleNftsForAuction,
  buyNftAtAuction,
} = require("../fixtures");
const { itParam } = require("mocha-param");

describe("NftAuction", () => {
  let listingFee = ethers.utils.parseEther("0.1");
  let biddingFee = ethers.utils.parseEther("0.01");
  describe("Deployment", () => {
    it("Deploys NftAuction smart contract", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(nftAuction.address.length).to.equal(42);
    });
    it("Sets the correct auction owner address", async () => {
      const { nftAuction, auctionOwner } = await loadFixture(contractFixtures);
      expect(await nftAuction.auctionOwner()).to.equal(auctionOwner.address);
    });
    it("Sets the correct auction listing fee", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(await nftAuction.listingFee()).to.equal(listingFee);
    });
    it("Sets the correct auction bidding fee", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(await nftAuction.biddingFee()).to.equal(biddingFee);
    });
    it("Sets the initial auction state", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      const inactive = 0;
      expect(await nftAuction.auctionState()).to.equal(inactive);
    });
  });
  describe("Listing an Nft", () => {
    describe("Lists nft for auction", () => {
      let price;
      let randSigner;
      let nftFactAddr;
      let nftAuctionInstance;
      let currentNft;
      let nftFactoryInstance;
      beforeEach(async () => {
        const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
          createSingleNftAndApproveAuction
        );
        nftAuctionInstance = nftAuction;
        nftFactAddr = nftFactory.address;
        randSigner = randAccount_1;
        nftFactoryInstance = nftFactory;
        price = ethers.utils.parseEther("1");
        const tokenId = 1;
        await nftAuction
          .connect(randSigner)
          .listNft(nftFactAddr, tokenId, price, {
            value: listingFee,
          });
        currentNft = await nftAuction.getCurrentNft();
      });
      it("Sets listing ID to Nft ID 1", async () => {
        expect(currentNft[0][0]).to.equal(1);
      });
      it("Sets listing starting price to 1 ETH", async () => {
        expect(currentNft[0][1]).to.equal(price);
      });
      it("Sets listing startingTime to current block time", async () => {
        expect(currentNft[0][2]).to.be.greaterThan(0);
      });
      it("Sets listing token factory addr to Nft collection addr", async () => {
        expect(currentNft[0][3]).to.equal(nftFactAddr);
      });
      it("Sets listing token seller addr to Nft lister", async () => {
        expect(currentNft[0][4]).to.equal(randSigner.address);
      });
      it("Sets listing owner addr to Nft auction contract", async () => {
        expect(currentNft[0][5]).to.equal(nftAuctionInstance.address);
      });
      it("Transfers ownership of nft from lister to auction smart contract", async () => {
        const tokenId = 1;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionInstance.address
        );
      });
    });
    describe("Lists Nft for auction reverts", () => {
      let nftAuctionInstance;
      let nftFactoryInstance;
      let nftId;
      let randSigner;
      beforeEach(async () => {
        const { nftFactory, nftAuction, randAccount_1, tokenId } =
          await loadFixture(createSingleNftAndApproveAuction);
        nftAuctionInstance = nftAuction;
        nftFactoryInstance = nftFactory;
        randSigner = randAccount_1;
        nftId = tokenId;
      });
      it("Reverts when incorrect listing fee is used", async () => {
        const incorrectFee = ethers.utils.parseEther("2");
        const price = ethers.utils.parseEther("1");
        await expect(
          nftAuctionInstance
            .connect(randSigner)
            .listNft(nftAuctionInstance.address, nftId, price, {
              value: incorrectFee,
            })
        ).to.be.revertedWith("listNft: Incorrect amount");
      });
      it("Reverts when auction is active", async () => {
        const price = ethers.utils.parseEther("1");
        const tokenUri_2 = "https://pinata.some_uri_2";
        await nftFactoryInstance
          .connect(randSigner)
          .createCollectable(tokenUri_2);
        await nftAuctionInstance
          .connect(randSigner)
          .listNft(nftFactoryInstance.address, nftId, price, {
            value: listingFee,
          });
        await nftAuctionInstance.startAuction();
        const secondTokenId = 2;
        await expect(
          nftAuctionInstance
            .connect(randSigner)
            .listNft(nftFactoryInstance.address, secondTokenId, price, {
              value: listingFee,
            })
        ).to.be.revertedWith("Auction must be INACTIVE");
      });
    });
    it("Lists multiple Nfts for auction", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        createMultipleNftsAndApproveAuction
      );
      const price = ethers.utils.parseEther("1");
      const listingFee = ethers.utils.parseEther("0.1");
      for (let i = 0; i < 3; i++) {
        const tokenId = i + 1;
        await nftAuction
          .connect(randAccount_1)
          .listNft(nftFactory.address, tokenId, price, {
            value: listingFee,
          });
      }
      const nftListings = await nftAuction.getAllListings();
      expect(nftListings.length).to.equal(3);
    });
  });
  describe("Delisting an Nft", () => {
    it("Removes individual Nft listing from anywhere in stack", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      expect(nftListingsBeforeDelist.length).to.equal(3);
      const secondListingNodeKey = nftListingsBeforeDelist[1].key;
      await nftAuction
        .connect(randAccount_1)
        .delistNft(nftFactory.address, secondListingNodeKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist.length).to.equal(2);
    });
    it("Removes individual Nft listings and reasigns next and prev keys", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      const firstListingNextKey = nftListingsBeforeDelist[0].next;
      const firstListingKey = nftListingsBeforeDelist[0].key;
      const secondListingKey = nftListingsBeforeDelist[1].key;
      const thirdListingKey = nftListingsBeforeDelist[2].key;
      expect(firstListingNextKey).to.equal(secondListingKey);
      await nftAuction
        .connect(randAccount_1)
        .delistNft(nftFactory.address, secondListingKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist[0].next).to.equal(thirdListingKey);
      expect(nftListingsAfterDelist[1].prev).to.equal(firstListingKey);
    });
  });
  describe("Starting Auction", () => {
    let nftAuctionInstance;
    let nftFactoryInstance;
    let randSigner;
    beforeEach(async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      await nftAuction.startAuction();
      nftAuctionInstance = nftAuction;
      nftFactoryInstance = nftFactory;
      randSigner = randAccount_1;
    });
    it("Sets auction state to ACTIVE", async () => {
      const active = 1;
      expect(await nftAuctionInstance.auctionState()).to.equal(active);
    });
    describe("Auction Cycle", () => {
      it("Sets the next Nft for auction", async () => {
        expect(await nftAuctionInstance.stackSize()).to.equal(3);
        await mine(1000);
        await nftAuctionInstance.auctionNextNft();
        const currentNft = await nftAuctionInstance.getCurrentNft();
        expect(await nftAuctionInstance.stackSize()).to.equal(2);
        const tokenId = 2;
        expect(currentNft[0][0]).to.equal(tokenId);
      });
      it("Pushes finished item key to post bid storage", async () => {
        await mine(1000);
        await nftAuctionInstance.auctionNextNft();
        const postBidItemKeys = await nftAuctionInstance.getPostBidItemKeys();
        expect(postBidItemKeys.length).to.equal(1);
      });
      it("Sets the listing keeper address to the highest", async () => {
        const bidAmount = ethers.utils.parseEther("2");
        const currentNftBeforeBid = await nftAuctionInstance.getCurrentNft();
        expect(currentNftBeforeBid[0].keeper).to.equal(
          nftAuctionInstance.address
        );
        await nftAuctionInstance.bidOnNft(bidAmount, { value: biddingFee });
        const currentNftAfterBid = await nftAuctionInstance.getCurrentNft();
        const bidder = await ethers.getSigner();
        expect(currentNftAfterBid[0].keeper).to.equal(bidder.address);
      });
      it("Sets the bidders refundable bid balance", async () => {
        const bidAmount = ethers.utils.parseEther("2");
        const refundableBidBalBeforeBid = await nftAuctionInstance.getBalance();
        expect(refundableBidBalBeforeBid).to.equal(0);
        await nftAuctionInstance.bidOnNft(bidAmount, { value: biddingFee });
        const refundableBidBalAfterBid = await nftAuctionInstance.getBalance();
        expect(refundableBidBalAfterBid).to.equal(biddingFee);
      });
      itParam(
        "Sets the current listing price to ${value} ETH on successful bid",
        [2, 2.1, 3, 10, 2.354, 100],
        async (bid) => {
          const bidAmount = ethers.utils.parseEther(bid.toString());
          const currentNftBeforeBid = await nftAuctionInstance.getCurrentNft();
          const currentPrice = ethers.utils.parseEther("1");
          expect(currentNftBeforeBid[0].price).to.equal(currentPrice);
          await nftAuctionInstance.bidOnNft(bidAmount, { value: biddingFee });
          const currentNftAfterBid = await nftAuctionInstance.getCurrentNft();
          expect(currentNftAfterBid[0].price).to.equal(bidAmount);
        }
      );
      it("Transfers Nft back to seller if no one bids on it", async () => {
        await mine(1000);
        const tokenId = 3;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionInstance.address
        );
        await nftAuctionInstance.auctionNextNft();
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          randSigner.address
        );
      });
      it("Ends auction", async () => {
        for (let i = 0; i < 3; i++) {
          await mine(1000);
          await nftAuctionInstance.auctionNextNft();
        }
        await nftAuctionInstance.endAuction();
        const INACTIVE = 0;
        expect(await nftAuctionInstance.auctionState()).to.equal(INACTIVE);
      });
    });
    describe("Auction Cycle Reverts", () => {
      it("Reverts setting the next Nft for auction when not enough time ellapses", async () => {
        const { nftAuction } = await loadFixture(listMultipleNftsForAuction);
        expect(await nftAuction.stackSize()).to.equal(3);
        await nftAuction.startAuction();
        await expect(nftAuction.auctionNextNft()).to.be.revertedWith(
          "auctionNextNft: Not enough time has ellapsed"
        );
      });
      itParam(
        "Reverts when wrong bid fee of ${value} ETH is sent with TX",
        [0.23, 0, 1],
        async (bidFee) => {
          const { nftAuction } = await loadFixture(listMultipleNftsForAuction);
          await nftAuction.startAuction();
          const wrongBiddingFee = ethers.utils.parseEther(bidFee.toString());
          const bidValue = ethers.utils.parseEther("2");
          await expect(
            nftAuction.bidOnNft(bidValue, { value: wrongBiddingFee })
          ).to.be.revertedWith("bidOnNft: Needs bid fee");
        }
      );
      itParam(
        "Reverts when bid of ${value} ETH is < current Nft price",
        [0.99, 0.953, 1],
        async (bidAmount) => {
          const { nftAuction } = await loadFixture(listMultipleNftsForAuction);
          await nftAuction.startAuction();
          const wrongBid = ethers.utils.parseEther(bidAmount.toString());
          await expect(
            nftAuction.bidOnNft(wrongBid, { value: biddingFee })
          ).to.be.revertedWith("bidOnNft: Bid must be > curPrice");
        }
      );
      it("Reverts if non owner address tries to end auction", async () => {
        for (let i = 0; i < 3; i++) {
          await mine(1000);
          await nftAuctionInstance.auctionNextNft();
        }
        await expect(
          nftAuctionInstance.connect(randSigner).endAuction()
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("Reverts if not all Nfts have finished auctioning", async () => {
        for (let i = 0; i < 2; i++) {
          await mine(1000);
          await nftAuctionInstance.auctionNextNft();
        }
        await expect(nftAuctionInstance.endAuction()).to.be.revertedWith(
          "endAuction: auction has not ended"
        );
      });
    });
  });
  describe("Auction Settlements", () => {
    let nftAuctionInstance;
    let nftFactoryInstance;
    let signer;
    let soldItemKey;
    const itemPrice = ethers.utils.parseEther("2");
    beforeEach(async () => {
      const { nftAuction, nftFactory, randAccount_1, soldItemKeyArr } =
        await loadFixture(buyNftAtAuction);
      nftAuctionInstance = nftAuction;
      nftFactoryInstance = nftFactory;
      signer = randAccount_1;
      soldItemKey = soldItemKeyArr[0];
    });
    describe("Settle Nft listing", () => {
      it("Transfers bought Nft to bidder", async () => {
        const tokenId = 1;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionInstance.address
        );
        const keeper = await ethers.getSigner();
        await nftAuctionInstance.settleItem(soldItemKey, {
          value: itemPrice,
        });
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          keeper.address
        );
      });
      it("Adjusts balances of seller and keeper", async () => {
        await nftAuctionInstance.settleItem(soldItemKey, {
          value: itemPrice,
        });
        const bidFee = ethers.utils.parseEther("0.01");
        expect(await nftAuctionInstance.getBalance()).to.equal(bidFee);
        expect(await nftAuctionInstance.connect(signer).getBalance()).to.equal(
          itemPrice
        );
      });
      it("Deletes auction item", async () => {
        await nftAuctionInstance.settleItem(soldItemKey, {
          value: itemPrice,
        });
        const postBidItemKeysArr =
          await nftAuctionInstance.getPostBidItemKeys();
        expect(postBidItemKeysArr.length).to.equal(0);
        const nftListingsArr = await nftAuctionInstance.getAllListings();
        expect(nftListingsArr.length).to.equal(0);
      });
    });
    describe("Withdraw ETH", () => {
      beforeEach(async () => {
        await nftAuctionInstance.settleItem(soldItemKey, {
          value: itemPrice,
        });
      });
      it("Seller withdraws Nft sale funds", async () => {
        const balanceBeforeWithdrawl = await nftAuctionInstance
          .connect(signer)
          .getBalance();
        const itemPrice = ethers.utils.parseEther("2");
        expect(balanceBeforeWithdrawl).to.equal(itemPrice);
        await nftAuctionInstance.connect(signer).withdrawEth();
        const balanceAfterWithdrawl = await nftAuctionInstance
          .connect(signer)
          .getBalance();
        expect(balanceAfterWithdrawl).to.equal(0);
      });
      it("Bidder withdraws bid fees", async () => {
        const balanceBeforeWithdrawl = await nftAuctionInstance.getBalance();
        const bidFee = ethers.utils.parseEther("0.01");
        expect(balanceBeforeWithdrawl).to.equal(bidFee);
        await nftAuctionInstance.withdrawEth();
        const balanceAfterWithdrawl = await nftAuctionInstance.getBalance();
        expect(balanceAfterWithdrawl).to.equal(0);
      });
    });
  });
  describe("Auction Settlements Reverts", () => {
    let nftAuctionInstance;
    let nftFactoryInstance;
    let signer;
    let soldItemKey;
    const itemPrice = ethers.utils.parseEther("2");
    beforeEach(async () => {
      const { nftAuction, nftFactory, randAccount_1, soldItemKeyArr } =
        await loadFixture(buyNftAtAuction);
      nftAuctionInstance = nftAuction;
      nftFactoryInstance = nftFactory;
      signer = randAccount_1;
      soldItemKey = soldItemKeyArr[0];
    });
    it("Reverts non won Nft settlement", async () => {
      await expect(
        nftAuctionInstance.connect(signer).settleItem(soldItemKey, {
          value: itemPrice,
        })
      ).to.revertedWith("settleItem: Wrong addr");
    });
    it("Reverts Nft settlement when wrong amount is paid", async () => {
      const wrongItemPrice = ethers.utils.parseEther("1");
      await expect(
        nftAuctionInstance.settleItem(soldItemKey, {
          value: wrongItemPrice,
        })
      ).to.revertedWith("settleItem: Wrong amount");
    });
  });
});
