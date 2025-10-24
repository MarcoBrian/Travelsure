// Chainlink Functions JavaScript Source Code
// This script fetches flight delay data from the Travelsure API
// Deploy this as a separate file for better readability and maintenance

const flightNumber = args[0]; // Flight number to check (e.g., "AA123")
const simulateDelay = args[1] || "false"; // Whether to simulate delay for testing

// Validate input parameters
if (!flightNumber) {
  throw Error("Flight number is required as the first argument");
}

console.log(
  `Checking flight ${flightNumber} (simulate delay: ${simulateDelay})`
);

// Construct the Travelsure API URL
const baseUrl = "https://travelsure-production.up.railway.app/api/flights";
const queryParams = new URLSearchParams({
  flightNumber: flightNumber,
  simulateDelay: simulateDelay,
});

const apiUrl = `${baseUrl}?${queryParams.toString()}`;
console.log(`API URL: ${apiUrl}`);

// Make HTTP request to Travelsure API
const apiRequest = Functions.makeHttpRequest({
  url: apiUrl,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Chainlink-Functions/1.0",
  },
  timeout: 10000, // 10 second timeout
});

// Execute the request
const apiResponse = await apiRequest;

// Handle request errors
if (apiResponse.error) {
  console.error("API request failed:", apiResponse.error);
  throw Error(`Travelsure API request failed: ${apiResponse.error}`);
}

// Validate response structure
if (!apiResponse.data) {
  throw Error("No data received from Travelsure API");
}

console.log("Raw API response:", JSON.stringify(apiResponse.data));

const responseData = apiResponse.data;

// Check if we received valid flight data
if (
  !responseData.data ||
  !Array.isArray(responseData.data) ||
  responseData.data.length === 0
) {
  console.log("No flight found for the given flight number");

  // Return no delay found (false, 0 minutes)
  const noDelayResult = Functions.encodeUint256(0); // false = 0
  const noDelayMinutes = Functions.encodeUint256(0); // 0 minutes
  return noDelayResult + noDelayMinutes.slice(2);
}

// Get the first matching flight
const flight = responseData.data[0];
console.log("Processing flight data:", JSON.stringify(flight));

// Initialize delay tracking variables
let delayOccurred = false;
let delayMinutes = 0;

// Check if flight is marked as delayed
if (flight.status && flight.status.toLowerCase() === "delayed") {
  delayOccurred = true;
  console.log("Flight status indicates delay");

  // Try to get delay duration from different sources
  if (
    flight.delay_minutes &&
    typeof flight.delay_minutes === "number" &&
    flight.delay_minutes > 0
  ) {
    // Use explicit delay_minutes field
    delayMinutes = flight.delay_minutes;
    console.log(`Using delay_minutes field: ${delayMinutes} minutes`);
  } else if (flight.actual_departure && flight.scheduled_departure) {
    // Calculate delay from departure times
    try {
      const scheduledTime = new Date(flight.scheduled_departure).getTime();
      const actualTime = new Date(flight.actual_departure).getTime();

      if (
        !isNaN(scheduledTime) &&
        !isNaN(actualTime) &&
        actualTime > scheduledTime
      ) {
        const delayMs = actualTime - scheduledTime;
        delayMinutes = Math.floor(delayMs / (1000 * 60)); // Convert to minutes
        console.log(
          `Calculated delay from timestamps: ${delayMinutes} minutes`
        );
      } else {
        console.log("Invalid departure times, using default delay");
        delayMinutes = 90; // Default 1.5 hours for delayed status
      }
    } catch (timeError) {
      console.log("Error parsing departure times, using default delay");
      delayMinutes = 90; // Default 1.5 hours
    }
  } else {
    // No specific delay data available, use reasonable default
    console.log("No specific delay data available, using default");
    delayMinutes = 90; // Default 1.5 hours for delayed status
  }
} else {
  // Flight is not delayed
  console.log(
    `Flight status: ${flight.status || "unknown"} - no delay detected`
  );
  delayOccurred = false;
  delayMinutes = 0;
}

// Ensure delay minutes is non-negative
delayMinutes = Math.max(0, Math.floor(delayMinutes));

console.log(
  `Final result - Delay occurred: ${delayOccurred}, Minutes: ${delayMinutes}`
);

// Encode the result for the smart contract
// Smart contract expects (bool delayOccurred, uint64 delayMinutes)
const delayBoolEncoded = Functions.encodeUint256(delayOccurred ? 1 : 0);
const delayMinutesEncoded = Functions.encodeUint256(delayMinutes);

// Combine both encoded values
const finalResult = delayBoolEncoded + delayMinutesEncoded.slice(2);

console.log(`Encoded result: ${finalResult}`);
return finalResult;
