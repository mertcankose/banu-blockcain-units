// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers, BrowserProvider } from "ethers";
import { Edit, Info, Send, Star, Wallet } from "lucide-react";
import backgroundImage from "@/assets/background.jpg";
import { uusdtTokenAbi, p2pBorrowLendingAbi } from "@/assets/abis";
import AOS from "aos";
import "aos/dist/aos.css";

const projectId = "415b280d7f14fd394fac17ffed28e6db";

const metadata = {
  name: "banuchain-dapp",
  description: "Banuchain Dapp",
  url: "https://banuchain.com/",
  icons: ["https://banuchain.com/banuchain.png"],
};

const unit0testnet = {
  id: 88817,
  name: "UNIT ZERO",
  nativeCurrency: {
    name: "UNIT ZERO",
    symbol: "UNIT0",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.unit0.dev"],
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://explorer-testnet.unit0.dev",
    },
  },
};

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [unit0testnet],
  metadata,
  projectId,
  features: {
    analytics: true,
  },
});

const App = () => {
  const UUSDT_TOKEN_ADDRESS = "0xC46643d498067CA186505E2eCD3c4A41A4b76dA0";
  const P2PBORROWLENDING_ADDRESS = "0xd20F9909e920e2ce83c0392B063A6B947d6d49AD";

  const { walletProvider } = useAppKitProvider("eip155");
  const { address, isConnected } = useAppKitAccount();

  const [unitsBalance, setUnitsBalance] = useState("0");
  const [uusdtBalance, setUusdtBalance] = useState("0");
  const [provider, setProvider] = useState(null);

  const [uusdtTokenContract, setUusdtTokenContract] = useState(null);
  const [p2pBorrowLendingContract, setP2pBorrowLendingContract] = useState(null);

  const [activeOffers, setActiveOffers] = useState([]);
  const [userLoans, setUserLoans] = useState([]);
  const [repayingLoans, setRepayingLoans] = useState({});
  const [lendingValues, setLendingValues] = useState({
    uusdtAmount: "",
    collateralRate: "",
    interestRate: "",
    duration: "",
  });

  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  useEffect(() => {
    if (isConnected && walletProvider) {
      const newProvider = new BrowserProvider(walletProvider);
      setProvider(newProvider);
    } else {
      setProvider(null);
    }
  }, [isConnected, walletProvider]);

  useEffect(() => {
    if (isConnected && provider) {
      fetchBalances();
    }
  }, [isConnected, provider, address]);

  useEffect(() => {
    initContracts();
  }, [address, isConnected, provider]);

  useEffect(() => {
    if (p2pBorrowLendingContract && address) {
      fetchActiveOffers();
      fetchUserLoans();
    }
  }, [p2pBorrowLendingContract, address]);

  const initContracts = async () => {
    try {
      if (!isConnected || !provider) {
        setUusdtTokenContract(null);
        setP2pBorrowLendingContract(null);
        return;
      }

      const signer = await provider.getSigner();
      const newUusdtTokenContract = new ethers.Contract(UUSDT_TOKEN_ADDRESS, uusdtTokenAbi, signer);
      const newP2pBorrowLendingContract = new ethers.Contract(P2PBORROWLENDING_ADDRESS, p2pBorrowLendingAbi, signer);

      setUusdtTokenContract(newUusdtTokenContract);
      setP2pBorrowLendingContract(newP2pBorrowLendingContract);
    } catch (err) {
      console.error("Contract initialization error:", err);
      setUusdtTokenContract(null);
      setP2pBorrowLendingContract(null);
    }
  };

  const fetchBalances = async () => {
    try {
      if (!isConnected || !provider || !uusdtTokenContract) return;
      const unit0Bal = await provider.getBalance(address);
      const uusdtBal = await uusdtTokenContract.balanceOf(address);
      setUnitsBalance(ethers.formatEther(unit0Bal));
      setUusdtBalance(ethers.formatEther(uusdtBal));
    } catch (err) {
      console.error("Balance fetch error:", err);
      setUnitsBalance("0");
      setUusdtBalance("0");
    }
  };

  const fetchActiveOffers = async () => {
    if (!p2pBorrowLendingContract) return;
    try {
      const offers = await p2pBorrowLendingContract.getActiveOffers();
      setActiveOffers(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setActiveOffers([]);
    }
  };

  const fetchUserLoans = async () => {
    if (!p2pBorrowLendingContract || !address) return;
    try {
      const loans = await p2pBorrowLendingContract.getUserLoans(address);
      setUserLoans(loans);
    } catch (error) {
      console.error("Error fetching user loans:", error);
      setUserLoans([]);
    }
  };

  const handleCreateOffer = async () => {
    setIsCreatingOffer(true);
    try {
      const uusdtAmount = ethers.parseUnits(lendingValues.uusdtAmount, 18);
      const currentAllowance = await uusdtTokenContract.allowance(address, P2PBORROWLENDING_ADDRESS);

      if (currentAllowance < BigInt(uusdtAmount.toString())) {
        const approveTx = await uusdtTokenContract.approve(P2PBORROWLENDING_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
      }

      const collateralRate = Number(lendingValues.collateralRate);
      const interestRate = Number(lendingValues.interestRate) * 100;
      const duration = Number(lendingValues.duration);

      const tx = await p2pBorrowLendingContract.createOffer(uusdtAmount, collateralRate, interestRate, duration);
      await tx.wait();
      await fetchActiveOffers();
      await fetchBalances();

      setLendingValues({
        uusdtAmount: "",
        collateralRate: "",
        interestRate: "",
        duration: "",
      });
    } catch (error) {
      console.error("Create offer error:", error);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleCancelOffer = async (offerId) => {
    setIsCancelling(true);
    try {
      const tx = await p2pBorrowLendingContract.cancelOffer(offerId);
      await tx.wait();
      await fetchActiveOffers();
      await fetchBalances();
    } catch (error) {
      console.error("Cancel offer error:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleBorrowFromOffer = async (offerId) => {
    setIsBorrowing(true);
    try {
      const offer = activeOffers.find((offer) => offer.id.toString() === offerId.toString());
      if (!offer) return;

      const tx = await p2pBorrowLendingContract.borrowFromOffer(offer.id, {
        value: offer.requiredUNIT0,
      });
      await tx.wait();
      await Promise.all([fetchUserLoans(), fetchBalances(), fetchActiveOffers()]);
    } catch (error) {
      console.error("Borrow error:", error);
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleRepayLoan = async (loanId) => {
    setRepayingLoans((prev) => ({ ...prev, [loanId]: true }));
    try {
      const loan = userLoans.find((loan) => loan.id.toString() === loanId.toString());
      if (!loan) return;

      const interest = (BigInt(loan.uusdtAmount) * BigInt(loan.interestRate)) / BigInt(1000);
      const totalRepayment = BigInt(loan.uusdtAmount) + interest;

      const currentAllowance = await uusdtTokenContract.allowance(address, P2PBORROWLENDING_ADDRESS);
      if (currentAllowance < totalRepayment) {
        const approveTx = await uusdtTokenContract.approve(P2PBORROWLENDING_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
      }

      const tx = await p2pBorrowLendingContract.repayLoan(loan.id);
      await tx.wait();
      await Promise.all([fetchUserLoans(), fetchBalances(), fetchActiveOffers()]);
    } catch (error) {
      console.error("Repay error:", error);
    } finally {
      setRepayingLoans((prev) => ({ ...prev, [loanId]: false }));
    }
  };

  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-repeat opacity-5 pointer-events-none"></div>

      <header className="bg-transparent" data-aos="fade-down">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-wider text-[#2FFA98]">LOGO</div>
          <appkit-button balance="show" label="Connect Wallet" size="md" loadingLabel="Connecting.." />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 relative">
        <div className="grid grid-cols-4 gap-8">
          <div className="col-span-4" data-aos="fade-right">
            <Card className="border border-[#2FFA98]/20 shadow-xl bg-white/5 backdrop-blur-sm text-white">
              <CardHeader className="bg-white/5 rounded-t-lg border-b border-[#2FFA98]/20">
                <div className="flex items-center space-x-2 p-2">
                  <h2 className="text-xl font-bold">P2P Lending Platform</h2>
                </div>
                <Tabs defaultValue="borrow" className="w-full">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger
                      value="borrow"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2FFA98] data-[state=active]:to-[#22DD7B] data-[state=active]:text-black"
                    >
                      Borrow
                    </TabsTrigger>
                    <TabsTrigger
                      value="lending"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2FFA98] data-[state=active]:to-[#22DD7B] data-[state=active]:text-black"
                    >
                      Lending
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lending" className="mt-6">
                    <div className="space-y-6">
                      {/* Create Offer Form */}
                      <div className="bg-white/5 p-6 rounded-lg shadow-md border border-[#2FFA98]/20">
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#2FFA98] mb-2">Create Lending Offer</h3>
                          <p className="text-sm text-gray-400">Fill in the details to create your lending offer</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1.5">
                            <label className="text-sm text-gray-300">Amount (UUSDT)</label>
                            <Input
                              type="number"
                              value={lendingValues.uusdtAmount}
                              onChange={(e) => setLendingValues({ ...lendingValues, uusdtAmount: e.target.value })}
                              placeholder="100"
                              className="bg-black/20 border-[#2FFA98]/20"
                            />
                            <p className="text-xs text-gray-400 ml-1.5">Enter the amount of UUSDT you want to lend</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm text-gray-300">Collateral Rate (%)</label>
                            <Input
                              type="number"
                              value={lendingValues.collateralRate}
                              onChange={(e) => setLendingValues({ ...lendingValues, collateralRate: e.target.value })}
                              placeholder="150"
                              className="bg-black/20 border-[#2FFA98]/20"
                            />
                            <p className="text-xs text-gray-400 ml-1.5">
                              Example: 150 means borrower needs to deposit 150% collateral
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm text-gray-300">Interest Rate (%)</label>
                            <Input
                              type="number"
                              value={lendingValues.interestRate}
                              onChange={(e) => setLendingValues({ ...lendingValues, interestRate: e.target.value })}
                              placeholder="10"
                              className="bg-black/20 border-[#2FFA98]/20"
                            />
                            <p className="text-xs text-gray-400 ml-1.5">
                              Annual interest rate (e.g., 10 means 10% APR)
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm text-gray-300">Duration (minutes)</label>
                            <Input
                              type="number"
                              value={lendingValues.duration}
                              onChange={(e) => setLendingValues({ ...lendingValues, duration: e.target.value })}
                              placeholder="30"
                              className="bg-black/20 border-[#2FFA98]/20"
                            />
                            <p className="text-xs text-gray-400 ml-1.5">
                              Loan duration in minutes (max: 525600 = 1 year)
                            </p>
                          </div>
                        </div>

                        {/* Fee Summary */}
                        <div className="mb-4 p-4 bg-black/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-[#2FFA98] mb-2">Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Lending Amount:</span>
                              <span>{lendingValues.uusdtAmount || "0"} UUSDT</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#2FFA98]">Platform Fee (1%):</span>
                              <span className="text-[#2FFA98]">
                                {lendingValues.uusdtAmount
                                  ? (Number(lendingValues.uusdtAmount) * 0.01).toFixed(5)
                                  : "0"}{" "}
                                UUSDT
                              </span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#2FFA98]/20">
                              <span>Total Required:</span>
                              <span>
                                {lendingValues.uusdtAmount
                                  ? (Number(lendingValues.uusdtAmount) * 1.01).toFixed(5)
                                  : "0"}{" "}
                                UUSDT
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Fee Info Box */}
                        <div className="mb-4 p-4 bg-black/20 rounded-lg border border-[#2FFA98]/20">
                          <div className="flex items-center space-x-2 mb-2">
                            <Info className="w-4 h-4 text-[#2FFA98]" />
                            <h4 className="text-sm font-semibold text-[#2FFA98]">Platform Fee Info</h4>
                          </div>
                          <p className="text-xs text-gray-300">
                            • Platform charges 1% fee on the lending amount
                            <br />
                            • You can cancel your offer anytime before it's borrowed
                            <br />• If you cancel, you'll get your UUSDT back (excluding platform fee)
                          </p>
                        </div>

                        <Button
                          onClick={handleCreateOffer}
                          disabled={isCreatingOffer}
                          className="w-full bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] h-12 text-black font-semibold cursor-pointer"
                        >
                          {isCreatingOffer ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                              Creating...
                            </div>
                          ) : (
                            "Create Offer"
                          )}
                        </Button>
                      </div>

                      {/* Active Offers List */}
                      <div className="space-y-4">
                        {activeOffers.map((offer) =>
                          offer.lender.toLowerCase() === address?.toLowerCase() ? (
                            <div key={offer.id} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                              <div className="flex items-center justify-between pb-4 border-b border-[#2FFA98]/20">
                                <div className="flex items-center space-x-2">
                                  <Wallet className="w-5 h-5 text-[#2FFA98]" />
                                  <p className="text-sm text-gray-300">
                                    {offer.lender.toLowerCase() === address?.toLowerCase()
                                      ? "Your Offer"
                                      : `Lender: ${offer.lender?.slice(0, 6)}...${offer.lender?.slice(-4)}`}
                                  </p>
                                </div>
                                <div className="bg-[#2FFA98]/10 px-3 py-1 rounded-full">
                                  <p className="text-sm text-[#2FFA98]">#{offer.id?.toString()}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 my-4">
                                <div>
                                  <p className="text-sm text-gray-400">Lending Amount</p>
                                  <p className="text-lg font-semibold">{ethers.formatEther(offer.uusdtAmount)} UUSDT</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Platform Fee</p>
                                  <p className="text-lg font-semibold text-[#2FFA98]">
                                    {(Number(ethers.formatEther(offer.uusdtAmount)) * 0.01).toFixed(5)} UUSDT
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Interest Rate</p>
                                  <p className="text-lg font-semibold">{Number(offer.interestRate) / 100}%</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Required UNIT0</p>
                                  <p className="text-lg font-semibold">
                                    {ethers.formatEther(offer.requiredUNIT0)} UNIT0
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Duration</p>
                                  <p className="text-lg font-semibold">{offer.duration} minutes</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Status</p>
                                  <p className="text-lg font-semibold text-[#2FFA98]">
                                    {offer.isActive ? "Active" : "Inactive"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-end space-x-4 pt-4 border-t border-[#2FFA98]/20">
                                {offer.lender.toLowerCase() === address?.toLowerCase() ? (
                                  <Button
                                    onClick={() => handleCancelOffer(offer.id)}
                                    disabled={isCancelling}
                                    className="bg-red-500 hover:bg-red-600 px-6 cursor-pointer"
                                  >
                                    {isCancelling ? (
                                      <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                        Cancelling...
                                      </div>
                                    ) : (
                                      "Cancel Offer"
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleBorrowFromOffer(offer.id)}
                                    disabled={isBorrowing}
                                    className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6 cursor-pointer"
                                  >
                                    {isBorrowing ? (
                                      <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                        Borrowing...
                                      </div>
                                    ) : (
                                      "Borrow Now"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-400">No active offers</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Borrow Tab Content */}
                  <TabsContent value="borrow" className="mt-6">
                    <div className="space-y-6">
                      {/* Your Active Loans */}
                      <div className="space-y-4">
                        {userLoans.map((loan) => (
                          <div key={loan.id} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                            <div className="flex justify-between items-center pb-4 border-b border-[#2FFA98]/20">
                              <div className="flex items-center space-x-2">
                                <Wallet className="w-5 h-5 text-[#2FFA98]" />
                                <p className="text-sm text-gray-300">
                                  Lender: {loan.lender?.slice(0, 6)}...{loan.lender?.slice(-4)}
                                </p>
                              </div>
                              <div className="bg-[#2FFA98]/10 px-3 py-1 rounded-full">
                                <p className="text-sm text-[#2FFA98]">Loan #{loan.id?.toString()}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 my-4">
                              <div>
                                <p className="text-sm text-gray-400">Borrowed Amount</p>
                                <p className="text-lg font-semibold">{ethers.formatEther(loan.uusdtAmount)} UUSDT</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Collateral</p>
                                <p className="text-lg font-semibold">{ethers.formatEther(loan.unit0Amount)} UNIT0</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Interest Rate</p>
                                <p className="text-lg font-semibold">{Number(loan.interestRate) / 100}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Start Time</p>
                                <p className="text-lg font-semibold">
                                  {new Date(Number(loan.startTime) * 1000).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Duration</p>
                                <p className="text-lg font-semibold">{loan.duration} minutes</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Status</p>
                                <p className="text-lg font-semibold text-[#2FFA98]">
                                  {loan.isActive ? "Active" : loan.isRepaid ? "Repaid" : "Liquidated"}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-4 border-t border-[#2FFA98]/20">
                              {loan.isActive && (
                                <Button
                                  onClick={() => handleRepayLoan(loan.id)}
                                  disabled={repayingLoans[loan.id]}
                                  className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6 cursor-pointer"
                                >
                                  {repayingLoans[loan.id] ? (
                                    <div className="flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                      Repaying...
                                    </div>
                                  ) : (
                                    "Repay Loan"
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Available Offers to Borrow */}
                      <div className="space-y-4">
                        {activeOffers.map((offer) => (
                          <div key={offer.id} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                            <div className="flex items-center justify-between pb-4 border-b border-[#2FFA98]/20">
                              <div className="flex items-center space-x-2">
                                <Wallet className="w-5 h-5 text-[#2FFA98]" />
                                <p className="text-sm text-gray-300">
                                  Lender: {offer.lender?.slice(0, 6)}...{offer.lender?.slice(-4)}
                                </p>
                              </div>
                              <div className="bg-[#2FFA98]/10 px-3 py-1 rounded-full">
                                <p className="text-sm text-[#2FFA98]">#{offer.id?.toString()}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 my-4">
                              <div>
                                <p className="text-sm text-gray-400">Lending Amount</p>
                                <p className="text-lg font-semibold">{ethers.formatEther(offer.uusdtAmount)} UUSDT</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Platform Fee</p>
                                <p className="text-lg font-semibold text-[#2FFA98]">
                                  {(Number(ethers.formatEther(offer.uusdtAmount)) * 0.01).toFixed(5)} UUSDT
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Interest Rate</p>
                                <p className="text-lg font-semibold">{Number(offer.interestRate) / 100}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Required UNIT0</p>
                                <p className="text-lg font-semibold">{ethers.formatEther(offer.requiredUNIT0)} UNIT0</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Duration</p>
                                <p className="text-lg font-semibold">{offer.duration} minutes</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Status</p>
                                <p className="text-lg font-semibold text-[#2FFA98]">
                                  {offer.isActive ? "Active" : "Inactive"}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-4 border-t border-[#2FFA98]/20">
                              <Button
                                onClick={() => handleBorrowFromOffer(offer.id)}
                                disabled={isBorrowing}
                                className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6 cursor-pointer"
                              >
                                {isBorrowing ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                    Borrowing...
                                  </div>
                                ) : (
                                  "Borrow Now"
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
