import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export const generateInvoicePDF = async (order) => {
  const isProd = process.env.NODE_ENV === 'production';

  const browser = await puppeteer.launch({
    args: isProd ? chromium.args : ["--no-sandbox"],
    defaultViewport: isProd ? chromium.defaultViewport : null,
    executablePath: isProd ? await chromium.executablePath() : undefined,
    headless: isProd ? chromium.headless : true,
  });

  try {
    const page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; }
          .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; border-bottom: 2px solid #0d4728; padding-bottom: 20px; }
          .logo { color: #0d4728; font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .company-info { text-align: right; font-size: 12px; line-height: 1.6; color: #666; }
          
          .bill-to-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 8px; }
          .address-box { font-size: 13px; line-height: 1.5; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9f9f9; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #eee; color: #666; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .text-right { text-align: right; }
          
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-table { width: 250px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
          .grand-total { border-top: 2px solid #0d4728; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; color: #0d4728; }
          
          .footer { margin-top: 100px; font-size: 10px; color: #999; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px; }
          .gst-badge { display: inline-block; padding: 4px 8px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <div class="logo">Ledo Valley</div>
            <div style="font-size: 14px; margin-top: 5px; color: #666;">Tax Invoice / Bill of Supply</div>
          </div>
          <div class="company-info">
            <strong>Ledo Valley Tea Co.</strong><br/>
            Tinsukia, Assam, India<br/>
            Email: contact@ledovalley.com<br/>
            <div class="gst-badge">GSTIN: 18XXXXXXXXXXXXX</div>
          </div>
        </div>

        <div class="bill-to-section">
          <div class="address-box">
            <div class="section-title">Bill To</div>
            <strong>${order.customerSnapshot?.name || "Valued Customer"}</strong><br/>
            ${order.shippingAddress.addressLine1}<br/>
            ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + "<br/>" : ""}
            ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br/>
            Phone: ${order.shippingAddress.phone}
          </div>
          <div class="address-box" style="text-align: right;">
            <div class="section-title">Invoice Details</div>
            <strong>Invoice #: ${order.orderNumber}</strong><br/>
            Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'long', year: 'numeric' })}<br/>
            Payment: ${order.payment.method} (${order.payment.status})
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Weight</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td><strong>${item.productName}</strong><br/><small style="color: #999">SKU: ${item.variantSku}</small></td>
                <td class="text-right">${item.weight.value}${item.weight.unit}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₹${item.finalPrice.toLocaleString("en-IN")}</td>
                <td class="text-right">₹${item.subtotal.toLocaleString("en-IN")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-table">
            <div class="totals-row">
              <span>Items Subtotal</span>
              <span>₹${order.itemsTotal.toLocaleString("en-IN")}</span>
            </div>
            <div class="totals-row">
              <span>GST (Included)</span>
              <span>₹${order.gstAmount.toLocaleString("en-IN")}</span>
            </div>
            <div class="totals-row">
              <span>Shipping</span>
              <span>₹${order.shippingAmount.toLocaleString("en-IN")}</span>
            </div>
            ${order.discountAmount > 0 ? `
              <div class="totals-row" style="color: #c62828">
                <span>Discount</span>
                <span>-₹${order.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            ` : ""}
            <div class="totals-row grand-total">
              <span>Total Amount</span>
              <span>₹${order.grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <strong>Terms & Conditions:</strong><br/>
          1. Goods once sold will not be taken back.<br/>
          2. This is a computer generated invoice and does not require a physical signature.<br/>
          3. Total amount is inclusive of GST as applicable under the HSN code 0902 (Tea).<br/>
          <br/>
          <center>Thank you for shopping with Ledo Valley! We hope you enjoy your tea.</center>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
