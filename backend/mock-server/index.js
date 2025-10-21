const express = require("express");
const cors = require("cors");
const moment = require("moment");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for airlines
const airlines = [
  { iata: "AA", icao: "AAL", name: "American Airlines" },
  { iata: "DL", icao: "DAL", name: "Delta Air Lines" },
  { iata: "UA", icao: "UAL", name: "United Airlines" },
  { iata: "EK", icao: "UAE", name: "Emirates" },
  { iata: "QR", icao: "QTR", name: "Qatar Airways" },
  { iata: "LH", icao: "DLH", name: "Lufthansa" },
  { iata: "AF", icao: "AFR", name: "Air France" },
  { iata: "BA", icao: "BAW", name: "British Airways" },
  { iata: "SQ", icao: "SIA", name: "Singapore Airlines" },
  { iata: "CX", icao: "CPA", name: "Cathay Pacific" },
];

// Mock data for airports
const airports = [
  {
    iata: "JFK",
    icao: "KJFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "United States",
  },
  {
    iata: "LAX",
    icao: "KLAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles",
    country: "United States",
  },
  {
    iata: "LHR",
    icao: "EGLL",
    name: "London Heathrow Airport",
    city: "London",
    country: "United Kingdom",
  },
  {
    iata: "CDG",
    icao: "LFPG",
    name: "Charles de Gaulle Airport",
    city: "Paris",
    country: "France",
  },
  {
    iata: "DXB",
    icao: "OMDB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
  },
  {
    iata: "NRT",
    icao: "RJAA",
    name: "Narita International Airport",
    city: "Tokyo",
    country: "Japan",
  },
  {
    iata: "SIN",
    icao: "WSSS",
    name: "Singapore Changi Airport",
    city: "Singapore",
    country: "Singapore",
  },
  {
    iata: "FRA",
    icao: "EDDF",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "Germany",
  },
  {
    iata: "HKG",
    icao: "VHHH",
    name: "Hong Kong International Airport",
    city: "Hong Kong",
    country: "Hong Kong",
  },
  {
    iata: "SYD",
    icao: "YSSY",
    name: "Sydney Kingsford Smith Airport",
    city: "Sydney",
    country: "Australia",
  },
];

// Aircraft types
const aircraftTypes = [
  "Boeing 737-800",
  "Boeing 777-300ER",
  "Boeing 787-9",
  "Airbus A320",
  "Airbus A330-300",
  "Airbus A350-900",
  "Airbus A380-800",
  "Boeing 747-400",
  "Boeing 767-300",
  "Embraer E190",
];

// Flight status options
const flightStatuses = [
  "scheduled",
  "active",
  "landed",
  "cancelled",
  "incident",
  "diverted",
];

// Helper function to generate random flight data
function generateFlightData(count = 10, date = moment()) {
  const flights = [];

  for (let i = 0; i < count; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const departure = airports[Math.floor(Math.random() * airports.length)];
    const arrival = airports[Math.floor(Math.random() * airports.length)];

    // Ensure departure and arrival are different
    if (departure.iata === arrival.iata) continue;

    const flightNumber = `${airline.iata}${
      Math.floor(Math.random() * 9000) + 1000
    }`;
    const departureTime = moment(date)
      .add(Math.floor(Math.random() * 24), "hours")
      .add(Math.floor(Math.random() * 60), "minutes");
    const flightDuration = Math.floor(Math.random() * 12) + 1; // 1-12 hours
    const arrivalTime = moment(departureTime).add(flightDuration, "hours");

    const flight = {
      flight_date: date.format("YYYY-MM-DD"),
      flight_status:
        flightStatuses[Math.floor(Math.random() * flightStatuses.length)],
      departure: {
        airport: departure.name,
        timezone: "UTC",
        iata: departure.iata,
        icao: departure.icao,
        terminal:
          Math.random() > 0.5
            ? String.fromCharCode(65 + Math.floor(Math.random() * 5))
            : null,
        gate:
          Math.random() > 0.3 ? `${Math.floor(Math.random() * 50) + 1}` : null,
        delay: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : null,
        scheduled: departureTime.toISOString(),
        estimated: departureTime
          .clone()
          .add(
            Math.random() > 0.7 ? Math.floor(Math.random() * 30) : 0,
            "minutes"
          )
          .toISOString(),
        actual: null,
      },
      arrival: {
        airport: arrival.name,
        timezone: "UTC",
        iata: arrival.iata,
        icao: arrival.icao,
        terminal:
          Math.random() > 0.5
            ? String.fromCharCode(65 + Math.floor(Math.random() * 5))
            : null,
        gate:
          Math.random() > 0.3 ? `${Math.floor(Math.random() * 50) + 1}` : null,
        baggage:
          Math.random() > 0.5 ? `${Math.floor(Math.random() * 20) + 1}` : null,
        delay: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : null,
        scheduled: arrivalTime.toISOString(),
        estimated: arrivalTime
          .clone()
          .add(
            Math.random() > 0.7 ? Math.floor(Math.random() * 30) : 0,
            "minutes"
          )
          .toISOString(),
        actual: null,
      },
      airline: {
        name: airline.name,
        iata: airline.iata,
        icao: airline.icao,
      },
      flight: {
        number: flightNumber,
        iata: flightNumber,
        icao: `${airline.icao}${flightNumber.slice(2)}`,
      },
      aircraft: {
        registration: `N${
          Math.floor(Math.random() * 900) + 100
        }${String.fromCharCode(
          65 + Math.floor(Math.random() * 26)
        )}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        iata:
          aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)].split(
            " "
          )[1] || "B738",
        icao:
          aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)].split(
            " "
          )[1] || "B738",
        icao24: Math.random().toString(16).substr(2, 6).toUpperCase(),
      },
      live:
        Math.random() > 0.5
          ? {
              updated: moment().toISOString(),
              latitude: (Math.random() - 0.5) * 180,
              longitude: (Math.random() - 0.5) * 360,
              altitude: Math.floor(Math.random() * 40000) + 5000,
              direction: Math.floor(Math.random() * 360),
              speed_horizontal: Math.floor(Math.random() * 500) + 200,
              speed_vertical: (Math.random() - 0.5) * 100,
              is_ground: false,
            }
          : null,
    };

    flights.push(flight);
  }

  return flights;
}

// Routes

// Get flights (similar to Aviation Stack's flights endpoint)
app.get("/api/flights", (req, res) => {
  const {
    departure_iata,
    arrival_iata,
    airline_iata,
    flight_iata,
    flight_status,
    limit = 10,
    offset = 0,
    flight_date,
  } = req.query;

  let flights = generateFlightData(
    parseInt(limit) + parseInt(offset) || 20,
    flight_date ? moment(flight_date) : moment()
  );

  // Apply filters
  if (departure_iata) {
    flights = flights.filter(
      (f) => f.departure.iata === departure_iata.toUpperCase()
    );
  }
  if (arrival_iata) {
    flights = flights.filter(
      (f) => f.arrival.iata === arrival_iata.toUpperCase()
    );
  }
  if (airline_iata) {
    flights = flights.filter(
      (f) => f.airline.iata === airline_iata.toUpperCase()
    );
  }
  if (flight_iata) {
    flights = flights.filter(
      (f) => f.flight.iata === flight_iata.toUpperCase()
    );
  }
  if (flight_status) {
    flights = flights.filter(
      (f) => f.flight_status === flight_status.toLowerCase()
    );
  }

  // Apply pagination
  const paginatedFlights = flights.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json({
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: paginatedFlights.length,
      total: flights.length,
    },
    data: paginatedFlights,
  });
});

// Get specific flight by flight number and date
app.get("/api/flights/:flightNumber", (req, res) => {
  const { flightNumber } = req.params;
  const { flight_date } = req.query;

  const flights = generateFlightData(
    100,
    flight_date ? moment(flight_date) : moment()
  );
  const flight = flights.find(
    (f) => f.flight.iata.toUpperCase() === flightNumber.toUpperCase()
  );

  if (flight) {
    res.json({
      data: [flight],
    });
  } else {
    res.status(404).json({
      error: {
        code: "flight_not_found",
        message: "Flight not found",
      },
    });
  }
});

// Get airlines
app.get("/api/airlines", (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const paginatedAirlines = airlines.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json({
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: paginatedAirlines.length,
      total: airlines.length,
    },
    data: paginatedAirlines,
  });
});

// Get airports
app.get("/api/airports", (req, res) => {
  const { limit = 10, offset = 0, search } = req.query;
  let filteredAirports = airports;

  if (search) {
    filteredAirports = airports.filter(
      (airport) =>
        airport.name.toLowerCase().includes(search.toLowerCase()) ||
        airport.city.toLowerCase().includes(search.toLowerCase()) ||
        airport.iata.toLowerCase().includes(search.toLowerCase())
    );
  }

  const paginatedAirports = filteredAirports.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json({
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: paginatedAirports.length,
      total: filteredAirports.length,
    },
    data: paginatedAirports,
  });
});

// Get flight routes (popular routes)
app.get("/api/routes", (req, res) => {
  const routes = [
    {
      departure: "JFK",
      arrival: "LAX",
      distance: 2475,
      airlines: ["AA", "DL", "UA"],
    },
    {
      departure: "LHR",
      arrival: "JFK",
      distance: 3459,
      airlines: ["BA", "AA", "DL"],
    },
    {
      departure: "DXB",
      arrival: "LHR",
      distance: 3414,
      airlines: ["EK", "BA"],
    },
    {
      departure: "SIN",
      arrival: "LHR",
      distance: 6765,
      airlines: ["SQ", "BA"],
    },
    {
      departure: "LAX",
      arrival: "NRT",
      distance: 5478,
      airlines: ["AA", "UA", "DL"],
    },
  ];

  res.json({
    data: routes,
  });
});

// Get flight statistics
app.get("/api/statistics", (req, res) => {
  const stats = {
    total_flights_today: Math.floor(Math.random() * 50000) + 100000,
    on_time_percentage: Math.floor(Math.random() * 20) + 75,
    cancelled_flights: Math.floor(Math.random() * 1000) + 500,
    delayed_flights: Math.floor(Math.random() * 5000) + 10000,
    average_delay_minutes: Math.floor(Math.random() * 30) + 15,
    busiest_airports: ["ATL", "LAX", "ORD", "DFW", "DEN"],
    busiest_airlines: ["AA", "DL", "UA", "WN", "AS"],
  };

  res.json({
    data: stats,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: moment().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: "internal_server_error",
      message: "Something went wrong!",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: {
      code: "endpoint_not_found",
      message: "Endpoint not found",
    },
  });
});

app.listen(PORT, () => {
  console.log(`🛫 Travelsure Mock Flight API Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET /api/flights - Get flights with optional filters`);
  console.log(`   GET /api/flights/:flightNumber - Get specific flight`);
  console.log(`   GET /api/airlines - Get airlines`);
  console.log(`   GET /api/airports - Get airports`);
  console.log(`   GET /api/routes - Get popular routes`);
  console.log(`   GET /api/statistics - Get flight statistics`);
  console.log(`   GET /health - Health check`);
  console.log(`\n📖 Example usage:`);
  console.log(
    `   http://localhost:${PORT}/api/flights?departure_iata=JFK&arrival_iata=LAX&limit=5`
  );
  console.log(
    `   http://localhost:${PORT}/api/flights/AA1234?flight_date=2025-10-16`
  );
});
