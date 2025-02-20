// @ts-nocheck
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import AOS from "aos";
import "aos/dist/aos.css";

// Lucide-react ikonlarını import ediyoruz
import { Edit, Send, Star, Wallet } from "lucide-react";

// Resmi import ediyoruz
import backgroundImage from "@/assets/background.jpg";

const projectId = "415b280d7f14fd394fac17ffed28e6db";
const metadata = {
  name: "banuchain-dapp",
  description: "Banuchain Dapp",
  url: "https://banuchain.com/",
  icons: ["https://banuchain.com/banuchain.png"],
};

const unit0testnet = {
  id: 88817, // Replace with your network ID
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
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // WALLET
  const { walletProvider } = useAppKitProvider("eip155");
  const { address, isConnected } = useAppKitAccount();

  // BALANCE
  const [unitsBalance, setUnitsBalance] = useState("0");
  const [provider, setProvider] = useState(null);
  const [dummyTransactions, setDummyTransactions] = useState([]);

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

  const fetchBalances = async () => {
    try {
      if (!isConnected || !provider) return;
      const unitsBal = await provider.getBalance(address);
      setUnitsBalance(ethers.formatEther(unitsBal));
    } catch (err) {
      console.error("Balance fetch error:", err);
      setUnitsBalance("0");
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
          <div className="col-span-3" data-aos="fade-right">
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

                  <TabsContent value="borrow" className="mt-6">
                    <div className="space-y-6">
                      {/* Transaction Input */}
                      <div
                        className="bg-white/5 p-6 rounded-lg shadow-md border border-[#2FFA98]/20"
                        data-aos="fade-up"
                      >
                        <Input
                          className="w-full bg-transparent border border-[#2FFA98]/20 text-[#2FFA98] font-medium"
                          value="0x12(you) -> 0x13 borrow 12 eth"
                          readOnly
                        />
                      </div>

                      {/* Transactions List */}
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2FFA98]/20 scrollbar-track-transparent">
                        {dummyTransactions.map((tx, index) => (
                          <div
                            key={index}
                            className="
                              flex items-center justify-between
                              bg-white/5 p-6 rounded-lg shadow-md
                              border border-[#2FFA98]/10
                              hover:bg-[#2FFA98]/10
                              transition-all duration-300
                            "
                            data-aos="fade-up"
                            data-aos-delay={index * 50}
                          >
                            <span className="text-[#2FFA98] font-medium">{tx.address}</span>
                            <span className="text-[#2FFA98] font-medium">{tx.amount} ETH</span>
                            <span className="text-[#2FFA98] font-medium">{tx.rate}%</span>
                            <Button
                              className="
                                bg-gradient-to-r from-[#2FFA98] to-[#22DD7B]
                                text-black hover:opacity-90
                                transition-all duration-300
                              "
                              size="sm"
                            >
                              {/* Borrow tabındaki butona Edit ikonunu ekledik */}
                              <Edit className="w-4 h-4 mr-2" />
                              Action
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="lending" className="mt-6">
                    <div className="space-y-6">
                      {/* Lending'e özel alan */}
                      <div className="bg-white/5 p-6 rounded-lg shadow-md border border-[#2FFA98]/20">
                        <Input
                          className="w-full bg-transparent border border-[#2FFA98]/20 text-[#2FFA98] font-medium"
                          value="0x12(you) -> 0x13 lend 12 eth"
                          readOnly
                        />
                      </div>

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2FFA98]/20 scrollbar-track-transparent">
                        {dummyTransactions.map((tx, index) => (
                          <div
                            key={index}
                            className="
                              flex items-center justify-between
                              bg-white/5 p-6 rounded-lg shadow-md
                              border border-[#2FFA98]/10
                              hover:bg-[#2FFA98]/10
                              transition-all duration-300
                            "
                            data-aos="fade-up"
                            data-aos-delay={index * 50}
                          >
                            <span className="text-[#2FFA98] font-medium">{tx.address}</span>
                            <span className="text-[#2FFA98] font-medium">{tx.amount} ETH</span>
                            <span className="text-[#2FFA98] font-medium">{tx.rate}%</span>
                            <Button
                              className="
                                bg-gradient-to-r from-[#2FFA98] to-[#22DD7B]
                                text-black hover:opacity-90
                                transition-all duration-300
                              "
                              size="sm"
                            >
                              {/* Lending tabındaki butona Send ikonunu ekledik */}
                              <Send className="w-4 h-4 mr-2" />
                              Lend
                            </Button>
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
          <div className="col-span-1" data-aos="fade-left">
            <Card className="h-full border border-[#2FFA98]/20 shadow-xl bg-white/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center h-full">
                  {/* Welcome kartına Wallet ikonunu ekledik */}
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-6 h-6" />
                    <span className="text-[#2FFA98] text-lg font-medium">Welcome to the platform</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
