export interface StatementItem {
  name: string;
  amount: number;
}

export interface TransferResponse {
  transferRequestId: string;
  merchantId: string;
  amount: number;
}

export async function createTransfer(
  merchantBackend: string,
  amount: number,
  statementItems?: StatementItem[]
): Promise<TransferResponse> {
  try {
    const response = await fetch(`${merchantBackend}/createTransfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, statementItems }),
    });

    if (!response.ok) {
      throw new Error(`Error creating transfer: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating transfer:", error);
    throw error;
  }
}
