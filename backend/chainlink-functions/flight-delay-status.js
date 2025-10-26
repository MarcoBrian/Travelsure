// Chainlink Function Source Code
// This function fetches flight status data from Travelsure API

// The source code that runs in Chainlink's decentralized oracle network
const flightNumber = args[0]; // e.g., "CX8552"
const date = args[1]; // e.g., "2025-10-26" (optional)

// Travelsure API endpoint
const baseUrl = "https://travelsure-production.up.railway.app/api/flights";

// Build the API URL with query parameters
let url = `${baseUrl}?flight_number=${flightNumber}`;

if (date) {
  url += `&flight_date=${date}`;
}

// Make the HTTP request
const response = await Functions.makeHttpRequest({
  url: url,
  method: "GET",
  timeout: 9000,
});

if (response.error) {
  throw Error("Request failed");
}

const data = response.data;

// Check if flight data exists
if (!data.data || data.data.length === 0) {
  throw Error("Flight not found");
}

const flight = data.data[0];

// Extract the delay status from the API response
const isDelayed = flight.status?.isDelayed || false;

// Return the boolean value directly
// Use encodeUint256 to encode boolean (0 = false, 1 = true)
return Functions.encodeUint256(isDelayed ? 1 : 0);
