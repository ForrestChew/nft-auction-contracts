const deployNftFactoryFixture = async () => {
  const [nftFactoryDeployer] = await ethers.getSigners();
  const NftFactory = await ethers.getContractFactory("NftFactory");
  const nftFactory = await NftFactory.deploy("TestToken", "TT");

  return { nftFactory, nftFactoryDeployer };
};

const deployNftAuctionFixture = async () => {
  const listingFee = ethers.utils.parseEther("0.1");
  const [auctionOwner, randAccount_1] = await ethers.getSigners();
  const NftAuction = await ethers.getContractFactory("NftAuction");
  const nftAuction = await NftAuction.deploy(auctionOwner.address, listingFee);

  return { nftAuction, listingFee, auctionOwner, randAccount_1 };
};

const contractFixtures = async () => {
  const { nftFactory, nftFactoryDeployer } = await deployNftFactoryFixture();
  const { nftAuction, listingFee, auctionOwner, randAccount_1 } =
    await deployNftAuctionFixture();

  return {
    nftFactory,
    nftFactoryDeployer,
    nftAuction,
    listingFee,
    auctionOwner,
    randAccount_1,
  };
};

module.exports = contractFixtures;
