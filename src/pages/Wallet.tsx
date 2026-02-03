import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet as WalletIcon, Plus, History, TrendingUp } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Wallet = () => {
  const { user, updateWallet } = useAuth();
  const [amount, setAmount] = useState('');

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleAddMoney = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    updateWallet(value);
    toast.success(`₹${value.toFixed(2)} added to your wallet!`);
    setAmount('');
  };

  const quickAmounts = [100, 250, 500, 1000];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <CardDescription className="text-primary-foreground/80">Current Balance</CardDescription>
              <CardTitle className="text-5xl font-bold flex items-center gap-3">
                <WalletIcon className="h-12 w-12" />
                ₹{user.wallet.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Add Money Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Money
              </CardTitle>
              <CardDescription>Add dummy money to your wallet (no real payment)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMoney}>Add</Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    onClick={() => {
                      updateWallet(amt);
                      toast.success(`₹${amt} added to your wallet!`);
                    }}
                  >
                    + ₹{amt}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                How Billing Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>• You're only charged for the time you actively watch videos</p>
              <p>• Each video has a per-minute rate displayed on the card</p>
              <p>• We track your engagement through mouse and keyboard activity</p>
              <p>• If you're inactive for 10 seconds, we pause and ask if you're still there</p>
              <p>• Billing happens in real-time as you watch</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
