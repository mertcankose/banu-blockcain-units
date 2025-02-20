// @ts-nocheck
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ethers, BrowserProvider } from "ethers";
import AOS from "aos";
import "aos/dist/aos.css";
import { Edit, Send, Star, Wallet } from "lucide-react";
import backgroundImage from "@/assets/background.jpg";
import { uusdtTokenAbi, p2pBorrowLendingAbi } from "@/assets/abis";

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
  // CONTRACT ADDRESSES
  const UUSDT_TOKEN_ADDRESS = "0xC46643d498067CA186505E2eCD3c4A41A4b76dA0";
  const P2PBORROWLENDING_ADDRESS = "0xB075a60c852719C866e5205b7540DC75522Bd880";

  // WALLET
  const { walletProvider } = useAppKitProvider("eip155");
  const { address, isConnected } = useAppKitAccount();

  // BALANCE
  const [unitsBalance, setUnitsBalance] = useState("0");
  const [uusdtBalance, setUusdtBalance] = useState("0");
  const [provider, setProvider] = useState(null);
  const [dummyTransactions, setDummyTransactions] = useState([]);

  // CONTRACTS
  const [uusdtTokenContract, setUusdtTokenContract] = useState(null);
  const [p2pBorrowLendingContract, setP2pBorrowLendingContract] = useState(null);

  // STATES
  const [activeOffers, setActiveOffers] = useState([]);
  const [userLoans, setUserLoans] = useState([]);
  const [lendingValues, setLendingValues] = useState({
    uusdtAmount: "",
    collateralRate: "",
    interestRate: "",
    duration: "",
  });

  /* animation */
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  useEffect(() => {
    // Generate 15 dummy transactions
    const transactions = Array.from({ length: 15 }, (_, i) => ({
      address: `0x${(Math.random() * 1e12).toString(16).padStart(12, "0")}`,
      amount: (Math.random() * 20).toFixed(2),
      rate: (Math.random() * 15).toFixed(2),
    }));
    setDummyTransactions(transactions);
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
  }, [address, uusdtTokenAbi, p2pBorrowLendingAbi, isConnected, provider]);

  useEffect(() => {
    if (p2pBorrowLendingContract && address) {
      fetchActiveOffers();
      fetchUserLoans();
    }
  }, [p2pBorrowLendingContract, address]);

  // CONTRACTLARI BAŞLATMA
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
    } finally {
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
      console.log("offers:", offers);
      setActiveOffers(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setActiveOffers([]);
    }
  };

  // Kullanıcı borçlarını getir
  const fetchUserLoans = async () => {
    if (!p2pBorrowLendingContract || !address) return;
    const loans = await p2pBorrowLendingContract.getUserLoans(address);
    setUserLoans(loans);
  };

  // Borç verme teklifi oluştur
  const handleCreateOffer = async () => {
    try {
      const tx = await p2pBorrowLendingContract.createOffer(
        ethers.parseUnits(lendingValues.uusdtAmount, 18),
        lendingValues.collateralRate,
        lendingValues.interestRate,
        lendingValues.duration
      );
      await tx.wait();
      fetchActiveOffers();
    } catch (error) {
      console.error("Create offer error:", error);
    }
  };

  // Borç al
  const handleBorrowFromOffer = async (offerId) => {
    try {
      const offer = activeOffers[offerId];
      const requiredUnit0 = await p2pBorrowLendingContract.calculateRequiredUNIT0(
        offer.uusdtAmount,
        offer.collateralRate
      );

      const tx = await p2pBorrowLendingContract.borrowFromOffer(offerId, {
        value: requiredUnit0,
      });
      await tx.wait();
      fetchUserLoans();
    } catch (error) {
      console.error("Borrow error:", error);
    }
  };

  // Borç geri öde
  const handleRepayLoan = async (loanId) => {
    try {
      const tx = await p2pBorrowLendingContract.repayLoan(loanId);
      await tx.wait();
      fetchUserLoans();
    } catch (error) {
      console.error("Repay error:", error);
    }
  };

  // Teminat talep et
  const handleClaimCollateral = async (loanId) => {
    try {
      const tx = await p2pBorrowLendingContract.claimCollateral(loanId);
      await tx.wait();
      fetchActiveOffers();
    } catch (error) {
      console.error("Claim error:", error);
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
      {/* İsteğe bağlı grid deseni overlay */}
      <div className="absolute inset-0 bg-[url('/path/to/your-grid-image.png')] bg-repeat opacity-5 pointer-events-none"></div>

      {/* Header */}
      <header className="bg-transparent" data-aos="fade-down">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-wider text-[#2FFA98]">LOGO</div>
          <appkit-button balance="show" label="Connect Wallet" size="md" loadingLabel="Connecting.." />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 relative">
        <div className="grid grid-cols-4 gap-8">
          {/* Ana kısım (3 kolon) */}
          <div className="col-span-4" data-aos="fade-right">
            <Card className="border border-[#2FFA98]/20 shadow-xl bg-white/5 backdrop-blur-sm text-white">
              <CardHeader className="bg-white/5 rounded-t-lg border-b border-[#2FFA98]/20">
                {/* Kart başlığına ikon ekledik */}
                <div className="flex items-center space-x-2 p-2">
                  <Star className="w-6 h-6 text-[#2FFA98]" />
                  <h2 className="text-xl font-bold">Transactions</h2>
                </div>
                <Tabs defaultValue="borrow" className="w-full">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger
                      value="borrow"
                      className="
                        data-[state=active]:bg-gradient-to-r
                        data-[state=active]:from-[#2FFA98]
                        data-[state=active]:to-[#22DD7B]
                        data-[state=active]:text-black
                      "
                    >
                      Borrow
                    </TabsTrigger>
                    <TabsTrigger
                      value="lending"
                      className="
                        data-[state=active]:bg-gradient-to-r
                        data-[state=active]:from-[#2FFA98]
                        data-[state=active]:to-[#22DD7B]
                        data-[state=active]:text-black
                      "
                    >
                      Lending
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lending" className="mt-6">
                    <div className="space-y-6">
                      {/* Kredi Teklifi Oluştur */}
                      <div className="bg-white/5 p-6 rounded-lg shadow-md border border-[#2FFA98]/20">
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#2FFA98] mb-2">Create Lending Offer</h3>
                          <p className="text-sm text-gray-400">Fill in the details to create your lending offer</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-gray-300">Amount</label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={lendingValues.uusdtAmount}
                                onChange={(e) => setLendingValues({ ...lendingValues, uusdtAmount: e.target.value })}
                                placeholder="0.0"
                                className="bg-black/20 border-[#2FFA98]/20 rounded-lg pl-4 pr-16 h-12 w-full 
                    focus:border-[#2FFA98] focus:ring-1 focus:ring-[#2FFA98] 
                    transition-all duration-200"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                UUSDT
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm text-gray-300">Collateral Rate</label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={lendingValues.collateralRate}
                                onChange={(e) => setLendingValues({ ...lendingValues, collateralRate: e.target.value })}
                                placeholder="100"
                                className="bg-black/20 border-[#2FFA98]/20 rounded-lg pl-4 pr-12 h-12 w-full 
                    focus:border-[#2FFA98] focus:ring-1 focus:ring-[#2FFA98] 
                    transition-all duration-200"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm text-gray-300">Interest Rate</label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={lendingValues.interestRate}
                                onChange={(e) => setLendingValues({ ...lendingValues, interestRate: e.target.value })}
                                placeholder="1000"
                                className="bg-black/20 border-[#2FFA98]/20 rounded-lg pl-4 pr-16 h-12 w-full 
                    focus:border-[#2FFA98] focus:ring-1 focus:ring-[#2FFA98] 
                    transition-all duration-200"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                = 10%
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm text-gray-300">Duration</label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={lendingValues.duration}
                                onChange={(e) => setLendingValues({ ...lendingValues, duration: e.target.value })}
                                placeholder="60"
                                className="bg-black/20 border-[#2FFA98]/20 rounded-lg pl-4 pr-16 h-12 w-full 
                    focus:border-[#2FFA98] focus:ring-1 focus:ring-[#2FFA98] 
                    transition-all duration-200"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                mins
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleCreateOffer}
                          className="w-full bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] h-12 
              text-black font-semibold rounded-lg hover:opacity-90 
              transition-all duration-200"
                        >
                          Create Lending Offer
                        </Button>
                      </div>

                      {/* Aktif Teklifler Listesi */}
                      <div className="space-y-4">
                        {activeOffers.map((offer, index) => (
                          <div key={index} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                            <div className="flex justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Wallet className="w-5 h-5 text-[#2FFA98]" />
                                  <p className="text-sm text-gray-300">
                                    Lender: {offer.lender?.slice(0, 6)}...{offer.lender?.slice(-4)}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-gray-400">Loan Amount</p>
                                    <p className="text-lg font-semibold">
                                      {ethers.formatEther(offer.uusdtAmount ?? 0)} UUSDT
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Collateral Required</p>
                                    <p className="text-lg font-semibold">{offer.collateralRate}%</p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Interest Rate</p>
                                    <p className="text-lg font-semibold text-[#2FFA98]">
                                      {offer.interestRate / 100}% APR
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Duration</p>
                                    <p className="text-lg font-semibold">{offer.duration} minutes</p>
                                  </div>

                                  {offer.unit0Amount && (
                                    <div>
                                      <p className="text-sm text-gray-400">Collateral Amount</p>
                                      <p className="text-lg font-semibold">
                                        {ethers.formatEther(offer.unit0Amount)} UNIT0
                                      </p>
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-sm text-gray-400">Status</p>
                                    <p className="text-lg font-semibold text-[#2FFA98]">
                                      {offer.isActive ? "Active" : "Inactive"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col justify-center">
                                <Button
                                  onClick={() => handleBorrowFromOffer(offer.id)}
                                  className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6"
                                >
                                  Borrow Now
                                </Button>
                                <p className="text-xs text-gray-400 mt-2 text-center">Ends in: {offer.duration} min</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="borrow" className="mt-6">
                    <div className="space-y-6">
                      {/* Mevcut Borçlar */}
                      <div className="space-y-4">
                        {userLoans.map((loan, index) => (
                          <div key={index} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                            <div className="flex justify-between">
                              <div className="space-y-4 w-full">
                                {/* Üst Kısım - Temel Bilgiler */}
                                <div className="flex items-center justify-between pb-4 border-b border-[#2FFA98]/20">
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

                                {/* Ana Bilgiler Grid */}
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-sm text-gray-400">Borrowed Amount</p>
                                    <p className="text-lg font-semibold">
                                      {ethers.formatEther(loan.uusdtAmount)} UUSDT
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Collateral Locked</p>
                                    <p className="text-lg font-semibold">
                                      {ethers.formatEther(loan.unit0Amount)} UNIT0
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Interest Rate</p>
                                    <p className="text-lg font-semibold text-[#2FFA98]">
                                      {loan.interestRate / 100}% APR
                                    </p>
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
                                      {new Date(Number(loan.startTime) * 1000 + Number(loan.duration) * 60 * 1000) >
                                      new Date()
                                        ? "Active"
                                        : "Expired"}
                                    </p>
                                  </div>
                                </div>

                                {/* Alt Kısım - Butonlar ve Özet */}
                                <div className="flex justify-between items-center pt-4 border-t border-[#2FFA98]/20">
                                  <div className="text-sm text-gray-400">
                                    <p>
                                      Expires:{" "}
                                      {new Date(
                                        Number(loan.startTime) * 1000 + Number(loan.duration) * 60 * 1000
                                      ).toLocaleString()}
                                    </p>
                                  </div>

                                  <div className="flex space-x-3">
                                    <Button
                                      onClick={() => handleRepayLoan(loan.id)}
                                      className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6"
                                    >
                                      Repay Loan
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Aktif Borç Teklifleri */}
                      <div className="space-y-4">
                        {activeOffers.map((offer, index) => (
                          <div key={index} className="bg-white/5 p-6 rounded-lg border border-[#2FFA98]/20">
                            <div className="flex justify-between">
                              <div className="space-y-4 w-full">
                                {/* Üst Kısım */}
                                <div className="flex items-center justify-between pb-4 border-b border-[#2FFA98]/20">
                                  <div className="flex items-center space-x-2">
                                    <Wallet className="w-5 h-5 text-[#2FFA98]" />
                                    <p className="text-sm text-gray-300">
                                      Lender: {offer.lender?.slice(0, 6)}...{offer.lender?.slice(-4)}
                                    </p>
                                  </div>
                                  <div className="bg-[#2FFA98]/10 px-3 py-1 rounded-full">
                                    <p className="text-sm text-[#2FFA98]">Offer #{offer.id?.toString()}</p>
                                  </div>
                                </div>

                                {/* Ana Grid */}
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-sm text-gray-400">Available Amount</p>
                                    <p className="text-lg font-semibold">
                                      {ethers.formatEther(offer.uusdtAmount ?? 0)} UUSDT
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Required Collateral</p>
                                    <p className="text-lg font-semibold">{offer.collateralRate}%</p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Interest Rate</p>
                                    <p className="text-lg font-semibold text-[#2FFA98]">
                                      {offer.interestRate / 100}% APR
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Duration</p>
                                    <p className="text-lg font-semibold">{offer.duration} minutes</p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Required UNIT0</p>
                                    <p className="text-lg font-semibold">
                                      {ethers.formatEther(offer.unit0Amount ?? 0)} UNIT0
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-400">Status</p>
                                    <p className="text-lg font-semibold text-[#2FFA98]">
                                      {offer.isActive ? "Active" : "Inactive"}
                                    </p>
                                  </div>
                                </div>

                                {/* Alt Kısım */}
                                <div className="flex justify-between items-center pt-4 border-t border-[#2FFA98]/20">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-400">Loan Terms</p>
                                    <p className="text-sm">
                                      Borrow {ethers.formatEther(offer.uusdtAmount ?? 0)} UUSDT with{" "}
                                      {offer.collateralRate}% collateral
                                    </p>
                                  </div>

                                  <Button
                                    onClick={() => handleBorrowFromOffer(offer.id)}
                                    className="bg-gradient-to-r from-[#2FFA98] to-[#22DD7B] px-6 h-10"
                                  >
                                    Borrow Now
                                  </Button>
                                </div>
                              </div>
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

          {/* Sağ kısım (1 kolon) */}
          {/*
          <div className="col-span-1" data-aos="fade-left">
            <Card className="h-full border border-[#2FFA98]/20 shadow-xl bg-white/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center h-full">
        
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-6 h-6" />
                    <span className="text-[#2FFA98] text-lg font-medium">Welcome to the platform</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          */}
        </div>
      </main>
    </div>
  );
};

export default App;
