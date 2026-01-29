// Mock Email Sent Data for Testing Email Status Dialog
// วิธีใช้: เปิด Browser Console และ paste script นี้แล้วกด Enter

(function() {
  console.log('🚀 Starting Email Data Mock...');

  const STORAGE_KEY = 'createdInvoices';

  try {
    // Load existing invoices
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.warn('⚠️ No invoices found in localStorage');
      return;
    }

    const invoices = JSON.parse(stored);
    console.log(`📋 Found ${invoices.length} invoices`);

    // Mock email sent dates for demonstration
    const now = new Date();
    const mockDates = [
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      new Date(now.getTime() - 10 * 60 * 60 * 1000),     // 10 hours ago
      new Date(now.getTime() - 3 * 60 * 60 * 1000),      // 3 hours ago
    ];

    // Update invoices with mock email sent data
    const updatedInvoices = invoices.map((invoice, index) => {
      // Only add emailSentAt to invoices with status "sent" or "paid"
      if (invoice.status === 'sent' || invoice.status === 'paid') {
        // Use different mock dates for variety
        const mockDate = mockDates[index % mockDates.length];
        return {
          ...invoice,
          emailSentAt: mockDate.toISOString()
        };
      }

      // For "draft" or "pending_approval", don't add emailSentAt
      return invoice;
    });

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));

    console.log('✅ Successfully mocked email sent data!');
    console.log('📊 Summary:');
    console.log(`   - Total invoices: ${updatedInvoices.length}`);
    console.log(`   - With email timestamp: ${updatedInvoices.filter(i => i.emailSentAt).length}`);
    console.log(`   - Without email timestamp: ${updatedInvoices.filter(i => !i.emailSentAt).length}`);
    console.log('');
    console.log('🔄 Please refresh the page to see the changes');

    // Trigger custom event for page refresh
    window.dispatchEvent(new Event('invoicesUpdated'));

  } catch (error) {
    console.error('❌ Error mocking email data:', error);
  }
})();
