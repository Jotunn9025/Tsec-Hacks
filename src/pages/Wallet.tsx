import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet as WalletIcon, Plus, TrendingUp } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { paymentApi } from '@/lib/api';

const Wallet = () => {
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    refreshBalance();

    // Listen for redirect back from payment gateway
    const params = new URLSearchParams(window.location.search);
    const intentId = params.get('intent_id');
    const hash = params.get('hash') || params.get('tx_hash');

    if (intentId) {
      handlePostPaymentConfirmation(intentId, hash);
    }
  }, []);

  const handlePostPaymentConfirmation = async (intentId: string, hash?: string | null) => {
    setIsConfirming(true);
    toast.loading('Confirming your deposit...', { id: 'confirming' });
    try {
      await paymentApi.confirmDeposit(intentId, hash ? { hash } : undefined);
      toast.success('Funds added successfully!', { id: 'confirming' });
      await refreshBalance();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => navigate('/'), 10000);
    } catch (err: any) {
      toast.error(err.message || 'Payment confirmation failed', { id: 'confirming' });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleDeposit = async (value: number) => {
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await paymentApi.initiateDeposit(user.id, value);

      // Open payment gateway in new tab
      window.open(res.payment_url, '_blank');
      toast.info('Opening payment gateway in a new tab...', {
        description: 'Verification will complete automatically in 20 seconds after you enter card details.'
      });

      // Start 20-second timer for confirmation as requested
      setTimeout(async () => {
        try {
          toast.loading('Finalizing settlement...', { id: 'auto-confirm' });
          await paymentApi.confirmDeposit(res.payment_intent_id);
          toast.success('Deposit successful! Wallet updated.', { id: 'auto-confirm' });
          await refreshBalance();
          setTimeout(() => navigate('/'), 10000);
        } catch (confirmErr: any) {
          console.error('Delayed confirmation failed:', confirmErr);
          toast.error('Auto-settlement failed. Please use the "Redirect" link if available.', { id: 'auto-confirm' });
        } finally {
          setIsSubmitting(false);
        }
      }, 20000);

    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate deposit');
      setIsSubmitting(false);
    }
  };

  const handleAddMoney = () => {
    handleDeposit(parseFloat(amount));
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
                ₹{user.wallet_balance?.toFixed(2) || '0.00'}
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
              <CardDescription>Deposit funds to your external wallet via Finternet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button onClick={handleAddMoney} disabled={isSubmitting || !amount}>
                  {isSubmitting ? 'Processing...' : 'Deposit'}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleDeposit(amt)}
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
              <p>• Every session starts by checking your minimum wallet balance (₹10)</p>
              <p>• Final session charges are processed when you close the lecture</p>
              <p>• Deposits are powered by Finternet for secure transactions</p>
              <p>• Your progress and billing data are synced across devices</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
