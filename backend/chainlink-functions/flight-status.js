// Chainlink Function Source Code
// This function fetches flight status data from an aviation API

// The source code that runs in Chainlink's decentralized oracle network
const flightNumber = args[0]; // e.g., "AA100"
const date = args[1]; // e.g., "2024-01-15" (optional)

// AviationStack API example (you'll need an API key)
// const apiKey = secrets.AVIATION_API_KEY;
const apiKey = "4c617b714b1f2f2f06536a3713dd232b";

// Build the API URL
let url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`;

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

// Extract relevant flight information
const flightStatus = {
  flightNumber: flight.flight.iata || "N/A",
  status: flight.flight_status || "unknown",
  departure: {
    airport: flight.departure.airport || "N/A",
    scheduled: flight.departure.scheduled || "N/A",
    actual: flight.departure.actual || "N/A",
    delay: flight.departure.delay || 0,
  },
  arrival: {
    airport: flight.arrival.airport || "N/A",
    scheduled: flight.arrival.scheduled || "N/A",
    estimated: flight.arrival.estimated || "N/A",
    delay: flight.arrival.delay || 0,
  },
};

// Encode the response for on-chain consumption
// Return as bytes - you can customize what data to return
const statusCode = getStatusCode(flightStatus.status);
const departureDelay = flightStatus.departure.delay || 0;
const arrivalDelay = flightStatus.arrival.delay || 0;

// Helper function to convert status to numeric code
function getStatusCode(status) {
  const statusMap = {
    scheduled: 0,
    active: 1,
    landed: 2,
    cancelled: 3,
    incident: 4,
    diverted: 5,
  };
  return statusMap[status.toLowerCase()] || 99;
}

// Return array of values to be encoded
// [statusCode, departureDelayMinutes, arrivalDelayMinutes]
return Functions.encodeUint256(
  statusCode * 1000000 + departureDelay * 1000 + arrivalDelay
);
