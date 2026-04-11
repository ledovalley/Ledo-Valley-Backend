import puppeteer from "puppeteer";

export const generateInvoicePDF = async (order) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    const html = `
      <html>
        <body>
          <h1>Ledo Valley Invoice</h1>
          <p>Order: ${order.orderNumber}</p>
          <p>Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
          <hr/>
          ${order.items.map(item => `
            <p>
              ${item.productName} x ${item.quantity}
              = Rs. ${item.subtotal}
            </p>
          `).join("")}
          <hr/>
          <p>Items: Rs. ${order.itemsTotal}</p>
          <p>GST (5%): Rs. ${order.gstAmount}</p>
          <p>Shipping: Rs. ${order.shippingAmount}</p>
          <h2>Total: Rs. ${order.grandTotal}</h2>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
