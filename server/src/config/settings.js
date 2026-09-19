// Read lazily so values from .env are available (dotenv loads before first use).
export const getShippingRules = () => ({
  fee: Number(process.env.SHIPPING_FEE ?? 100),
  freeOver: Number(process.env.FREE_SHIPPING_OVER ?? 2000),
});

export const getPaymentInfo = () => ({
  methods: [
    { id: 'cod', label: 'Cash on Delivery', instructions: 'Pay in cash when your order arrives.' },
    {
      id: 'gcash',
      label: 'GCash',
      instructions: `Send the total to ${process.env.GCASH_NAME || 'the store'} at ${
        process.env.GCASH_NUMBER || '(number not set)'
      }, then enter your reference number below.`,
    },
    {
      id: 'bank',
      label: 'Bank Transfer',
      instructions: `Transfer the total to ${process.env.BANK_NAME || 'the bank'} — ${
        process.env.BANK_ACCOUNT_NAME || 'account name'
      } — ${process.env.BANK_ACCOUNT_NUMBER || '(account number not set)'}, then enter your reference number below.`,
    },
  ],
  shipping: getShippingRules(),
});
