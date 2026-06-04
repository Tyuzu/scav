import Notify from "../../components/ui/Notify.mjs";

export function printInvoice(order, items = []) {
  const invoiceWindow = window.open("", "_blank");

  if (!invoiceWindow) {
    Notify("Unable to open invoice window", {
      type: "warning",
      duration: 3000
    });
    return;
  }

  const itemRows = items
    .map(item => {
      const price = toRupees(item.price || 0);
      const total = price * (item.quantity || 0);

      return `
        <tr>
          <td>${item.itemName || item.name || "Item"}</td>
          <td>${item.quantity || 0}</td>
          <td>${formatINR(price)}</td>
          <td>${formatINR(total)}</td>
        </tr>
      `;
    })
    .join("");

  const invoiceDate = new Date(
    order.createdAt || order.created_at || Date.now()
  ).toLocaleString();

  invoiceWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${order.orderid || ""}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #222;
            background: #fff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 16px;
          }

          .title {
            margin: 0;
            font-size: 28px;
          }

          .meta p {
            margin: 4px 0;
          }

          .section {
            margin-top: 20px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }

          th {
            background: #f5f5f5;
          }

          th,
          td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }

          td:nth-child(2),
          td:nth-child(3),
          td:nth-child(4) {
            text-align: right;
          }

          .totals {
            margin-top: 24px;
            margin-left: auto;
            width: 320px;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
          }

          .grand-total {
            font-size: 20px;
            font-weight: bold;
            border-top: 2px solid #ddd;
            padding-top: 10px;
            margin-top: 10px;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 12px;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div>
            <h1 class="title">Invoice</h1>
            <p>Order ID: <strong>${order.orderid || "-"}</strong></p>
          </div>

          <div class="meta">
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Status:</strong> ${order.status || "-"}</p>
            <p><strong>Payment:</strong> ${order.paymentStatus || order.payment_status || "-"}</p>
          </div>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${order.customerName || order.customer_name || "-"}</p>
          <p><strong>Phone:</strong> ${order.phone || "-"}</p>
          <p><strong>Address:</strong> ${order.address || "-"}</p>
        </div>

        <div class="section">
          <h3>Items</h3>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${formatINR(toRupees(order.subtotal || 0))}</span>
          </div>

          <div class="totals-row">
            <span>Discount</span>
            <span>${formatINR(toRupees(order.discount || 0))}</span>
          </div>

          <div class="totals-row">
            <span>Tax</span>
            <span>${formatINR(toRupees(order.tax || 0))}</span>
          </div>

          <div class="totals-row">
            <span>Delivery</span>
            <span>${formatINR(toRupees(order.delivery || 0))}</span>
          </div>

          <div class="totals-row grand-total">
            <span>Total</span>
            <span>${formatINR(toRupees(order.total || 0))}</span>
          </div>
        </div>

        <div class="footer">
          Thank you for your order.
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);

  invoiceWindow.document.close();
}

function toRupees(amount) {
  return Number(amount || 0) / 100;
}

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}