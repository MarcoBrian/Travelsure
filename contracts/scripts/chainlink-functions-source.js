// Chainlink Functions JavaScript source code
// This function calls the Travelsure API to get flight delay information

const flightNumber = args[0]; // Flight number to check
const simulateDelay = args[1] || "false"; // Whether to simulate delay for testing

if (!flightNumber) {
  throw Error("Flight number is required");
}

// Construct the API URL
const apiUrl = `https://travelsure-production.up.railway.app/api/flights`;
const params = new URLSearchParams({
  flightNumber: flightNumber,
  simulateDelay: simulateDelay,
});

console.log(`Calling Travelsure API: ${apiUrl}?${params.toString()}`);

// Make the HTTP request
const travelsureRequest = Functions.makeHttpRequest({
  url: `${apiUrl}?${params.toString()}`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});

// Wait for the API response
const travelsureResponse = await travelsureRequest;

if (travelsureResponse.error) {
  console.error("API request failed:", travelsureResponse.error);
  throw Error(`API request failed: ${travelsureResponse.error}`);
}

console.log("API Response:", travelsureResponse.data);

// Parse the response
const responseData = travelsureResponse.data;

// Check if we got valid data
if (!responseData || !responseData.data || responseData.data.length === 0) {
  console.log("No flight data found");
  // Return false (no delay) if flight not found
  const result = Functions.encodeUint256(0); // false = 0
  const delayMinutes = Functions.encodeUint256(0);
  return (
    Functions.encodeBytes32String("") + result.slice(2) + delayMinutes.slice(2)
  );
}

const flightData = responseData.data[0]; // Get first matching flight
console.log("Flight data:", flightData);

// Check delay status
let delayOccurred = false;
let delayMinutes = 0;

// Check if flight status indicates delay
if (flightData.status && flightData.status.toLowerCase() === "delayed") {
  delayOccurred = true;

  // Extract delay minutes from delay_minutes field or calculate from times
  if (flightData.delay_minutes && flightData.delay_minutes > 0) {
    delayMinutes = flightData.delay_minutes;
  } else if (flightData.actual_departure && flightData.scheduled_departure) {
    // Calculate delay from timestamps if available
    const scheduled = new Date(flightData.scheduled_departure).getTime();
    const actual = new Date(flightData.actual_departure).getTime();
    const diffMs = actual - scheduled;
    if (diffMs > 0) {
      delayMinutes = Math.floor(diffMs / (1000 * 60)); // Convert to minutes
    }
  } else {
    // Default delay for testing if status is delayed but no specific time
    delayMinutes = 90; // 1.5 hours default
  }
}

console.log(`Delay occurred: ${delayOccurred}, Delay minutes: ${delayMinutes}`);

// Encode the response for the smart contract
// The contract expects (bool delayOccurred, uint64 delayMinutes)
const encodedDelay = delayOccurred ? "1" : "0";
const encodedMinutes = delayMinutes.toString();

// Return as bytes that can be decoded by the smart contract
// Using ABI encoding: bool (32 bytes) + uint64 (32 bytes)
const delayBool = Functions.encodeUint256(delayOccurred ? 1 : 0);
const delayMins = Functions.encodeUint256(delayMinutes);

// Combine both values - remove 0x prefix from second value
const combinedResult = delayBool + delayMins.slice(2);

console.log(`Returning encoded result: ${combinedResult}`);
return combinedResult;
