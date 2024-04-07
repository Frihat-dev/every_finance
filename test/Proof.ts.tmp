import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("proof", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const investment = accounts[2];
    const name = "DALPHA";
    const symbol = "DALPHA";
    const id = 1;
    const tolerance = 100;
    const Proof = await ethers.getContractFactory("Proof");
    const proof = await Proof.deploy(name, symbol, id, admin.address);
    const INVESTMENT = await proof.INVESTMENT();
    proof.connect(admin).grantRole(INVESTMENT, investment.address);
    proof.connect(admin).updateTolerance(tolerance);

    return {
      proof,
      accounts,
      owner,
      admin,
      investment,
      name,
      symbol,
    };
  }

  describe("Deployment", function () {
    it("Should set the name  ", async function () {
      const { proof, accounts, owner, admin, investment, name, symbol } =
        await deployeFixture();
      expect(await proof.name()).to.equal(name);
    });

    it("Should set the symbol  ", async function () {
      const { proof, accounts, owner, admin, investment, name, symbol } =
        await deployeFixture();
      expect(await proof.symbol()).to.equal(symbol);
    });

    it("Should set the DEFAULT_ADMIN_ROLE role ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const ADMIN = await proof.DEFAULT_ADMIN_ROLE();
      expect(await proof.hasRole(ADMIN, admin.address)).to.equal(true);
    });

    it("Should set the INVESTMENT role ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const INVESTMENT = await proof.INVESTMENT();
      expect(await proof.hasRole(INVESTMENT, investment.address)).to.equal(
        true
      );
    });
  });
  describe("updateTolerance", function () {
    it("Should revert when caller is not ADMIN", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const tolerance = 100;
      await expect(proof.connect(caller).updateTolerance(tolerance)).to.be
        .revertedWith;
    });

    it("Should revert when tolerance is higher than TOLERANCE_MAX ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const tolerance = 1001;
      await expect(
        proof.connect(admin).updateTolerance(tolerance)
      ).to.be.revertedWith("Every.finance: tolerance max");
    });

    it("Should revert when tolerance doesn't change ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const tolerance = 100;
      await expect(
        proof.connect(admin).updateTolerance(tolerance)
      ).to.be.revertedWith("Every.finance: no change");
    });
    it("Should update tolerance in the storage", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const tolerance = 50;
      await proof.connect(admin).updateTolerance(tolerance);
      expect(await proof.tolerance()).to.equal(tolerance);
    });
    it("Should emit the event UpdateTolerance", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const tolerance = 50;
      await expect(proof.connect(admin).updateTolerance(tolerance))
        .to.emit(proof, "UpdateTolerance")
        .withArgs(tolerance);
    });
  });

  describe("updateIsOnChainMetada", function () {
    it("Should revert when caller is not ADMIN", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const isOnChain = true;
      await expect(proof.connect(caller).updateIsOnChainMetadata(isOnChain)).to
        .be.revertedWith;
    });

    it("Should revert when no change ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const isOnChain = false;
      await expect(
        proof.connect(admin).updateIsOnChainMetadata(isOnChain)
      ).to.be.revertedWith("Every.finance: no change");
    });

    it("Should update isOnChainMetadata in the storage", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const isOnChain = true;
      await proof.connect(admin).updateIsOnChainMetadata(isOnChain);
      expect(await proof.isOnChainMetadata()).to.equal(isOnChain);
    });

    it("Should emit the event UpdateIsOnChainMetadata", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const isOnChain = true;
      await expect(proof.connect(admin).updateIsOnChainMetadata(isOnChain))
        .to.emit(proof, "UpdateIsOnChainMetadata")
        .withArgs(isOnChain);
    });
  });

  describe("setBaseURI", function () {
    it("Should revert when caller is not ADMIN", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const baseURI = "Every.finance/";
      await expect(proof.connect(caller).setBaseURI(baseURI)).to.be
        .revertedWith;
    });

    it("Should update baseURI in the storage", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const baseURI = "Every.finance/";
      await proof.connect(admin).setBaseURI(baseURI);
      expect(await proof.baseURI()).to.equal(baseURI);
    });

    it("Should emit the event UpdateBaseURI ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const baseURI = "Every.finance/";
      await expect(proof.connect(admin).setBaseURI(baseURI))
        .to.emit(proof, "UpdateBaseURI")
        .withArgs(baseURI);
    });
  });

  describe("mint", function () {
    it("Should revert when caller is not investment", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];

      const account = accounts[4].address;
      const tokenId = 4;
      const amount = 1_000_000_000_000_000_000_000_000n;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      const indexEvent = 1;
      await expect(
        proof
          .connect(caller)
          .mint(account, tokenId, amount, minPrice, maxPrice, indexEvent)
      ).to.be.revertedWith;
    });

    it("Should revert when amount is not zero", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount = 0;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      const indexEvent = 1;
      await expect(
        proof
          .connect(investment)
          .mint(account, tokenId, amount, minPrice, maxPrice, indexEvent)
      ).to.be.revertedWith;
    });

    it("Should mint a new token when the investor has already a token", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId1 = 4;
      const tokenId2 = 8;
      const amount = 1_000_000_000_000_000_000_000_000n;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      const indexEvent = 1;
      await proof
        .connect(investment)
        .mint(account, tokenId1, amount, minPrice, maxPrice, indexEvent);
      await proof
        .connect(investment)
        .mint(account, tokenId2, amount, minPrice, maxPrice, indexEvent);
      expect(
        await proof.connect(investment).tokenOfOwnerByIndex(account, 0)
      ).to.equal(tokenId1);
      expect(
        await proof.connect(investment).tokenOfOwnerByIndex(account, 1)
      ).to.equal(tokenId2);
      expect(await proof.connect(investment).balanceOf(account)).to.equal(2);
    });

    it("Should update investor data in the storage ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount = 1_000_000_000_000_000_000_000_000n;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      const indexEvent = 1;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount, minPrice, maxPrice, indexEvent);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount);
      expect(pendingRequests[2]).to.equal(minPrice);
      expect(pendingRequests[3]).to.equal(maxPrice);
      expect(pendingRequests[4]).to.equal(indexEvent);
      expect(
        await proof.connect(admin).tokenOfOwnerByIndex(account, 0)
      ).to.equal(tokenId);
      expect(await proof.connect(admin).balanceOf(account)).to.equal(1);
    });

    it("Should update investor data in the storage when the investor mints two different tokens ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId1 = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;

      const tokenId2 = 5;
      const amount2 = 2_000_000_000_000_000_000_000_000n;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const indexEvent = 1;
      await proof
        .connect(investment)
        .mint(account, tokenId1, amount1, minPrice1, maxPrice1, indexEvent);

      await proof
        .connect(investment)
        .mint(account, tokenId2, amount2, minPrice2, maxPrice2, indexEvent);

      const pendingRequests1 = await proof.pendingRequests(tokenId1);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2);
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(amount1);
      expect(pendingRequests1[2]).to.equal(minPrice1);
      expect(pendingRequests1[3]).to.equal(maxPrice1);
      expect(pendingRequests1[4]).to.equal(indexEvent);

      const pendingRequests2 = await proof.pendingRequests(tokenId2);
      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount2);
      expect(pendingRequests2[2]).to.equal(minPrice2);
      expect(pendingRequests2[3]).to.equal(maxPrice2);
      expect(pendingRequests2[4]).to.equal(indexEvent);
      expect(
        await proof.connect(admin).tokenOfOwnerByIndex(account, 0)
      ).to.equal(tokenId1);
      expect(
        await proof.connect(admin).tokenOfOwnerByIndex(account, 1)
      ).to.equal(tokenId2);
      expect(await proof.connect(admin).balanceOf(account)).to.equal(2);
    });

    it("Should emit the event Mint ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount = 1_000_000_000_000_000_000_000_000n;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      const indexEvent = 1;

      await expect(
        proof
          .connect(investment)
          .mint(account, tokenId, amount, minPrice, maxPrice, indexEvent)
      )
        .to.emit(proof, "Mint")
        .withArgs(account, tokenId, amount);
    });
  });

  describe("increasePendingRequest", function () {
    it("Should revert when price are changed at two different indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await expect(
        proof
          .connect(investment)
          .increasePendingRequest(
            tokenId,
            amount2,
            minPrice2,
            maxPrice2,
            indexEvent2
          )
      ).to.be.revertedWith("Every.finance: price don't match");
    });
    it("Should update investor's data in the storage when he deposits two times at two different indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2);
      expect(pendingRequests[0]).to.equal(amount1);
      expect(pendingRequests[1]).to.equal(amount2);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent2);
    });

    it("Should update investor's data in the storage when he deposits three times at the same indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 2_000_000_000_000_000_000_000_000n;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const amount3 = 3_000_000_000_000_000_000_000_000n;

      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          indexEvent1
        );
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount3,
          minPrice2,
          maxPrice2,
          indexEvent1
        );

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2 + amount3);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1 + amount2 + amount3);
      expect(pendingRequests[2]).to.equal(minPrice2);
      expect(pendingRequests[3]).to.equal(maxPrice2);
      expect(pendingRequests[4]).to.equal(indexEvent1);
    });

    it("Should update investor's data in the storage when he deposits three times at different indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 2_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 10;
      const amount3 = 3_000_000_000_000_000_000_000_000n;
      const minPrice3 = 96_000_000;
      const maxPrice3 = 120_000_000;

      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          indexEvent2
        );
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2 + amount3);
      expect(pendingRequests[0]).to.equal(amount1);
      expect(pendingRequests[1]).to.equal(amount2 + amount3);
      expect(pendingRequests[2]).to.equal(minPrice3);
      expect(pendingRequests[3]).to.equal(maxPrice3);
      expect(pendingRequests[4]).to.equal(indexEvent2);
    });
  });

  describe("decreasePendingRequest", function () {
    it("Should revert when amount is higher than available amount", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_001n;

      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await expect(
        proof
          .connect(investment)
          .decreasePendingRequest(tokenId, amount2, indexEvent1)
      ).to.be.revertedWith("Every.finance: max amount");
    });
    it("Shouldrevert when investor deposit and cancel at two different indexEvent ", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await expect(
        proof
          .connect(investment)
          .decreasePendingRequest(tokenId, amount2, indexEvent2)
      ).to.be.revertedWith("Every.finance: max amount");
    });

    it("Should update investor's data in the storage when he cancel his deposit", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount2, indexEvent1);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 - amount2);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1 - amount2);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent1);
    });

    it("Should burn nft when the investor cancel his full deposit", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount1, indexEvent1);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });

    it("Should burn nft when the investor cancel his deposit and the remainning amount is lower than tolerance", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_100n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount2, indexEvent1);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });

    it("Should not burn nft when the investor cancel his deposit and the remainning amount is higher than tolerance", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_101n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount2, indexEvent1);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(101);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(101);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent1);
      expect(await proof.balanceOf(account)).to.equal(1);
    });

    it("Should update investor's data in the storage when he cancel many times at the same indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      const amount3 = 200_000_000_000_000_000_000_000n;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount2, indexEvent1);
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount3, indexEvent1);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 - amount2 - amount3);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1 - amount2 - amount3);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent1);
    });

    it("Should update investor's data in the storage when he deposit and cancel many times at different indexEvent", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const amount3 = 200_000_000_000_000_000_000_000n;
      const indexEvent3 = 4;
      const amount4 = 100_000_000_000_000_000_000_000n;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );

      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount3,
          minPrice1,
          maxPrice1,
          indexEvent3
        );
      await proof
        .connect(investment)
        .decreasePendingRequest(tokenId, amount4, indexEvent3);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2 + amount3 - amount4);
      expect(pendingRequests[0]).to.equal(amount1 + amount2);
      expect(pendingRequests[1]).to.equal(amount3 - amount4);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent3);
    });
  });

  describe("preValidatePendingRequest", function () {
    it("Should update investor's data", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const indexEvent3 = 10;

      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent3);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2);
      expect(pendingRequests[0]).to.equal(amount1 + amount2);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent3);
    });
  });

  describe("updateEventId", function () {
    it("Should update investor's data", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const indexEvent3 = 10;

      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof.connect(investment).updateEventId(tokenId, indexEvent3);
      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent3);
    });
  });
  describe("validatePendingRequest", function () {
    it("Should validate investor's request  when he deposits his first request", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent2);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount1, indexEvent2);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });

    it("Should update investor's data when his request is partially valiated", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent2);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount2, indexEvent2);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 - amount2);
      expect(pendingRequests[0]).to.equal(amount1 - amount2);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent2);
      expect(await proof.balanceOf(account)).to.equal(1);
    });

    it("Should burn the nft when his request is partially valiated, but the remainning amount is lower than tolerance", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_100n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent2);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount2, indexEvent2);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });

    it("Should validate investor's request when he makes request many time", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 2_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const indexEvent3 = 3;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent3);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount1 + amount2, indexEvent2);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });

    it("Should update investor's data when his request is partially valiated after making many requests", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 500_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const amount3 = 800_000_000_000_000_000_000_000n;
      const indexEvent3 = 3;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);
      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );
      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent3);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount3, indexEvent3);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(amount1 + amount2 - amount3);
      expect(pendingRequests[0]).to.equal(amount1 + amount2 - amount3);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(indexEvent3);
      expect(await proof.balanceOf(account)).to.equal(1);
    });

    it("Should burn the nft when his request is partially valiated,after making many requests, but the remainning amount is lower than tolerance", async function () {
      const { proof, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const account = accounts[4].address;
      const tokenId = 4;
      const amount1 = 1_000_000_000_000_000_000_000_100n;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const indexEvent1 = 1;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const indexEvent2 = 2;
      const amount3 = 2_000_000_000_000_000_000_000_000n;
      const indexEvent3 = 3;
      await proof
        .connect(investment)
        .mint(account, tokenId, amount1, minPrice1, maxPrice1, indexEvent1);

      await proof
        .connect(investment)
        .increasePendingRequest(
          tokenId,
          amount2,
          minPrice1,
          maxPrice1,
          indexEvent2
        );

      await proof
        .connect(investment)
        .preValidatePendingRequest(tokenId, indexEvent3);

      await proof
        .connect(investment)
        .validatePendingRequest(tokenId, amount3, indexEvent3);

      const pendingRequests = await proof.pendingRequests(tokenId);
      const totalAmount = await proof.totalAmount();
      expect(totalAmount).to.equal(0);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
      expect(await proof.balanceOf(account)).to.equal(0);
    });
    1;
  });
});
