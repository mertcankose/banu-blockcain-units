// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const projectId = "415b280d7f14fd394fac17ffed28e6db";
const metadata = {
  name: "banuchain-dapp",
  description: "Banuchain Dapp",
  url: "https://banuchain.com/",
  icons: ["https://banuchain.com/banuchain.png"],
};

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia, mainnet],
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
    <div className="min-h-screen bg-gradient-to-br from-[#9FE0C1] to-[#8ac5a8]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#555A3B] to-[#666c4c] shadow-lg" data-aos="fade-down">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold text-white tracking-wider bg-gradient-to-r from-white/90 to-white bg-clip-text text-transparent">
            LOGO
          </div>
          <appkit-button balance="show" label="Connect Wallet" size="md" loadingLabel="Connecting.." />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-8">
          {/* Main Section - Takes up 3 columns */}
          <div className="col-span-3" data-aos="fade-right">
            <Card className="border border-[#555A3B]/20 shadow-xl bg-white/95">
              <CardHeader className="bg-gradient-to-r from-white to-white/95 rounded-t-lg border-b border-[#555A3B]/20">
                <Tabs defaultValue="borrow" className="w-full">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger
                      value="borrow"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#9FE0C1] data-[state=active]:to-[#8ac5a8] data-[state=active]:text-[#555A3B]"
                    >
                      Borrow
                    </TabsTrigger>
                    <TabsTrigger
                      value="lending"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#9FE0C1] data-[state=active]:to-[#8ac5a8] data-[state=active]:text-[#555A3B]"
                    >
                      Lending
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="borrow" className="mt-6">
                    <div className="space-y-6">
                      {/* Transaction Input */}
                      <div
                        className="bg-gradient-to-r from-[#9FE0C1]/30 to-[#8ac5a8]/30 p-6 rounded-lg shadow-md"
                        data-aos="fade-up"
                      >
                        <Input
                          className="w-full bg-white/90 border border-[#555A3B]/20 text-[#555A3B] font-medium"
                          value="0x12(you) -> 0x13 borrow 12 eth"
                          readOnly
                        />
                      </div>

                      {/* Transactions List */}
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#555A3B]/20 scrollbar-track-transparent">
                        {dummyTransactions.map((tx, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white p-6 rounded-lg shadow-md border border-[#555A3B]/10 hover:bg-gradient-to-r hover:from-white hover:to-[#9FE0C1]/10 transition-all duration-300"
                            data-aos="fade-up"
                            data-aos-delay={index * 50}
                          >
                            <span className="text-[#555A3B] font-medium">{tx.address}</span>
                            <span className="text-[#555A3B] font-medium">{tx.amount} ETH</span>
                            <span className="text-[#555A3B] font-medium">{tx.rate}%</span>
                            <Button
                              className="bg-gradient-to-r from-[#555A3B] to-[#666c4c] text-white hover:from-[#9FE0C1] hover:to-[#8ac5a8] hover:text-[#555A3B] transition-all duration-300"
                              size="sm"
                            >
                              Action
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="lending" className="mt-6">
                    <div className="space-y-6">
                      {/* Similar structure as borrow, but with lending-specific content */}
                      <div className="bg-gradient-to-r from-[#9FE0C1]/30 to-[#8ac5a8]/30 p-6 rounded-lg shadow-md">
                        <Input
                          className="w-full bg-white/90 border border-[#555A3B]/20 text-[#555A3B] font-medium"
                          value="0x12(you) -> 0x13 lend 12 eth"
                          readOnly
                        />
                      </div>

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#555A3B]/20 scrollbar-track-transparent">
                        {dummyTransactions.map((tx, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white p-6 rounded-lg shadow-md border border-[#555A3B]/10 hover:bg-gradient-to-r hover:from-white hover:to-[#9FE0C1]/10 transition-all duration-300"
                            data-aos="fade-up"
                            data-aos-delay={index * 50}
                          >
                            <span className="text-[#555A3B] font-medium">{tx.address}</span>
                            <span className="text-[#555A3B] font-medium">{tx.amount} ETH</span>
                            <span className="text-[#555A3B] font-medium">{tx.rate}%</span>
                            <Button
                              className="bg-gradient-to-r from-[#555A3B] to-[#666c4c] text-white hover:from-[#9FE0C1] hover:to-[#8ac5a8] hover:text-[#555A3B] transition-all duration-300"
                              size="sm"
                            >
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

          {/* Right Section - Takes up 1 column */}
          <div className="col-span-1" data-aos="fade-left">
            <Card className="h-full border border-[#555A3B]/20 shadow-xl bg-white/95">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-[#555A3B] text-lg font-medium bg-gradient-to-r from-[#555A3B] to-[#666c4c] bg-clip-text text-transparent">
                    Welcome to the platform
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
