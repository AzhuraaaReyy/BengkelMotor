import "./ReceiptShell.css";

interface ReceiptShellProps {
  children: React.ReactNode;
}

export function ReceiptShell({ children }: ReceiptShellProps) {
  return (
    <div className="receipt-page">
      <div className="receipt-container">
        <div className="receipt-content">
          {children}
        </div>
      </div>
    </div>
  );
}