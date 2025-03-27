export async function pollTransferStatus(
  transferRequestId: string,
  interval: number = 2000
): Promise<void> {
  const url = `https://api.zenobiapay.com/transfers/${transferRequestId}/status`;

  while (true) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Error polling transfer status: ${response.statusText}`
        );
      }

      const { status } = await response.json();

      console.log("Transfer status:", status);

      if (status === "COMPLETED" || status === "FAILED") {
        console.log(`Transfer ${status}`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("Error polling transfer status:", error);
      break;
    }
  }
}
