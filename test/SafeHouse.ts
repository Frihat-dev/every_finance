import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SafeHouse", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const manager = accounts[2];

    const Assets = await ethers.getContractFactory("AssetBook");
    const assets = await Assets.deploy(admin.address, manager.address);
    const SafeHouse = await ethers.getContractFactory("contracts/common/SafeHouse.sol:SafeHouse");
    const safeHouse = await SafeHouse.deploy(
      assets.address,
      admin.address,
      manager.address
    );

    return { assets, safeHouse, accounts, owner, admin, manager };
  }

  describe("Deployment", function () {
    it("Should set the Role DEFAULT_ADMIN_ROLE to admin", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const ADMIN = await assets.DEFAULT_ADMIN_ROLE();
      expect(await safeHouse.hasRole(ADMIN, admin.address)).to.equal(true);
    });
    it("Should set the Role MANAGER to manager", async function () {
      const { assets, safeHouse, accounts, owner, manager } =
        await deployeFixture();
      const MANAGER = await safeHouse.MANAGER();
      expect(await safeHouse.hasRole(MANAGER, manager.address)).to.equal(true);
    });
  });

  describe("updateMaxWithdrawalCapacity", function () {
    it("Should revert when caller is not admin", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await expect(
        safeHouse
          .connect(manager)
          .updateMaxWithdrawalCapacity(maxWithdrawalCapacity)
      ).to.be.revertedWith;
    });

    it("Should update MaxwithdrawalCapacity in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const maxwithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxwithdrawalCapacity);

      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxwithdrawalCapacity
      );
    });

    it("Should emit the event updateMaxWithdrawalCapacity in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await expect(
        safeHouse
          .connect(admin)
          .updateMaxWithdrawalCapacity(maxWithdrawalCapacity)
      )
        .to.emit(safeHouse, "UpdateMaxWithdrawalCapacity")
        .withArgs(maxWithdrawalCapacity);
    });
  });

  describe("updateWithdrawalCapacity", function () {
    it("Should revert when caller is not the owner", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await expect(
        safeHouse.connect(manager).updateWithdrawalCapacity(withdrawalCapacity)
      ).to.be.revertedWith;
    });

    it("Should update withdrawalCapacity in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      expect(await safeHouse.withdrawalCapacity()).to.equal(withdrawalCapacity);
    });

    it("Should emit the event updateWithdrawalCapacity in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await expect(
        safeHouse.connect(admin).updateWithdrawalCapacity(withdrawalCapacity)
      )
        .to.emit(safeHouse, "UpdateWithdrawalCapacity")
        .withArgs(withdrawalCapacity);
    });
  });

  describe("updatePriceToleranceRate", function () {
    it("Should revert when caller is not the admin", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const priceToleranceRate = 10_000_000;
      await expect(
        safeHouse.connect(manager).updatePriceToleranceRate(priceToleranceRate)
      ).to.be.revertedWith;
    });

    it("Should revert when priceToleranceRate is  out of range", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const priceToleranceRate = 100_000_001;
      await expect(
        safeHouse.connect(admin).updatePriceToleranceRate(priceToleranceRate)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should update priceToleranceRate in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const priceToleranceRate = 10_000_000;
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);

      expect(await safeHouse.priceToleranceRate()).to.equal(priceToleranceRate);
    });

    it("Should emit the event UpdatePriceToleranceRate", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const priceToleranceRate = 10_000_000;

      await expect(
        safeHouse.connect(admin).updatePriceToleranceRate(priceToleranceRate)
      )
        .to.emit(safeHouse, "UpdatePriceToleranceRate")
        .withArgs(priceToleranceRate);
    });
  });

  describe("updateAssetBook", function () {
    it("Should revert when caller is not the owner", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const assetAddress = assets.address;
      await expect(safeHouse.connect(admin).updateAssetBook(assetAddress)).to.be
        .revertedWith;
    });

    it("Should revert when assets'address is zero", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const assetAddress = "0x0000000000000000000000000000000000000000";
      await expect(
        safeHouse.connect(admin).updateAssetBook(assetAddress)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should emit the event UpdateAssets", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const AssetBook = await ethers.getContractFactory("AssetBook");
      const assetBook = await AssetBook.deploy(admin.address, manager.address);
      await expect(safeHouse.connect(admin).updateAssetBook(assetBook.address))
        .to.emit(safeHouse, "UpdateAssetBook")
        .withArgs(assetBook.address);
    });
  });

  describe("addVault", function () {
    it("Should revert when caller is not the owner", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await expect(safeHouse.connect(manager).addVault(vault)).to.be
        .revertedWith;
    });

    it("Should revert when vault'address is zero", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = "0x0000000000000000000000000000000000000000";
      await expect(safeHouse.connect(admin).addVault(vault)).to.be.revertedWith(
        "Every.finance: zero address"
      );
    });

    it("Should revert when vault exists", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await safeHouse.connect(admin).addVault(vault);
      await expect(safeHouse.connect(admin).addVault(vault)).to.be.revertedWith(
        "Every.finance: vault exists"
      );
    });

    it("Should update vaults in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await safeHouse.connect(admin).addVault(vault);
      expect(await safeHouse.vaults(vault)).to.equal(true);
    });

    it("Should emit the event AddVault", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await expect(safeHouse.connect(admin).addVault(vault))
        .to.emit(safeHouse, "AddVault")
        .withArgs(vault);
    });
  });

  describe("removeVault", function () {
    it("Should revert when caller is not the owner", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await safeHouse.connect(admin).addVault(vault);
      await expect(safeHouse.connect(manager).removeVault(vault)).to.be
        .revertedWith;
    });

    it("Should revert when vault doesn't exist", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await expect(
        safeHouse.connect(manager).removeVault(vault)
      ).to.be.revertedWith("Every.finance: no vault");
    });

    it("Should update vaults in the storage ", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await safeHouse.connect(admin).addVault(vault);
      await safeHouse.connect(manager).removeVault(vault);
      expect(await safeHouse.vaults(vault)).to.equal(false);
    });

    it("Should emit the event RemoveVault", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const vault = accounts[4].address;
      await safeHouse.connect(admin).addVault(vault);
      await expect(safeHouse.connect(manager).removeVault(vault))
        .to.emit(safeHouse, "RemoveVault")
        .withArgs(vault);
    });
  });
  describe("withdrawAsset", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(caller)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert when amount is higher than withdrawalCapacity when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });

    it("Should revert when amount is higher than maxWithdrawalCapacity when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });
    it("Should update withdrawalCapacity in the storage when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity =
        withdrawalCapacity -
        value +
        (value * priceToleranceRate) / FACTOR_Decimals;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const expectedManagerBalance = amountToWithdraw / 10 ** 12;
      const expectedSafeHouseBalance =
        amountToMint - amountToWithdraw / 10 ** 12;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);

      expect(await stableToken.balanceOf(manager.address)).to.equal(
        expectedManagerBalance
      );
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );
    });
    it("Should emit the event WithdrawAsset when assset is when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      )
        .to.emit(safeHouse, "WithdrawAsset")
        .withArgs(manager.address, stableToken.address, amountToWithdraw);
    });
  });
  describe("withdrawAsset", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(caller)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert when amount is higher than withdrawalCapacity when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });

    it("Should revert when amount is higher than maxWithdrawalCapacity when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });
    it("Should update withdrawalCapacity in the storage when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity =
        withdrawalCapacity -
        value +
        (value * priceToleranceRate) / FACTOR_Decimals;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity =
        withdrawalCapacity -
        value +
        (value * priceToleranceRate) / FACTOR_Decimals;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const expectedManagerBalance = amountToWithdraw;
      const expectedSafeHouseBalance = amountToMint - amountToWithdraw;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await safeHouse
        .connect(manager)
        .withdrawAsset(stableToken.address, amountToWithdraw);
      expect(await stableToken.balanceOf(manager.address)).to.equal(
        expectedManagerBalance
      );
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );
    });

    it("Should emit the event WithdrawAsset when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .withdrawAsset(stableToken.address, amountToWithdraw)
      )
        .to.emit(safeHouse, "WithdrawAsset")
        .withArgs(manager.address, stableToken.address, amountToWithdraw);
    });
  });

  describe("withdrawAsset", function () {
    it("Should revert when caller is not the manager when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = ethers.utils.parseEther("10");
      const amountToWithdraw = 1_000_000_000_000_000_000n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(caller).withdrawAsset(asset, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert when amount is higher than withdrawalCapacity when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = ethers.utils.parseEther("10");
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });

    it("Should revert when amount is higher than maxWithdrawalCapacity when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 100000000n;
      const amountToMint = ethers.utils.parseEther("2000");
      const amountToWithdraw = 1_000_000_000_000_000_000_001n;
      const priceToleranceRate = 10_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: maximum withdrawal amount");
    });

    it("Should update withdrawalCapacity in the storage when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = ethers.utils.parseEther("10");
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity =
        withdrawalCapacity -
        value +
        (value * priceToleranceRate) / FACTOR_Decimals;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw);
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = ethers.utils.parseEther("10");
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw);
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 10_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw)
      ).to.changeEtherBalances(
        [safeHouse, manager],
        [-amountToWithdraw, amountToWithdraw]
      );
    });
    it("Should emit the event WithdrawAsset when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updatePriceToleranceRate(priceToleranceRate);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse.connect(manager).withdrawAsset(asset, amountToWithdraw)
      )
        .to.emit(safeHouse, "WithdrawAsset")
        .withArgs(manager.address, asset, amountToWithdraw);
    });
  });
  describe("depositAsset", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(caller)
          .depositAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should update withdrawalCapacity in the storage when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedManagerBalance = amountToMint - amountToWithdraw / 10 ** 12;
      const expectedSafeHouseBalance = amountToWithdraw / 10 ** 12;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);

      expect(await stableToken.balanceOf(manager.address)).to.equal(
        expectedManagerBalance
      );
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );

      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should emit the event depositAsset when assset is when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .depositAsset(stableToken.address, amountToWithdraw)
      )
        .to.emit(safeHouse, "DepositAsset")
        .withArgs(manager.address, stableToken.address, amountToWithdraw);
    });
  });

  describe("depositAsset", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(caller)
          .depositAsset(stableToken.address, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should update withdrawalCapacity in the storage when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedManagerBalance = amountToMint - amountToWithdraw;
      const expectedSafeHouseBalance = amountToWithdraw;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .depositAsset(stableToken.address, amountToWithdraw);

      expect(await stableToken.balanceOf(manager.address)).to.equal(
        expectedManagerBalance
      );
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );

      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });
    it("Should emit the event depositAsset when assset is when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await stableToken
        .connect(manager)
        .approve(safeHouse.address, amountToWithdraw);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .depositAsset(stableToken.address, amountToWithdraw)
      )
        .to.emit(safeHouse, "DepositAsset")
        .withArgs(manager.address, stableToken.address, amountToWithdraw);
    });
  });

  describe("depositAsset", function () {
    it("Should revert when caller is not the manager when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;

      const amountToWithdraw = ethers.utils.parseEther("10");
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(caller)
          .depositAsset(asset, amountToWithdraw, { value: amountToWithdraw })
      ).to.be.revertedWith;
    });

    it("Should revert when amount is different from msg.value when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;

      const amountToWithdraw1 = ethers.utils.parseEther("10");
      const amountToWithdraw2 = ethers.utils.parseEther("11");
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .depositAsset(asset, amountToWithdraw1, { value: amountToWithdraw2 })
      ).to.be.revertedWith("Every.finance: wrong amount");
    });
    it("Should update withdrawalCapacity in the storage when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;

      const amountToWithdraw = 1_000_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(manager).depositAsset(asset, amountToWithdraw, {
        value: amountToWithdraw.toString(),
      });
      expect(await safeHouse.withdrawalCapacity()).to.equal(
        expectedWithdrawalCapacity
      );
    });

    it("Should keep constant maxWithdrawalCapacity in the storage when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;

      const amountToWithdraw = 1_000_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(manager).depositAsset(asset, amountToWithdraw, {
        value: amountToWithdraw.toString(),
      });
      expect(await safeHouse.maxWithdrawalCapacity()).to.equal(
        maxWithdrawalCapacity
      );
    });

    it("Should update asset balance for both SafeHouse and manager when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 10_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedWithdrawalCapacity = withdrawalCapacity + value;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).depositAsset(asset, amountToWithdraw, {
          value: amountToWithdraw.toString(),
        })
      ).to.changeEtherBalances(
        [safeHouse, manager],
        [amountToWithdraw, -amountToWithdraw]
      );
    });
    it("Should emit the event depositAsset when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const priceToleranceRate = 10000000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse.connect(manager).depositAsset(asset, amountToWithdraw, {
          value: amountToWithdraw.toString(),
        })
      )
        .to.emit(safeHouse, "DepositAsset")
        .withArgs(manager.address, asset, amountToWithdraw);
    });
  });

  describe("sendToVault", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[2].address;
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await safeHouse.connect(admin).addVault(vault);

      await expect(
        safeHouse
          .connect(caller)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert if no vault when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();

      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no vault");
    });

    it("Should revert if no asset when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();

      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;

      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(admin).addVault(vault);

      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no asset");
    });

    it("Should update asset balance for both SafeHouse and vault when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const vault = accounts[3].address;
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedVaultBalance = amountToWithdraw / 10 ** 12;
      const expectedSafeHouseBalance =
        amountToMint - amountToWithdraw / 10 ** 12;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);

      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .sendToVault(stableToken.address, vault, amountToWithdraw);

      expect(await stableToken.balanceOf(vault)).to.equal(expectedVaultBalance);
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );
    });
    it("Should emit the event AddToVault when asset ERC20 decimal 6", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 6;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const vault = accounts[3].address;
      const price = 200000000;
      const amountToMint = 100_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      )
        .to.emit(safeHouse, "SendToVault")
        .withArgs(stableToken.address, vault, amountToWithdraw);
    });
  });

  describe("sendToVault", function () {
    it("Should revert when caller is not the manager when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4];
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToMint = 1_000_000_000_000_000_000_000_000n;
      const amountToWithdraw = 1_000_000_000_000_000_000_000n;
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await safeHouse.connect(admin).addVault(vault);

      await expect(
        safeHouse
          .connect(caller)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert if no vault when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no vault");
    });

    it("Should revert if no asset when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();

      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const vault = accounts[3].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;

      await stableToken.connect(owner).mint(manager.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse.connect(admin).addVault(vault);
      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no asset");
    });

    it("Should update asset balance for both SafeHouse and vault when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const vault = accounts[3].address;
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      const value = (amountToWithdraw * price) / FACTOR_Decimals;
      const expectedVaultBalance = amountToWithdraw;
      const expectedSafeHouseBalance = amountToMint - amountToWithdraw;

      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);

      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await safeHouse
        .connect(manager)
        .sendToVault(stableToken.address, vault, amountToWithdraw);

      expect(await stableToken.balanceOf(vault)).to.equal(expectedVaultBalance);
      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        expectedSafeHouseBalance
      );
    });
    it("Should emit the event AddToVault when asset ERC20 decimal 18", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const decimals = 18;
      const StableToken = await ethers.getContractFactory("StableToken");
      const stableToken = await StableToken.deploy(decimals);
      const oracle = "0x0000000000000000000000000000000000000000";
      const vault = accounts[3].address;
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      const FACTOR_Decimals = 10 ** 8;
      await assets
        .connect(admin)
        .updateAsset(stableToken.address, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await stableToken.connect(owner).mint(safeHouse.address, amountToMint);
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse
          .connect(manager)
          .sendToVault(stableToken.address, vault, amountToWithdraw)
      )
        .to.emit(safeHouse, "SendToVault")
        .withArgs(stableToken.address, vault, amountToWithdraw);
    });
  });

  describe("sendToVault", function () {
    it("Should revert when caller is not the manager when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const vault = accounts[5].address;
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToWithdraw = ethers.utils.parseEther("10");
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToWithdraw,
      });
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(caller).sendToVault(asset, vault, amountToWithdraw)
      ).to.be.revertedWith;
    });

    it("Should revert if no vault when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const vault = accounts[5].address;
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;
      const amountToWithdraw = ethers.utils.parseEther("10");
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;

      await assets.connect(admin).updateAsset(asset, oracle, price);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToWithdraw,
      });
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).sendToVault(asset, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no vault");
    });

    it("Should revert if no asset when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const vault = accounts[5].address;
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000n;

      const amountToWithdraw = ethers.utils.parseEther("10");
      const withdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      const maxWithdrawalCapacity = 1_000_000_000_000_000_000_000_000n;
      await safeHouse.connect(admin).addVault(vault);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToWithdraw,
      });
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).sendToVault(asset, vault, amountToWithdraw)
      ).to.be.revertedWith("Every.finance: no asset");
    });

    it("Should update asset balance for both SafeHouse and vault when asset is Ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const vault = accounts[5].address;
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);

      await expect(
        safeHouse.connect(manager).sendToVault(asset, vault, amountToWithdraw)
      ).to.changeEtherBalances(
        [safeHouse, vault],
        [-amountToWithdraw, amountToWithdraw]
      );
    });
    it("Should emit the event SendToVault when asset is ether", async function () {
      const { assets, safeHouse, accounts, owner, admin, manager } =
        await deployeFixture();
      const caller = accounts[4].address;
      const sender = accounts[3];
      const vault = accounts[5].address;
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 200000000;
      const amountToMint = 1_000_000_000_000;
      const amountToWithdraw = 1_000_000_000_000;
      const withdrawalCapacity = 1_000_000_000_000_000;
      const maxWithdrawalCapacity = 1_000_000_000_000_000;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await safeHouse.connect(admin).addVault(vault);
      await sender.sendTransaction({
        to: safeHouse.address,
        value: amountToMint,
      });
      await safeHouse
        .connect(admin)
        .updateMaxWithdrawalCapacity(maxWithdrawalCapacity);
      await safeHouse
        .connect(admin)
        .updateWithdrawalCapacity(withdrawalCapacity);
      await expect(
        safeHouse.connect(manager).sendToVault(asset, vault, amountToWithdraw)
      )
        .to.emit(safeHouse, "SendToVault")
        .withArgs(asset, vault, amountToWithdraw);
    });
  });
});
