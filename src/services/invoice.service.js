import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export const generateInvoicePDF = async (order) => {
  const browser = await puppeteer.launch({
    headless: "new",
  });

  const page = await browser.newPage();

  const html = `
    <html>
      <body>
        <h1>Ledo Valley Invoice</h1>
        <p>Order: ${order.orderNumber}</p>
        <p>Date: ${order.createdAt}</p>
        <hr/>
        ${order.items.map(item => `
          <p>
            ${item.productName} × ${item.quantity}
            = ₹${item.subtotal}
          </p>
        `).join("")}
        <hr/>
        <p>Items: ₹${order.itemsTotal}</p>
        <p>GST (8%): ₹${order.gstAmount}</p>
        <p>Shipping: ₹${order.shippingAmount}</p>
        <h2>Total: ₹${order.grandTotal}</h2>
      </body>
    </html>
  `;

  await page.setContent(html);

  const invoicesDir = path.resolve("./invoices");

  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir);
  }

  const filePath = path.join(
    invoicesDir,
    `${order.orderNumber}.pdf`
  );

  await page.pdf({
    path: filePath,
    format: "A4",
  });

  await browser.close();

  return filePath;
};
