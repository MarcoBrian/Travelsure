require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "travelsure_flights",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log(
  `📊 Database config: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
);

// Database setup
let db;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Travelsure Flight API",
      version: "1.0.0",
      description:
        "A comprehensive flight data API with persistent PostgreSQL storage and delay simulation capabilities",
      contact: {
        name: "Travelsure API Support",
        url: "https://travelsure.site",
        email: "support@travelsure.site",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      {
        url: "https://api.travelsure.site",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Flights",
        description:
          "Flight data operations with filtering and delay simulation",
      },
      {
        name: "Airlines",
        description: "Airline information and data",
      },
      {
        name: "Airports",
        description: "Airport information with search capabilities",
      },
      {
        name: "Statistics",
        description: "Flight statistics and analytics",
      },
      {
        name: "Health",
        description: "API health and status monitoring",
      },
    ],
    components: {
      schemas: {
        Flight: {
          type: "object",
          properties: {
            flight_date: {
              type: "string",
              format: "date",
              description: "Date of the flight",
              example: "2025-10-22",
            },
            flight_status: {
              type: "string",
              enum: ["scheduled", "active", "landed", "delayed", "cancelled"],
              description: "Current status of the flight",
              example: "scheduled",
            },
            departure: {
              type: "object",
              properties: {
                airport: {
                  type: "string",
                  description: "Departure airport name",
                  example: "John F. Kennedy International Airport",
                },
                timezone: {
                  type: "string",
                  description: "Airport timezone",
                  example: "America/New_York",
                },
                iata: {
                  type: "string",
                  description: "IATA airport code",
                  example: "JFK",
                },
                icao: {
                  type: "string",
                  description: "ICAO airport code",
                  example: "KJFK",
                },
                terminal: {
                  type: "string",
                  description: "Departure terminal",
                  example: "1",
                },
                gate: {
                  type: "string",
                  description: "Departure gate",
                  example: "A1",
                },
                delay: {
                  type: "integer",
                  description: "Departure delay in minutes",
                  example: 45,
                },
                scheduled: {
                  type: "string",
                  format: "date-time",
                  description: "Scheduled departure time",
                  example: "2025-10-22T14:30:00.000Z",
                },
                estimated: {
                  type: "string",
                  format: "date-time",
                  description: "Estimated departure time",
                  example: "2025-10-22T15:15:00.000Z",
                },
                actual: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                  description: "Actual departure time",
                  example: "2025-10-22T15:10:00.000Z",
                },
              },
            },
            arrival: {
              type: "object",
              properties: {
                airport: {
                  type: "string",
                  description: "Arrival airport name",
                  example: "Los Angeles International Airport",
                },
                timezone: {
                  type: "string",
                  description: "Airport timezone",
                  example: "America/Los_Angeles",
                },
                iata: {
                  type: "string",
                  description: "IATA airport code",
                  example: "LAX",
                },
                icao: {
                  type: "string",
                  description: "ICAO airport code",
                  example: "KLAX",
                },
                terminal: {
                  type: "string",
                  description: "Arrival terminal",
                  example: "2",
                },
                gate: {
                  type: "string",
                  description: "Arrival gate",
                  example: "B5",
                },
                baggage: {
                  type: "string",
                  nullable: true,
                  description: "Baggage claim area",
                  example: "5",
                },
                delay: {
                  type: "integer",
                  description: "Arrival delay in minutes",
                  example: 50,
                },
                scheduled: {
                  type: "string",
                  format: "date-time",
                  description: "Scheduled arrival time",
                  example: "2025-10-22T20:30:00.000Z",
                },
                estimated: {
                  type: "string",
                  format: "date-time",
                  description: "Estimated arrival time",
                  example: "2025-10-22T21:20:00.000Z",
                },
                actual: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                  description: "Actual arrival time",
                  example: "2025-10-22T21:15:00.000Z",
                },
              },
            },
            airline: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Airline name",
                  example: "American Airlines",
                },
                iata: {
                  type: "string",
                  description: "IATA airline code",
                  example: "AA",
                },
                icao: {
                  type: "string",
                  description: "ICAO airline code",
                  example: "AAL",
                },
              },
            },
            flight: {
              type: "object",
              properties: {
                number: {
                  type: "string",
                  description: "Flight number",
                  example: "AA1234",
                },
                iata: {
                  type: "string",
                  description: "IATA flight number",
                  example: "AA1234",
                },
                icao: {
                  type: "string",
                  description: "ICAO flight number",
                  example: "AAL1234",
                },
              },
            },
            status: {
              type: "object",
              properties: {
                isDelayed: {
                  type: "boolean",
                  description: "Whether the flight is delayed",
                  example: true,
                },
                isCancelled: {
                  type: "boolean",
                  description: "Whether the flight is cancelled",
                  example: false,
                },
              },
            },
            simulation: {
              type: "object",
              nullable: true,
              description:
                "Delay simulation information (only present when simulateDelay=true)",
              properties: {
                delayApplied: {
                  type: "boolean",
                  description: "Whether delay was applied to this flight",
                  example: true,
                },
                delayMinutes: {
                  type: "integer",
                  description: "Number of minutes delayed",
                  example: 45,
                },
                delayReason: {
                  type: "string",
                  description: "Reason for the delay",
                  example: "Air traffic control",
                },
                originalStatus: {
                  type: "string",
                  description: "Original flight status before simulation",
                  example: "scheduled",
                },
              },
            },
          },
        },
        FlightsResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Flight",
              },
            },
            pagination: {
              type: "object",
              properties: {
                limit: {
                  type: "integer",
                  description: "Number of results per page",
                  example: 10,
                },
                offset: {
                  type: "integer",
                  description: "Number of results to skip",
                  example: 0,
                },
                count: {
                  type: "integer",
                  description: "Number of results in current page",
                  example: 10,
                },
                total: {
                  type: "integer",
                  description: "Total number of results",
                  example: 259,
                },
              },
            },
            simulation: {
              type: "object",
              nullable: true,
              description:
                "Simulation summary (only present when simulateDelay=true)",
              properties: {
                delaySimulated: {
                  type: "boolean",
                  description: "Whether delay simulation was requested",
                  example: true,
                },
                delaysApplied: {
                  type: "integer",
                  description:
                    "Number of flights that received simulated delays",
                  example: 3,
                },
                totalFlights: {
                  type: "integer",
                  description: "Total number of flights in response",
                  example: 10,
                },
                averageDelayMinutes: {
                  type: "integer",
                  description: "Average delay minutes for simulated flights",
                  example: 67,
                },
              },
            },
          },
        },
        Airline: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Airline ID",
              example: 1,
            },
            iata: {
              type: "string",
              description: "IATA airline code",
              example: "AA",
            },
            icao: {
              type: "string",
              description: "ICAO airline code",
              example: "AAL",
            },
            name: {
              type: "string",
              description: "Airline name",
              example: "American Airlines",
            },
          },
        },
        Airport: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Airport ID",
              example: 1,
            },
            iata: {
              type: "string",
              description: "IATA airport code",
              example: "JFK",
            },
            icao: {
              type: "string",
              description: "ICAO airport code",
              example: "KJFK",
            },
            name: {
              type: "string",
              description: "Airport name",
              example: "John F. Kennedy International Airport",
            },
            city: {
              type: "string",
              description: "City",
              example: "New York",
            },
            country: {
              type: "string",
              description: "Country",
              example: "United States",
            },
            timezone: {
              type: "string",
              description: "Timezone",
              example: "America/New_York",
            },
          },
        },
        Statistics: {
          type: "object",
          properties: {
            total_flights_today: {
              type: "integer",
              description: "Total flights scheduled for today",
              example: 25,
            },
            ontime_flights: {
              type: "integer",
              description: "Number of on-time flights today",
              example: 18,
            },
            on_time_percentage: {
              type: "integer",
              description: "Percentage of on-time flights",
              example: 72,
            },
            delayed_flights: {
              type: "integer",
              description: "Number of delayed flights today",
              example: 5,
            },
            cancelled_flights: {
              type: "integer",
              description: "Number of cancelled flights today",
              example: 2,
            },
            average_delay_minutes: {
              type: "integer",
              description: "Average delay in minutes for delayed flights",
              example: 45,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "Error code",
                  example: "flight_not_found",
                },
                message: {
                  type: "string",
                  description: "Error message",
                  example: "Flight not found",
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./index-postgres.js"], // Path to the API file
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(express.json());

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new Pool(dbConfig);

    // Test connection
    db.connect()
      .then((client) => {
        console.log("📊 Connected to PostgreSQL database");
        client.release();

        // Create tables
        createTables()
          .then(() => resolve())
          .catch(reject);
      })
      .catch((err) => {
        console.error("Error connecting to database:", err);
        reject(err);
      });
  });
}

async function createTables() {
  const client = await db.connect();

  try {
    // Airlines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS airlines (
        id SERIAL PRIMARY KEY,
        iata VARCHAR(3) UNIQUE,
        icao VARCHAR(4),
        name TEXT
      )
    `);

    // Airports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS airports (
        id SERIAL PRIMARY KEY,
        iata VARCHAR(3) UNIQUE,
        icao VARCHAR(4),
        name TEXT,
        city TEXT,
        country TEXT,
        timezone TEXT
      )
    `);

    // Flights table with PostgreSQL syntax
    await client.query(`
      CREATE TABLE IF NOT EXISTS flights (
        id SERIAL PRIMARY KEY,
        flight_date DATE NOT NULL,
        flight_status VARCHAR(20) NOT NULL,
        flight_number VARCHAR(10) NOT NULL,
        airline_iata VARCHAR(3),
        airline_icao VARCHAR(4),
        airline_name TEXT,
        
        departure_airport_iata VARCHAR(3),
        departure_airport_icao VARCHAR(4),
        departure_airport_name TEXT,
        departure_terminal VARCHAR(10),
        departure_gate VARCHAR(10),
        departure_scheduled TIMESTAMP NOT NULL,
        departure_estimated TIMESTAMP,
        departure_actual TIMESTAMP,
        departure_delay INTEGER DEFAULT 0,
        
        arrival_airport_iata VARCHAR(3),
        arrival_airport_icao VARCHAR(4),
        arrival_airport_name TEXT,
        arrival_terminal VARCHAR(10),
        arrival_gate VARCHAR(10),
        arrival_baggage VARCHAR(10),
        arrival_scheduled TIMESTAMP NOT NULL,
        arrival_estimated TIMESTAMP,
        arrival_actual TIMESTAMP,
        arrival_delay INTEGER DEFAULT 0,
        
        is_delayed BOOLEAN DEFAULT FALSE,
        is_cancelled BOOLEAN DEFAULT FALSE,
        manual_simulation BOOLEAN DEFAULT FALSE,
        manual_delay_reason TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (airline_iata) REFERENCES airlines (iata),
        FOREIGN KEY (departure_airport_iata) REFERENCES airports (iata),
        FOREIGN KEY (arrival_airport_iata) REFERENCES airports (iata)
      )
    `);

    console.log("📊 Database tables created successfully");
  } finally {
    client.release();
  }
}

// Generate real-life SQ961 flight data (Jakarta to Singapore)
function generateSQ961RealData() {
  console.log("✈️ Generating real SQ961 flight data (Jakarta to Singapore)...");

  // SQ961 real-world details
  const sq961Details = {
    flight_number: "SQ961",
    airline: {
      iata: "SQ",
      icao: "SIA",
      name: "Singapore Airlines",
    },
    departure: {
      iata: "CGK",
      icao: "WIII",
      name: "Soekarno-Hatta International Airport",
      city: "Jakarta",
      country: "Indonesia",
      timezone: "Asia/Jakarta",
      terminal: "3",
      gate: "B5",
    },
    arrival: {
      iata: "SIN",
      icao: "WSSS",
      name: "Singapore Changi Airport",
      city: "Singapore",
      country: "Singapore",
      timezone: "Asia/Singapore",
      terminal: "3",
      gate: "A12",
      baggage: "6",
    },
    // Real SQ961 typically departs CGK around 08:15 and arrives SIN around 11:00 (1h 45min flight)
    departureTime: "08:15",
    arrivalTime: "11:00", // Same day
    flightDuration: 105, // 1 hour 45 minutes
  };

  const flights = [];

  // Generate flights from today to 2 months from now
  const startDate = moment().startOf("day");
  const endDate = moment().add(2, "months").endOf("day");

  console.log(
    `📅 Generating SQ961 flights from ${startDate.format(
      "YYYY-MM-DD"
    )} to ${endDate.format("YYYY-MM-DD")}`
  );

  for (
    let date = startDate.clone();
    date.isSameOrBefore(endDate);
    date.add(1, "day")
  ) {
    // SQ961 operates daily
    const flightDate = date.format("YYYY-MM-DD");

    // Calculate departure and arrival times for this date
    const departureDateTime = moment(date).hour(8).minute(15).second(0);
    const arrivalDateTime = moment(departureDateTime).add(
      sq961Details.flightDuration,
      "minutes"
    );

    // Add some realistic variation (±10 minutes from schedule)
    const scheduleVariation = Math.floor(Math.random() * 21) - 10; // -10 to +10 minutes
    const actualDepartureTime = departureDateTime
      .clone()
      .add(scheduleVariation, "minutes");
    const actualArrivalTime = arrivalDateTime
      .clone()
      .add(scheduleVariation + Math.floor(Math.random() * 15), "minutes");

    // Determine flight status (90% on-time, 10% delayed, 0% cancelled)
    let status = "scheduled";
    let departureDelay = 0;
    let arrivalDelay = 0;
    let isDelayed = false;
    let isCancelled = false;

    const statusRandom = Math.random();
    if (statusRandom < 0.1) {
      status = "delayed";
      isDelayed = true;
      departureDelay = Math.floor(Math.random() * 120) + 15; // 15-135 minutes delay
      arrivalDelay = departureDelay + Math.floor(Math.random() * 20); // Arrival usually slightly more delayed
    } else if (date.isBefore(moment(), "day")) {
      // Past flights are landed
      status = "landed";
    }

    const estimatedDeparture = isDelayed
      ? departureDateTime.clone().add(departureDelay, "minutes")
      : departureDateTime.clone();

    const estimatedArrival = isDelayed
      ? arrivalDateTime.clone().add(arrivalDelay, "minutes")
      : arrivalDateTime.clone();

    // Actual times for past flights
    const actualDeparture = date.isBefore(moment(), "day")
      ? actualDepartureTime.toISOString()
      : null;
    const actualArrival =
      date.isBefore(moment(), "day") && status === "landed"
        ? actualArrivalTime.toISOString()
        : null;

    const flight = {
      flight_date: flightDate,
      flight_status: status,
      flight_number: sq961Details.flight_number,
      airline_iata: sq961Details.airline.iata,
      airline_icao: sq961Details.airline.icao,
      airline_name: sq961Details.airline.name,

      departure_airport_iata: sq961Details.departure.iata,
      departure_airport_icao: sq961Details.departure.icao,
      departure_airport_name: sq961Details.departure.name,
      departure_terminal: sq961Details.departure.terminal,
      departure_gate: sq961Details.departure.gate,
      departure_scheduled: departureDateTime.toISOString(),
      departure_estimated: estimatedDeparture.toISOString(),
      departure_actual: actualDeparture,
      departure_delay: departureDelay,

      arrival_airport_iata: sq961Details.arrival.iata,
      arrival_airport_icao: sq961Details.arrival.icao,
      arrival_airport_name: sq961Details.arrival.name,
      arrival_terminal: sq961Details.arrival.terminal,
      arrival_gate: sq961Details.arrival.gate,
      arrival_baggage: sq961Details.arrival.baggage,
      arrival_scheduled: arrivalDateTime.toISOString(),
      arrival_estimated: estimatedArrival.toISOString(),
      arrival_actual: actualArrival,
      arrival_delay: arrivalDelay,

      is_delayed: isDelayed,
      is_cancelled: isCancelled,
      manual_simulation: false,
      manual_delay_reason: null,
    };

    flights.push(flight);
  }

  console.log(`✅ Generated ${flights.length} SQ961 flight records`);
  return flights;
}

// Function to add SQ961 real data to database
async function addSQ961RealData() {
  try {
    const sq961Flights = generateSQ961RealData();
    console.log(
      `📄 Adding ${sq961Flights.length} SQ961 real flights to database...`
    );

    // First, ensure Singapore Airlines and airports exist
    const client = await db.connect();
    try {
      // Add Singapore Airlines
      await client.query(
        `INSERT INTO airlines (iata, icao, name) VALUES ($1, $2, $3) ON CONFLICT (iata) DO NOTHING`,
        ["SQ", "SIA", "Singapore Airlines"]
      );

      // Add Singapore Changi Airport
      await client.query(
        `INSERT INTO airports (iata, icao, name, city, country, timezone) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (iata) DO NOTHING`,
        [
          "SIN",
          "WSSS",
          "Singapore Changi Airport",
          "Singapore",
          "Singapore",
          "Asia/Singapore",
        ]
      );

      // Add Jakarta Soekarno-Hatta Airport
      await client.query(
        `INSERT INTO airports (iata, icao, name, city, country, timezone) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (iata) DO NOTHING`,
        [
          "CGK",
          "WIII",
          "Soekarno-Hatta International Airport",
          "Jakarta",
          "Indonesia",
          "Asia/Jakarta",
        ]
      );
    } finally {
      client.release();
    }

    // Insert all SQ961 flights
    const insertPromises = sq961Flights.map(async (flight) => {
      const client = await db.connect();
      try {
        const insertQuery = `
          INSERT INTO flights (
            flight_date, flight_status, flight_number,
            airline_iata, airline_icao, airline_name,
            departure_airport_iata, departure_airport_icao, departure_airport_name,
            departure_terminal, departure_gate, 
            departure_scheduled, departure_estimated, departure_actual, departure_delay,
            arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
            arrival_terminal, arrival_gate, arrival_baggage,
            arrival_scheduled, arrival_estimated, arrival_actual, arrival_delay,
            is_delayed, is_cancelled, manual_simulation, manual_delay_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
          ON CONFLICT DO NOTHING
        `;

        const values = [
          flight.flight_date,
          flight.flight_status,
          flight.flight_number,
          flight.airline_iata,
          flight.airline_icao,
          flight.airline_name,
          flight.departure_airport_iata,
          flight.departure_airport_icao,
          flight.departure_airport_name,
          flight.departure_terminal,
          flight.departure_gate,
          flight.departure_scheduled,
          flight.departure_estimated,
          flight.departure_actual,
          flight.departure_delay,
          flight.arrival_airport_iata,
          flight.arrival_airport_icao,
          flight.arrival_airport_name,
          flight.arrival_terminal,
          flight.arrival_gate,
          flight.arrival_baggage,
          flight.arrival_scheduled,
          flight.arrival_estimated,
          flight.arrival_actual,
          flight.arrival_delay,
          flight.is_delayed,
          flight.is_cancelled,
          flight.manual_simulation,
          flight.manual_delay_reason,
        ];

        await client.query(insertQuery, values);
      } finally {
        client.release();
      }
    });

    await Promise.all(insertPromises);
    console.log(
      `✅ Successfully added ${sq961Flights.length} SQ961 flights to database`
    );

    return sq961Flights;
  } catch (error) {
    console.error("❌ Error adding SQ961 real data:", error);
    throw error;
  }
}

// Generate additional sample data
function generateAdditionalSampleData() {
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
    { iata: "JL", icao: "JAL", name: "Japan Airlines" },
    { iata: "NH", icao: "ANA", name: "All Nippon Airways" },
    { iata: "KL", icao: "KLM", name: "KLM Royal Dutch Airlines" },
    { iata: "VS", icao: "VIR", name: "Virgin Atlantic" },
    { iata: "TK", icao: "THY", name: "Turkish Airlines" },
    { iata: "CX", icao: "CPA", name: "Cathay Pacific" },
  ];

  const airports = [
    {
      iata: "JFK",
      icao: "KJFK",
      name: "John F. Kennedy International Airport",
      city: "New York",
      country: "United States",
      timezone: "America/New_York",
    },
    {
      iata: "LAX",
      icao: "KLAX",
      name: "Los Angeles International Airport",
      city: "Los Angeles",
      country: "United States",
      timezone: "America/Los_Angeles",
    },
    {
      iata: "CDG",
      icao: "LFPG",
      name: "Charles de Gaulle Airport",
      city: "Paris",
      country: "France",
      timezone: "Europe/Paris",
    },
    {
      iata: "DXB",
      icao: "OMDB",
      name: "Dubai International Airport",
      city: "Dubai",
      country: "United Arab Emirates",
      timezone: "Asia/Dubai",
    },
    {
      iata: "NRT",
      icao: "RJAA",
      name: "Narita International Airport",
      city: "Tokyo",
      country: "Japan",
      timezone: "Asia/Tokyo",
    },
    {
      iata: "SIN",
      icao: "WSSS",
      name: "Singapore Changi Airport",
      city: "Singapore",
      country: "Singapore",
      timezone: "Asia/Singapore",
    },
    {
      iata: "FRA",
      icao: "EDDF",
      name: "Frankfurt Airport",
      city: "Frankfurt",
      country: "Germany",
      timezone: "Europe/Berlin",
    },
    {
      iata: "AMS",
      icao: "EHAM",
      name: "Amsterdam Airport Schiphol",
      city: "Amsterdam",
      country: "Netherlands",
      timezone: "Europe/Amsterdam",
    },
    {
      iata: "IST",
      icao: "LTFM",
      name: "Istanbul Airport",
      city: "Istanbul",
      country: "Turkey",
      timezone: "Europe/Istanbul",
    },
    {
      iata: "DOH",
      icao: "OTHH",
      name: "Hamad International Airport",
      city: "Doha",
      country: "Qatar",
      timezone: "Asia/Qatar",
    },
    {
      iata: "ORD",
      icao: "KORD",
      name: "O'Hare International Airport",
      city: "Chicago",
      country: "United States",
      timezone: "America/Chicago",
    },
  ];

  const statuses = ["scheduled", "active", "landed", "delayed", "cancelled"];
  const terminals = ["1", "2", "3", "A", "B", "C", "D", "E"];
  const gates = [
    "A1",
    "A2",
    "B5",
    "C10",
    "D15",
    "E20",
    "1",
    "5",
    "10",
    "15",
    "20",
    "25",
  ];

  const sampleFlights = [];

  // Generate 20 flights with future dates
  for (let i = 0; i < 20; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const departure = airports[Math.floor(Math.random() * airports.length)];
    let arrival = airports[Math.floor(Math.random() * airports.length)];

    // Ensure departure and arrival are different
    while (arrival.iata === departure.iata) {
      arrival = airports[Math.floor(Math.random() * airports.length)];
    }

    // Generate future dates (next 7 days)
    const futureDate = moment().add(Math.floor(Math.random() * 7) + 1, "days");
    const departureTime = moment(futureDate)
      .hour(Math.floor(Math.random() * 24))
      .minute(Math.floor(Math.random() * 60));
    const flightDuration = Math.floor(Math.random() * 12) + 1; // 1-12 hours
    const arrivalTime = moment(departureTime).add(flightDuration, "hours");

    // Determine if flight is delayed (10% chance, no cancellations)
    const isDelayed = Math.random() < 0.1;
    const isCancelled = false; // No cancellations

    let departureDelay = 0;
    let arrivalDelay = 0;
    let estimatedDeparture = departureTime.toISOString();
    let estimatedArrival = arrivalTime.toISOString();
    let actualDeparture = null;
    let actualArrival = null;

    let flightStatus = "scheduled";

    if (isCancelled) {
      flightStatus = "cancelled";
    } else if (isDelayed) {
      flightStatus = "delayed";
      departureDelay = Math.floor(Math.random() * 120) + 15; // 15-135 minutes delay
      arrivalDelay = departureDelay + Math.floor(Math.random() * 30); // Arrival delay usually similar or slightly more
      estimatedDeparture = moment(departureTime)
        .add(departureDelay, "minutes")
        .toISOString();
      estimatedArrival = moment(arrivalTime)
        .add(arrivalDelay, "minutes")
        .toISOString();
    } else if (Math.random() < 0.2) {
      flightStatus = statuses[Math.floor(Math.random() * statuses.length)];
    }

    // If flight is in the past or active, set actual times
    if (
      futureDate.isBefore(moment()) ||
      flightStatus === "active" ||
      flightStatus === "landed"
    ) {
      actualDeparture = estimatedDeparture;
      if (flightStatus === "landed") {
        actualArrival = estimatedArrival;
      }
    }

    const flightNumber = `${airline.iata}${
      Math.floor(Math.random() * 9000) + 1000
    }`;

    const flight = {
      flight_date: futureDate.format("YYYY-MM-DD"),
      flight_status: flightStatus,
      flight_number: flightNumber,
      airline_iata: airline.iata,
      airline_icao: airline.icao,
      airline_name: airline.name,
      departure_airport_iata: departure.iata,
      departure_airport_icao: departure.icao,
      departure_airport_name: departure.name,
      departure_terminal:
        terminals[Math.floor(Math.random() * terminals.length)],
      departure_gate: gates[Math.floor(Math.random() * gates.length)],
      departure_scheduled: departureTime.toISOString(),
      departure_estimated: estimatedDeparture,
      departure_actual: actualDeparture,
      departure_delay: departureDelay,
      arrival_airport_iata: arrival.iata,
      arrival_airport_icao: arrival.icao,
      arrival_airport_name: arrival.name,
      arrival_terminal: terminals[Math.floor(Math.random() * terminals.length)],
      arrival_gate:
        Math.random() > 0.3
          ? gates[Math.floor(Math.random() * gates.length)]
          : null,
      arrival_baggage:
        Math.random() > 0.5 ? `${Math.floor(Math.random() * 20) + 1}` : null,
      arrival_scheduled: arrivalTime.toISOString(),
      arrival_estimated: estimatedArrival,
      arrival_actual: actualArrival,
      arrival_delay: arrivalDelay,
      is_delayed: isDelayed ? 1 : 0,
      is_cancelled: isCancelled ? 1 : 0,
    };

    sampleFlights.push(flight);
  }

  return sampleFlights;
}

// Load sample data from JSON file
async function loadSampleDataFromJSON() {
  try {
    // Check if we already have data
    const client = await db.connect();
    let result;
    try {
      result = await client.query("SELECT COUNT(*) as count FROM flights");
    } finally {
      client.release();
    }

    if (result.rows[0].count > 0) {
      console.log(
        `📄 Database already contains ${result.rows[0].count} flights`
      );
      // Add additional sample data even if we have existing data
      await addAdditionalSampleData();
      return;
    }

    // Load from sample-data.json
    const sampleDataPath = path.join(__dirname, "sample-data.json");
    if (!fs.existsSync(sampleDataPath)) {
      console.log(
        "📄 No sample-data.json found, will create with generated data"
      );
      return;
    }

    const rawData = fs.readFileSync(sampleDataPath, "utf8");
    const sampleData = JSON.parse(rawData);

    if (!sampleData.data || !Array.isArray(sampleData.data)) {
      console.log("📄 Invalid sample data format");
      return;
    }

    console.log(
      `📄 Loading ${sampleData.data.length} flights from sample-data.json...`
    );

    // Process each flight from sample data
    const insertPromises = sampleData.data.map(async (flight) => {
      const client = await db.connect();
      try {
        // Calculate delay status
        const departureDelay = flight.departure.delay || 0;
        const arrivalDelay = flight.arrival.delay || 0;
        const isDelayed = departureDelay > 0 || arrivalDelay > 0;
        const isCancelled = flight.flight_status === "cancelled";

        const insertQuery = `
          INSERT INTO flights (
            flight_date, flight_status, flight_number,
            airline_iata, airline_icao, airline_name,
            departure_airport_iata, departure_airport_icao, departure_airport_name,
            departure_terminal, departure_gate, 
            departure_scheduled, departure_estimated, departure_actual, departure_delay,
            arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
            arrival_terminal, arrival_gate, arrival_baggage,
            arrival_scheduled, arrival_estimated, arrival_actual, arrival_delay,
            is_delayed, is_cancelled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
          ON CONFLICT DO NOTHING
        `;

        const values = [
          flight.flight_date,
          flight.flight_status,
          flight.flight.iata || flight.flight.number,
          flight.airline.iata,
          flight.airline.icao,
          flight.airline.name,
          flight.departure.iata,
          flight.departure.icao,
          flight.departure.airport,
          flight.departure.terminal,
          flight.departure.gate,
          flight.departure.scheduled,
          flight.departure.estimated,
          flight.departure.actual,
          departureDelay,
          flight.arrival.iata,
          flight.arrival.icao,
          flight.arrival.airport,
          flight.arrival.terminal,
          flight.arrival.gate,
          flight.arrival.baggage,
          flight.arrival.scheduled,
          flight.arrival.estimated,
          flight.arrival.actual,
          arrivalDelay,
          isDelayed,
          isCancelled,
        ];

        await client.query(insertQuery, values);

        // Also insert airlines and airports if they don't exist
        if (flight.airline.iata) {
          await client.query(
            `INSERT INTO airlines (iata, icao, name) VALUES ($1, $2, $3) ON CONFLICT (iata) DO NOTHING`,
            [flight.airline.iata, flight.airline.icao, flight.airline.name]
          );
        }

        if (flight.departure.iata) {
          await client.query(
            `INSERT INTO airports (iata, icao, name, timezone) VALUES ($1, $2, $3, $4) ON CONFLICT (iata) DO NOTHING`,
            [
              flight.departure.iata,
              flight.departure.icao,
              flight.departure.airport,
              flight.departure.timezone,
            ]
          );
        }

        if (flight.arrival.iata) {
          await client.query(
            `INSERT INTO airports (iata, icao, name, timezone) VALUES ($1, $2, $3, $4) ON CONFLICT (iata) DO NOTHING`,
            [
              flight.arrival.iata,
              flight.arrival.icao,
              flight.arrival.airport,
              flight.arrival.timezone,
            ]
          );
        }
      } finally {
        client.release();
      }
    });

    await Promise.all(insertPromises);
    console.log("📄 Sample data loaded successfully!");

    // Add additional sample data
    await addAdditionalSampleData();
    console.log("📄 Additional sample data added successfully!");
  } catch (error) {
    console.error("Error loading sample data:", error);
    // Don't fail if sample data can't be loaded
  }
}

// Function to add additional sample data
async function addAdditionalSampleData() {
  try {
    const additionalFlights = generateAdditionalSampleData();
    console.log(`📄 Adding ${additionalFlights.length} additional flights...`);

    const insertPromises = additionalFlights.map(async (flight) => {
      const client = await db.connect();
      try {
        const insertQuery = `
          INSERT INTO flights (
            flight_date, flight_status, flight_number,
            airline_iata, airline_icao, airline_name,
            departure_airport_iata, departure_airport_icao, departure_airport_name,
            departure_terminal, departure_gate, 
            departure_scheduled, departure_estimated, departure_actual, departure_delay,
            arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
            arrival_terminal, arrival_gate, arrival_baggage,
            arrival_scheduled, arrival_estimated, arrival_actual, arrival_delay,
            is_delayed, is_cancelled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
          ON CONFLICT DO NOTHING
        `;

        const values = [
          flight.flight_date,
          flight.flight_status,
          flight.flight_number,
          flight.airline_iata,
          flight.airline_icao,
          flight.airline_name,
          flight.departure_airport_iata,
          flight.departure_airport_icao,
          flight.departure_airport_name,
          flight.departure_terminal,
          flight.departure_gate,
          flight.departure_scheduled,
          flight.departure_estimated,
          flight.departure_actual,
          flight.departure_delay,
          flight.arrival_airport_iata,
          flight.arrival_airport_icao,
          flight.arrival_airport_name,
          flight.arrival_terminal,
          flight.arrival_gate,
          flight.arrival_baggage,
          flight.arrival_scheduled,
          flight.arrival_estimated,
          flight.arrival_actual,
          flight.arrival_delay,
          flight.is_delayed,
          flight.is_cancelled,
        ];

        await client.query(insertQuery, values);

        // Also insert airlines and airports if they don't exist
        if (flight.airline_iata) {
          await client.query(
            `INSERT INTO airlines (iata, icao, name) VALUES ($1, $2, $3) ON CONFLICT (iata) DO NOTHING`,
            [flight.airline_iata, flight.airline_icao, flight.airline_name]
          );
        }

        if (flight.departure_airport_iata) {
          await client.query(
            `INSERT INTO airports (iata, icao, name, timezone) VALUES ($1, $2, $3, $4) ON CONFLICT (iata) DO NOTHING`,
            [
              flight.departure_airport_iata,
              flight.departure_airport_icao,
              flight.departure_airport_name,
              "UTC",
            ]
          );
        }

        if (flight.arrival_airport_iata) {
          await client.query(
            `INSERT INTO airports (iata, icao, name, timezone) VALUES ($1, $2, $3, $4) ON CONFLICT (iata) DO NOTHING`,
            [
              flight.arrival_airport_iata,
              flight.arrival_airport_icao,
              flight.arrival_airport_name,
              "UTC",
            ]
          );
        }
      } finally {
        client.release();
      }
    });

    await Promise.all(insertPromises);
    console.log("📄 Additional sample data inserted successfully!");
  } catch (error) {
    console.error("Error inserting additional sample data:", error);
    throw error;
  }
}

// Delay simulation function
function simulateDelayForFlight(flight, forceSimulation = false) {
  // If forceSimulation is true, simulate on any flight that isn't already delayed
  // Otherwise, only simulate delays for scheduled or active flights
  if (!forceSimulation) {
    if (
      flight.flight_status !== "scheduled" &&
      flight.flight_status !== "active"
    ) {
      return flight;
    }

    if (flight.status.isDelayed || flight.status.isCancelled) {
      return flight;
    }
  } else {
    // For forced simulation, only skip if already delayed
    if (flight.status.isDelayed) {
      return flight;
    }
  }

  // Create a deterministic seed based on flight data
  // This ensures the same flight always gets the same simulated delay
  const seed = hashString(
    flight.flight_number + flight.flight_date + flight.departure_airport_iata
  );

  // Create a copy of the flight to avoid mutating the original
  const simulatedFlight = JSON.parse(JSON.stringify(flight));

  // Generate realistic delay using seeded random (60% light, 30% moderate, 10% heavy)
  const random = seededRandom(seed);
  let delayMinutes;
  let delayReason;

  if (random < 0.6) {
    // Light delay: 15-45 minutes
    delayMinutes = Math.floor(seededRandom(seed + 1) * 30) + 15;
    delayReason = [
      "Air traffic control",
      "Late arriving aircraft",
      "Passenger boarding",
    ][Math.floor(seededRandom(seed + 2) * 3)];
  } else if (random < 0.9) {
    // Moderate delay: 45-90 minutes
    delayMinutes = Math.floor(seededRandom(seed + 1) * 45) + 45;
    delayReason = [
      "Weather conditions",
      "Technical maintenance",
      "Crew scheduling",
    ][Math.floor(seededRandom(seed + 2) * 3)];
  } else {
    // Heavy delay: 90-180 minutes
    delayMinutes = Math.floor(seededRandom(seed + 1) * 90) + 90;
    delayReason = [
      "Severe weather",
      "Severe weather",
      "Aircraft maintenance",
      "Airport congestion",
    ][Math.floor(seededRandom(seed + 2) * 3)];
  }

  // Update flight status and times
  simulatedFlight.flight_status = "delayed";
  simulatedFlight.status.isDelayed = true;
  simulatedFlight.status.isCancelled = false; // Override cancellation if it was cancelled
  simulatedFlight.departure.delay = delayMinutes;
  simulatedFlight.arrival.delay =
    delayMinutes + Math.floor(seededRandom(seed + 3) * 15); // Arrival delay usually slightly more

  // Update estimated times
  const originalDeparture = moment(simulatedFlight.departure.scheduled);
  const originalArrival = moment(simulatedFlight.arrival.scheduled);

  simulatedFlight.departure.estimated = originalDeparture
    .add(delayMinutes, "minutes")
    .toISOString();
  simulatedFlight.arrival.estimated = originalArrival
    .add(simulatedFlight.arrival.delay, "minutes")
    .toISOString();

  // Add delay reason and delay_minutes for Chainlink integration
  simulatedFlight.delay_minutes = delayMinutes;
  simulatedFlight.simulation = {
    delayApplied: true,
    delayMinutes: delayMinutes,
    delayReason: delayReason,
    originalStatus: flight.flight_status,
  };

  return simulatedFlight;
}

// Helper functions for deterministic random generation
function hashString(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  // Simple seeded random number generator (Linear Congruential Generator)
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);
  const x = (a * seed + c) % m;
  return x / m;
}

// Helper function to get flights with filters using PostgreSQL
async function getFlights(
  filters = {},
  limit = 10,
  offset = 0,
  simulateDelay = false
) {
  const client = await db.connect();

  try {
    let query = `
      SELECT 
        f.*,
        da.name as departure_airport_full_name,
        da.city as departure_city,
        da.country as departure_country,
        da.timezone as departure_timezone,
        aa.name as arrival_airport_full_name,
        aa.city as arrival_city,
        aa.country as arrival_country,
        aa.timezone as arrival_timezone
      FROM flights f
      LEFT JOIN airports da ON f.departure_airport_iata = da.iata
      LEFT JOIN airports aa ON f.arrival_airport_iata = aa.iata
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.departure_iata) {
      query += ` AND f.departure_airport_iata = $${paramIndex}`;
      params.push(filters.departure_iata.toUpperCase());
      paramIndex++;
    }

    if (filters.arrival_iata) {
      query += ` AND f.arrival_airport_iata = $${paramIndex}`;
      params.push(filters.arrival_iata.toUpperCase());
      paramIndex++;
    }

    if (filters.airline_iata) {
      query += ` AND f.airline_iata = $${paramIndex}`;
      params.push(filters.airline_iata.toUpperCase());
      paramIndex++;
    }

    if (filters.flight_number) {
      query += ` AND f.flight_number = $${paramIndex}`;
      params.push(filters.flight_number.toUpperCase());
      paramIndex++;
    }

    if (filters.flight_status) {
      query += ` AND f.flight_status = $${paramIndex}`;
      params.push(filters.flight_status.toLowerCase());
      paramIndex++;
    }

    if (filters.flight_date) {
      query += ` AND DATE(f.flight_date) = $${paramIndex}`;
      params.push(filters.flight_date);
      paramIndex++;
    }

    if (filters.is_delayed !== undefined) {
      query += ` AND f.is_delayed = $${paramIndex}`;
      params.push(filters.is_delayed);
      paramIndex++;
    }

    if (filters.is_cancelled !== undefined) {
      query += ` AND f.is_cancelled = $${paramIndex}`;
      params.push(filters.is_cancelled);
      paramIndex++;
    }

    // Add ordering and pagination - show upcoming flights first (from today onwards)
    query += ` ORDER BY 
      CASE WHEN f.flight_date >= CURRENT_DATE THEN 0 ELSE 1 END,
      f.flight_date ASC, 
      f.departure_scheduled ASC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    const rows = result.rows;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM flights f 
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    // Apply same filters for count
    if (filters.departure_iata) {
      countQuery += ` AND f.departure_airport_iata = $${countParamIndex}`;
      countParams.push(filters.departure_iata.toUpperCase());
      countParamIndex++;
    }

    if (filters.arrival_iata) {
      countQuery += ` AND f.arrival_airport_iata = $${countParamIndex}`;
      countParams.push(filters.arrival_iata.toUpperCase());
      countParamIndex++;
    }

    if (filters.airline_iata) {
      countQuery += ` AND f.airline_iata = $${countParamIndex}`;
      countParams.push(filters.airline_iata.toUpperCase());
      countParamIndex++;
    }

    if (filters.flight_number) {
      countQuery += ` AND f.flight_number = $${countParamIndex}`;
      countParams.push(filters.flight_number.toUpperCase());
      countParamIndex++;
    }

    if (filters.flight_status) {
      countQuery += ` AND f.flight_status = $${countParamIndex}`;
      countParams.push(filters.flight_status.toLowerCase());
      countParamIndex++;
    }

    if (filters.flight_date) {
      countQuery += ` AND DATE(f.flight_date) = $${countParamIndex}`;
      countParams.push(filters.flight_date);
      countParamIndex++;
    }

    if (filters.is_delayed !== undefined) {
      countQuery += ` AND f.is_delayed = $${countParamIndex}`;
      countParams.push(filters.is_delayed);
      countParamIndex++;
    }

    if (filters.is_cancelled !== undefined) {
      countQuery += ` AND f.is_cancelled = $${countParamIndex}`;
      countParams.push(filters.is_cancelled);
      countParamIndex++;
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Format flights data
    let flights = rows.map((row) => ({
      flight_date: row.flight_date,
      flight_status: row.flight_status,
      departure: {
        airport: row.departure_airport_name || row.departure_airport_full_name,
        timezone: row.departure_timezone,
        iata: row.departure_airport_iata,
        icao: row.departure_airport_icao,
        terminal: row.departure_terminal,
        gate: row.departure_gate,
        delay: row.departure_delay,
        scheduled: row.departure_scheduled,
        estimated: row.departure_estimated,
        actual: row.departure_actual,
      },
      arrival: {
        airport: row.arrival_airport_name || row.arrival_airport_full_name,
        timezone: row.arrival_timezone,
        iata: row.arrival_airport_iata,
        icao: row.arrival_airport_icao,
        terminal: row.arrival_terminal,
        gate: row.arrival_gate,
        baggage: row.arrival_baggage,
        delay: row.arrival_delay,
        scheduled: row.arrival_scheduled,
        estimated: row.arrival_estimated,
        actual: row.arrival_actual,
      },
      airline: {
        name: row.airline_name,
        iata: row.airline_iata,
        icao: row.airline_icao,
      },
      flight: {
        number: row.flight_number,
        iata: row.flight_number,
        icao: row.airline_icao
          ? `${row.airline_icao}${row.flight_number.replace(/[A-Z]+/, "")}`
          : null,
      },
      status: {
        isDelayed: Boolean(row.is_delayed),
        isCancelled: Boolean(row.is_cancelled),
      },
    }));

    // Return results
    const resultData = {
      data: flights,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: flights.length,
        total: total,
      },
    };

    return resultData;
  } finally {
    client.release();
  }
}

// Routes

// Swagger UI route
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Travelsure Flight API Documentation",
  })
);

/**
 * @swagger
 * /api/flights:
 *   get:
 *     summary: Get flights with optional filters
 *     description: Retrieve a list of flights with optional filtering, pagination, and delay simulation capabilities
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: departure_iata
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *         description: Filter by departure airport IATA code (3 letters)
 *         example: JFK
 *       - in: query
 *         name: arrival_iata
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *         description: Filter by arrival airport IATA code (3 letters)
 *         example: LAX
 *       - in: query
 *         name: airline_iata
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *         description: Filter by airline IATA code (2 letters)
 *         example: AA
 *       - in: query
 *         name: flight_number
 *         schema:
 *           type: string
 *         description: Filter by specific flight number
 *         example: AA1234
 *       - in: query
 *         name: flight_status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, landed, delayed, cancelled]
 *         description: Filter by flight status
 *         example: scheduled
 *       - in: query
 *         name: flight_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by flight date (YYYY-MM-DD)
 *         example: 2025-10-22
 *       - in: query
 *         name: is_delayed
 *         schema:
 *           type: boolean
 *         description: Filter by delay status
 *         example: true
 *       - in: query
 *         name: is_cancelled
 *         schema:
 *           type: boolean
 *         description: Filter by cancellation status
 *         example: false
 *       - in: query
 *         name: simulateDelay
 *         schema:
 *           type: boolean
 *         description: |
 *           **Enable Realistic Delay Simulation**
 *
 *           When set to `true`, this parameter applies realistic flight delays to eligible flights:
 *           - **Light delays**: 15-45 minutes (60% probability) - Air traffic control, late aircraft, passenger boarding
 *           - **Moderate delays**: 45-90 minutes (30% probability) - Weather conditions, technical maintenance, crew scheduling
 *           - **Heavy delays**: 90-180 minutes (10% probability) - Severe weather, aircraft maintenance, airport congestion
 *
 *           **Simulation Rules:**
 *           - Only applies to flights with status `scheduled` or `active`
 *           - For single flight requests: Always applies delay if eligible
 *           - For multiple flight requests: ~10% of eligible flights get delayed
 *           - Cancelled flights can be converted to delayed when explicitly requested
 *           - Updates `flight_status`, `departure.delay`, `arrival.delay`, and estimated times
 *           - Adds `simulation` object to response with delay details
 *
 *           **Use Cases:**
 *           - Testing insurance claim systems
 *           - Simulating real-world delay scenarios
 *           - API integration testing
 *           - User experience testing with delayed flights
 *         example: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return per page
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved flights
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlightsResponse'
 *             examples:
 *               normal_response:
 *                 summary: Normal flight response (without simulation)
 *                 value:
 *                   data:
 *                     - flight_date: "2025-10-22"
 *                       flight_status: "scheduled"
 *                       departure:
 *                         airport: "John F. Kennedy International Airport"
 *                         iata: "JFK"
 *                         delay: 0
 *                         scheduled: "2025-10-22T14:30:00.000Z"
 *                         estimated: "2025-10-22T14:30:00.000Z"
 *                       arrival:
 *                         airport: "Los Angeles International Airport"
 *                         iata: "LAX"
 *                         delay: 0
 *                         scheduled: "2025-10-22T20:30:00.000Z"
 *                         estimated: "2025-10-22T20:30:00.000Z"
 *                       airline:
 *                         name: "American Airlines"
 *                         iata: "AA"
 *                       flight:
 *                         number: "AA1234"
 *                       status:
 *                         isDelayed: false
 *                         isCancelled: false
 *                   pagination:
 *                     limit: 10
 *                     offset: 0
 *                     count: 1
 *                     total: 259
 *               simulated_response:
 *                 summary: Response with delay simulation enabled
 *                 value:
 *                   data:
 *                     - flight_date: "2025-10-22"
 *                       flight_status: "delayed"
 *                       departure:
 *                         airport: "John F. Kennedy International Airport"
 *                         iata: "JFK"
 *                         delay: 67
 *                         scheduled: "2025-10-22T14:30:00.000Z"
 *                         estimated: "2025-10-22T15:37:00.000Z"
 *                       arrival:
 *                         airport: "Los Angeles International Airport"
 *                         iata: "LAX"
 *                         delay: 72
 *                         scheduled: "2025-10-22T20:30:00.000Z"
 *                         estimated: "2025-10-22T21:42:00.000Z"
 *                       airline:
 *                         name: "American Airlines"
 *                         iata: "AA"
 *                       flight:
 *                         number: "AA1234"
 *                       status:
 *                         isDelayed: true
 *                         isCancelled: false
 *                       simulation:
 *                         delayApplied: true
 *                         delayMinutes: 67
 *                         delayReason: "Air traffic control"
 *                         originalStatus: "scheduled"
 *                   pagination:
 *                     limit: 10
 *                     offset: 0
 *                     count: 1
 *                     total: 259
 *                   simulation:
 *                     delaySimulated: true
 *                     delaysApplied: 1
 *                     totalFlights: 1
 *                     averageDelayMinutes: 67
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get flights with persistent data
app.get("/api/flights", async (req, res) => {
  try {
    const {
      departure_iata,
      arrival_iata,
      airline_iata,
      flight_number,
      flight_status,
      flight_date,
      is_delayed,
      is_cancelled,
      simulateDelay,
      limit = 10,
      offset = 0,
    } = req.query;

    const filters = {};
    if (departure_iata) filters.departure_iata = departure_iata;
    if (arrival_iata) filters.arrival_iata = arrival_iata;
    if (airline_iata) filters.airline_iata = airline_iata;
    if (flight_number) filters.flight_number = flight_number;
    if (flight_status) filters.flight_status = flight_status;
    if (flight_date) filters.flight_date = flight_date;
    if (is_delayed !== undefined) filters.is_delayed = is_delayed === "true";
    if (is_cancelled !== undefined)
      filters.is_cancelled = is_cancelled === "true";

    const shouldSimulateDelay = simulateDelay === "true";
    const result = await getFlights(
      filters,
      parseInt(limit),
      parseInt(offset),
      shouldSimulateDelay
    );
    res.json(result);
  } catch (error) {
    console.error("Error fetching flights:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error fetching flights",
      },
    });
  }
});

/**
 * @swagger
 * /api/flights/{flightNumber}:
 *   get:
 *     summary: Get specific flight by flight number
 *     description: Retrieve detailed information for a specific flight by its flight number, with optional date filtering and delay simulation
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: flightNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight number (e.g., AA1234, DL7008)
 *         example: AA1234
 *       - in: query
 *         name: flight_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific flight date (YYYY-MM-DD)
 *         example: 2025-10-22
 *       - in: query
 *         name: simulateDelay
 *         schema:
 *           type: boolean
 *         description: |
 *           **Enable Realistic Delay Simulation for Specific Flight**
 *
 *           When set to `true`, this parameter forces delay simulation on the requested flight:
 *           - **Always applies delay** if flight is eligible (not already delayed)
 *           - **Converts cancelled flights** to delayed status when explicitly requested
 *           - **Realistic delay ranges**: 15-45min (light), 45-90min (moderate), 90-180min (heavy)
 *           - **Includes delay reason**: Air traffic, weather, maintenance, etc.
 *           - **Updates all relevant fields**: status, estimated times, delay minutes
 *
 *           Perfect for testing specific flight scenarios in insurance systems.
 *         example: true
 *     responses:
 *       200:
 *         description: Successfully retrieved flight information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flight'
 *                 simulation:
 *                   type: object
 *                   nullable: true
 *                   description: Simulation information (only present when simulateDelay=true)
 *       404:
 *         description: Flight not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/flights/delay-simulations:
 *   get:
 *     summary: Get all manual delay simulations
 *     description: Retrieve a list of all active manual delay simulations
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: flight_number
 *         schema:
 *           type: string
 *         description: Filter by flight number
 *         example: "AA123"
 *       - in: query
 *         name: flight_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by flight date (YYYY-MM-DD)
 *         example: "2025-10-23"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: List of delay simulations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       flight_number:
 *                         type: string
 *                         example: "AA123"
 *                       flight_date:
 *                         type: string
 *                         example: "2025-10-23"
 *                       delay_minutes:
 *                         type: integer
 *                         example: 90
 *                       delay_reason:
 *                         type: string
 *                         example: "Weather conditions"
 *                       status:
 *                         type: string
 *                         example: "delayed"
 *                       created_at:
 *                         type: string
 *                         example: "2025-10-23T10:30:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     count:
 *                       type: integer
 *                       example: 5
 *                     total:
 *                       type: integer
 *                       example: 25
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/api/flights/delay-simulations", async (req, res) => {
  try {
    const { flight_number, flight_date, limit = 10, offset = 0 } = req.query;

    let query =
      "SELECT flight_number, flight_date, departure_delay as delay_minutes, manual_delay_reason as delay_reason, flight_status as status, updated_at as created_at FROM flights WHERE manual_simulation = true";
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (flight_number) {
      query += ` AND flight_number = $${paramIndex}`;
      params.push(flight_number.toUpperCase());
      paramIndex++;
    }

    if (flight_date) {
      query += ` AND DATE(flight_date) = $${paramIndex}`;
      params.push(flight_date);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(parseInt(limit), parseInt(offset));

    // Get delay simulations
    const client = await db.connect();
    try {
      const delayResult = await client.query(query, params);
      const delaySimulations = delayResult.rows;

      // Get total count
      let countQuery =
        "SELECT COUNT(*) as total FROM flights WHERE manual_simulation = true";
      const countParams = [];
      let countParamIndex = 1;

      if (flight_number) {
        countQuery += ` AND flight_number = $${countParamIndex}`;
        countParams.push(flight_number.toUpperCase());
        countParamIndex++;
      }

      if (flight_date) {
        countQuery += ` AND DATE(flight_date) = $${countParamIndex}`;
        countParams.push(flight_date);
        countParamIndex++;
      }

      const countResult = await client.query(countQuery, countParams);
      const totalCount = countResult.rows[0].total;

      res.json({
        success: true,
        data: delaySimulations,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: delaySimulations.length,
          total: parseInt(totalCount),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching delay simulations:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error fetching delay simulations",
      },
    });
  }
});

/**
 * @swagger
 * /api/flights/delay-simulations/{flight_number}/{flight_date}:
 *   delete:
 *     summary: Remove a delay simulation
 *     description: Remove a manual delay simulation for a specific flight and date
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: flight_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight number
 *         example: "AA123"
 *       - in: path
 *         name: flight_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Flight date (YYYY-MM-DD)
 *         example: "2025-10-23"
 *     responses:
 *       200:
 *         description: Delay simulation removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Delay simulation removed successfully"
 *       404:
 *         description: Delay simulation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete(
  "/api/flights/delay-simulations/:flight_number/:flight_date",
  async (req, res) => {
    try {
      const { flight_number, flight_date } = req.params;

      // Validate date format
      if (!moment(flight_date, "YYYY-MM-DD", true).isValid()) {
        return res.status(400).json({
          error: {
            code: "invalid_date_format",
            message: "flight_date must be in YYYY-MM-DD format",
          },
        });
      }

      const client = await db.connect();
      try {
        // Check if flight exists with manual simulation
        const flight = await client.query(
          "SELECT * FROM flights WHERE flight_number = $1 AND DATE(flight_date) = $2 AND manual_simulation = true",
          [flight_number.toUpperCase(), flight_date]
        );

        if (flight.rows.length === 0) {
          return res.status(404).json({
            error: {
              code: "simulation_not_found",
              message: `No manual delay simulation found for flight ${flight_number} on ${flight_date}`,
            },
          });
        }

        // Reset flight to original state
        const resetQuery = `
          UPDATE flights SET 
            departure_estimated = departure_scheduled,
            arrival_estimated = arrival_scheduled,
            departure_delay = 0,
            arrival_delay = 0,
            flight_status = 'scheduled',
            is_delayed = false,
            is_cancelled = false,
            manual_simulation = false,
            manual_delay_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE flight_number = $1 AND DATE(flight_date) = $2
        `;

        await client.query(resetQuery, [
          flight_number.toUpperCase(),
          flight_date,
        ]);

        res.json({
          success: true,
          message: "Delay simulation removed successfully",
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error removing delay simulation:", error);
      res.status(500).json({
        error: {
          code: "database_error",
          message: "Error removing delay simulation",
        },
      });
    }
  }
);

/**
 * @swagger
 * /api/flights/sq961:
 *   get:
 *     summary: Get Singapore Airlines SQ961 real flight data
 *     description: Retrieve real-world SQ961 flight data (Jakarta to Singapore) with optional date filtering and delay simulation
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: flight_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific flight date (YYYY-MM-DD)
 *         example: 2025-10-26
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return
 *         example: 7
 *       - in: query
 *         name: simulateDelay
 *         schema:
 *           type: boolean
 *         description: Enable delay simulation for SQ961
 *         example: true
 *     responses:
 *       200:
 *         description: Successfully retrieved SQ961 flight information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flight'
 *                 pagination:
 *                   type: object
 *                 realFlightInfo:
 *                   type: object
 *                   properties:
 *                     flightNumber:
 *                       type: string
 *                       example: "SQ961"
 *                     route:
 *                       type: string
 *                       example: "Jakarta (CGK) → Singapore (SIN)"
 *                     airline:
 *                       type: string
 *                       example: "Singapore Airlines"
 *                     typicalDuration:
 *                       type: string
 *                       example: "1h 45m"
 *                     frequency:
 *                       type: string
 *                       example: "Daily"
 *       404:
 *         description: No SQ961 flights found
 *       500:
 *         description: Database error
 */
app.get("/api/flights/sq961", async (req, res) => {
  try {
    const { flight_date, limit = 10, simulateDelay } = req.query;

    const filters = { flight_number: "SQ961" };
    if (flight_date) filters.flight_date = flight_date;

    const shouldSimulateDelay = simulateDelay === "true";
    const result = await getFlights(
      filters,
      parseInt(limit),
      0,
      shouldSimulateDelay
    );

    if (result.data.length > 0) {
      const responseData = {
        ...result,
        realFlightInfo: {
          flightNumber: "SQ961",
          route: "Jakarta (CGK) → Singapore (SIN)",
          airline: "Singapore Airlines",
          typicalDuration: "1h 45m",
          frequency: "Daily",
          aircraft: "Airbus A330-300",
          departureTime: "08:15 WIB",
          arrivalTime: "11:00 SGT",
          notes: "Real-world flight data with realistic delay patterns",
        },
      };
      res.json(responseData);
    } else {
      res.status(404).json({
        error: {
          code: "flight_not_found",
          message: "SQ961 flight not found for the specified criteria",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching SQ961 flights:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error fetching SQ961 flights",
      },
    });
  }
});

// Get specific flight by flight number and date
app.get("/api/flights/:flightNumber", async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { flight_date, simulateDelay } = req.query;

    const filters = { flight_number: flightNumber };
    if (flight_date) filters.flight_date = flight_date;

    const shouldSimulateDelay = simulateDelay === "true";
    const result = await getFlights(filters, 1, 0, shouldSimulateDelay);

    if (result.data.length > 0) {
      res.json({
        data: result.data,
        simulation: result.simulation || null,
      });
    } else {
      res.status(404).json({
        error: {
          code: "flight_not_found",
          message: "Flight not found",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching flight:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error fetching flight",
      },
    });
  }
});

/**
 * @swagger
 * /api/airlines:
 *   get:
 *     summary: Get airlines
 *     description: Retrieve a list of airlines with pagination
 *     tags: [Airlines]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return per page
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved airlines
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Airline'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get airlines
app.get("/api/airlines", async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const client = await db.connect();
    try {
      const result = await client.query(
        `SELECT * FROM airlines ORDER BY name LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      );

      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM airlines`
      );

      res.json({
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: result.rows.length,
          total: parseInt(countResult.rows[0].total),
        },
        data: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching airlines:", error);
    res.status(500).json({
      error: { code: "database_error", message: "Error fetching airlines" },
    });
  }
});

/**
 * @swagger
 * /api/airports:
 *   get:
 *     summary: Get airports
 *     description: Retrieve a list of airports with optional search functionality and pagination
 *     tags: [Airports]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search airports by name, city, or IATA code
 *         example: New York
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return per page
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved airports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Airport'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get airports
app.get("/api/airports", async (req, res) => {
  try {
    const { limit = 10, offset = 0, search } = req.query;

    let query = `SELECT * FROM airports`;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE name ILIKE $${paramIndex} OR city ILIKE $${
        paramIndex + 1
      } OR iata ILIKE $${paramIndex + 2}`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    query += ` ORDER BY name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const client = await db.connect();
    try {
      const result = await client.query(query, params);

      let countQuery = `SELECT COUNT(*) as total FROM airports`;
      const countParams = [];

      if (search) {
        countQuery += ` WHERE name ILIKE $1 OR city ILIKE $2 OR iata ILIKE $3`;
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      const countResult = await client.query(countQuery, countParams);

      res.json({
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: result.rows.length,
          total: parseInt(countResult.rows[0].total),
        },
        data: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching airports:", error);
    res.status(500).json({
      error: { code: "database_error", message: "Error fetching airports" },
    });
  }
});

/**
 * @swagger
 * /api/statistics:
 *   get:
 *     summary: Get flight statistics
 *     description: Retrieve comprehensive flight statistics for today including delays, cancellations, and on-time performance
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Successfully retrieved flight statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Statistics'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get flight statistics
app.get("/api/statistics", async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");
    const stats = {};

    const client = await db.connect();
    try {
      // Total flights today
      const totalResult = await client.query(
        `SELECT COUNT(*) as total FROM flights WHERE DATE(flight_date) = $1`,
        [today]
      );
      stats.total_flights_today = parseInt(totalResult.rows[0].total);

      // On-time flights (not delayed)
      const ontimeResult = await client.query(
        `SELECT COUNT(*) as ontime FROM flights WHERE DATE(flight_date) = $1 AND is_delayed = false`,
        [today]
      );
      stats.ontime_flights = parseInt(ontimeResult.rows[0].ontime);
      stats.on_time_percentage =
        stats.total_flights_today > 0
          ? Math.round((stats.ontime_flights / stats.total_flights_today) * 100)
          : 0;

      // Delayed flights
      const delayedResult = await client.query(
        `SELECT COUNT(*) as delayed FROM flights WHERE DATE(flight_date) = $1 AND is_delayed = true`,
        [today]
      );
      stats.delayed_flights = parseInt(delayedResult.rows[0].delayed);

      // Cancelled flights
      const cancelledResult = await client.query(
        `SELECT COUNT(*) as cancelled FROM flights WHERE DATE(flight_date) = $1 AND is_cancelled = true`,
        [today]
      );
      stats.cancelled_flights = parseInt(cancelledResult.rows[0].cancelled);

      // Average delay
      const avgDelayResult = await client.query(
        `SELECT AVG(departure_delay) as avg_delay FROM flights WHERE DATE(flight_date) = $1 AND is_delayed = true`,
        [today]
      );
      stats.average_delay_minutes = Math.round(
        parseFloat(avgDelayResult.rows[0].avg_delay) || 0
      );

      res.json({ data: stats });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error fetching statistics",
      },
    });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check the health status of the API server and database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Health status
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current timestamp
 *                   example: 2025-10-21T12:00:00.000Z
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600.5
 *                 database:
 *                   type: string
 *                   description: Database connection status
 *                   example: connected
 */

/**
 * @swagger
 * /api/flights/simulate-delay:
 *   post:
 *     summary: Manually simulate delay for a specific flight
 *     description: Create or update a manual delay simulation for a flight on a specific date
 *     tags: [Flights]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flight_number
 *               - flight_date
 *               - delay_minutes
 *             properties:
 *               flight_number:
 *                 type: string
 *                 description: Flight number (e.g., AA123)
 *                 example: "AA123"
 *               flight_date:
 *                 type: string
 *                 format: date
 *                 description: Flight date in YYYY-MM-DD format
 *                 example: "2025-10-23"
 *               delay_minutes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *                 description: Delay in minutes (0-600, 0 removes simulation)
 *                 example: 90
 *               delay_reason:
 *                 type: string
 *                 description: Reason for the delay
 *                 example: "Weather conditions"
 *               status:
 *                 type: string
 *                 enum: [delayed, cancelled]
 *                 default: delayed
 *                 description: Flight status to simulate
 *                 example: "delayed"
 *     responses:
 *       200:
 *         description: Delay simulation created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Delay simulation created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     flight_number:
 *                       type: string
 *                       example: "AA123"
 *                     flight_date:
 *                       type: string
 *                       example: "2025-10-23"
 *                     delay_minutes:
 *                       type: integer
 *                       example: 90
 *                     delay_reason:
 *                       type: string
 *                       example: "Weather conditions"
 *                     status:
 *                       type: string
 *                       example: "delayed"
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/api/flights/simulate-delay", async (req, res) => {
  try {
    const {
      flight_number,
      flight_date,
      delay_minutes,
      delay_reason,
      status = "delayed",
    } = req.body;

    // Validation
    if (!flight_number || !flight_date || delay_minutes === undefined) {
      return res.status(400).json({
        error: {
          code: "missing_required_fields",
          message: "flight_number, flight_date, and delay_minutes are required",
        },
      });
    }

    if (
      typeof delay_minutes !== "number" ||
      delay_minutes < 0 ||
      delay_minutes > 600
    ) {
      return res.status(400).json({
        error: {
          code: "invalid_delay_minutes",
          message: "delay_minutes must be a number between 0 and 600",
        },
      });
    }

    // Validate date format
    if (!moment(flight_date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({
        error: {
          code: "invalid_date_format",
          message: "flight_date must be in YYYY-MM-DD format",
        },
      });
    }

    // Validate status
    const validStatuses = ["delayed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: "invalid_status",
          message: "status must be one of: " + validStatuses.join(", "),
        },
      });
    }

    const client = await db.connect();
    try {
      // Get the existing flight data
      const flightResult = await client.query(
        "SELECT * FROM flights WHERE flight_number = $1 AND DATE(flight_date) = $2",
        [flight_number.toUpperCase(), flight_date]
      );

      if (flightResult.rows.length === 0) {
        return res.status(400).json({
          error: {
            code: "flight_not_found",
            message: `Flight ${flight_number} on ${flight_date} not found in database`,
          },
        });
      }

      const flight = flightResult.rows[0];

      // Calculate new times based on delay
      let newDepartureEstimated = flight.departure_scheduled;
      let newArrivalEstimated = flight.arrival_scheduled;
      let newStatus = flight.flight_status;

      if (delay_minutes > 0) {
        // Add delay to scheduled times
        newDepartureEstimated = moment(flight.departure_scheduled)
          .add(delay_minutes, "minutes")
          .format("YYYY-MM-DD HH:mm:ss");
        newArrivalEstimated = moment(flight.arrival_scheduled)
          .add(delay_minutes, "minutes")
          .format("YYYY-MM-DD HH:mm:ss");
        newStatus = status;
      } else if (delay_minutes === 0) {
        // Reset to original scheduled times (remove delay)
        newDepartureEstimated = flight.departure_scheduled;
        newArrivalEstimated = flight.arrival_scheduled;
        newStatus = "scheduled"; // Reset to scheduled
      }

      // Update the flight record
      const updateQuery = `
        UPDATE flights SET 
          departure_estimated = $1,
          arrival_estimated = $2,
          departure_delay = $3,
          arrival_delay = $4,
          flight_status = $5,
          is_delayed = $6,
          is_cancelled = $7,
          manual_simulation = $8,
          manual_delay_reason = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE flight_number = $10 AND DATE(flight_date) = $11
      `;

      await client.query(updateQuery, [
        newDepartureEstimated,
        newArrivalEstimated,
        delay_minutes,
        delay_minutes,
        newStatus,
        delay_minutes > 0,
        status === "cancelled",
        delay_minutes > 0,
        delay_minutes > 0 ? delay_reason || "Manual simulation" : null,
        flight_number.toUpperCase(),
        flight_date,
      ]);

      res.json({
        success: true,
        message:
          delay_minutes === 0
            ? "Flight delay removed and reset to scheduled times"
            : "Flight delay applied successfully",
        data: {
          flight_number: flight_number.toUpperCase(),
          flight_date,
          delay_minutes,
          delay_reason:
            delay_minutes > 0 ? delay_reason || "Manual simulation" : null,
          status: newStatus,
          departure_scheduled: flight.departure_scheduled,
          departure_estimated: newDepartureEstimated,
          arrival_scheduled: flight.arrival_scheduled,
          arrival_estimated: newArrivalEstimated,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating delay simulation:", error);
    res.status(500).json({
      error: {
        code: "database_error",
        message: "Error creating delay simulation",
      },
    });
  }
});

/**
 * @swagger
 * /api/flights/delay-simulations:
 *   get:
 *     summary: Get all manual delay simulations
 *     description: Retrieve a list of all active manual delay simulations
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: flight_number
 *         schema:
 *           type: string
 *         description: Filter by flight number
 *         example: "AA123"
 *       - in: query
 *         name: flight_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by flight date (YYYY-MM-DD)
 *         example: "2025-10-23"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: List of delay simulations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       flight_number:
 *                         type: string
 *                         example: "AA123"
 *                       flight_date:
 *                         type: string
 *                         example: "2025-10-23"
 *                       delay_minutes:
 *                         type: integer
 *                         example: 90
 *                       delay_reason:
 *                         type: string
 *                         example: "Weather conditions"
 *                       status:
 *                         type: string
 *                         example: "delayed"
 *                       created_at:
 *                         type: string
 *                         example: "2025-10-23T10:30:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     count:
 *                       type: integer
 *                       example: 5
 *                     total:
 *                       type: integer
 *                       example: 25
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: moment().toISOString(),
    uptime: process.uptime(),
    database: db ? "connected" : "disconnected",
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

// Function to extend flight data across date range (today to Dec 30, 2025)
async function extendFlightDataAcrossDateRange() {
  console.log(
    "🗓️ Extending flight data across date range (Oct 23 - Dec 30, 2025)..."
  );

  const client = await db.connect();
  try {
    // Get all unique flight templates (flight_number, airline info, route info) except SQ961
    const templateQuery = `
      SELECT DISTINCT 
        flight_number,
        airline_iata,
        airline_icao, 
        airline_name,
        departure_airport_iata,
        departure_airport_icao,
        departure_airport_name,
        departure_terminal,
        departure_gate,
        arrival_airport_iata,
        arrival_airport_icao,
        arrival_airport_name,
        arrival_terminal,
        arrival_gate,
        arrival_baggage,
        -- Use the first occurrence times as template
        TO_CHAR(departure_scheduled, 'HH24:MI:SS') as departure_time,
        TO_CHAR(arrival_scheduled, 'HH24:MI:SS') as arrival_time,
        flight_status
      FROM flights 
      WHERE flight_number != 'SQ961'
      GROUP BY flight_number, airline_iata, airline_icao, airline_name,
               departure_airport_iata, departure_airport_icao, departure_airport_name,
               departure_terminal, departure_gate,
               arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
               arrival_terminal, arrival_gate, arrival_baggage,
               TO_CHAR(departure_scheduled, 'HH24:MI:SS'),
               TO_CHAR(arrival_scheduled, 'HH24:MI:SS'),
               flight_status
    `;

    const templateResult = await client.query(templateQuery);
    const templates = templateResult.rows;

    console.log(
      `📋 Found ${templates.length} unique flight templates to extend`
    );

    // Generate dates from Oct 23, 2025 to Dec 30, 2025
    const startDate = moment("2025-10-23");
    const endDate = moment("2025-12-30");
    const dates = [];

    for (
      let date = startDate.clone();
      date.isSameOrBefore(endDate);
      date.add(1, "day")
    ) {
      dates.push(date.format("YYYY-MM-DD"));
    }

    console.log(`🗓️ Generating flights for ${dates.length} days`);

    // Clear existing flights first to avoid duplicates, but keep SQ961 real data
    await client.query("DELETE FROM flights WHERE flight_number != 'SQ961'");

    // Prepare insert data
    const insertData = [];

    // Generate flights for each template and each date (skip SQ961 as it has real data)
    templates.forEach((template) => {
      // Skip SQ961 since we want to keep the real data
      if (template.flight_number === "SQ961") {
        return;
      }

      dates.forEach((flightDate) => {
        // Calculate departure and arrival times for this date
        const departureDateTime = moment(
          `${flightDate} ${template.departure_time}`
        );
        const arrivalDateTime = moment(
          `${flightDate} ${template.arrival_time}`
        );

        // Add some randomization to make it more realistic
        const randomDelayChance = Math.random();
        let status = template.flight_status;
        let departureDelay = 0;
        let arrivalDelay = 0;
        let isDelayed = false;
        let isCancelled = false;

        // 10% chance of having a random delay (not manual simulation)
        if (randomDelayChance < 0.1) {
          departureDelay = Math.floor(Math.random() * 120) + 10; // 10-130 minutes delay
          arrivalDelay = departureDelay + Math.floor(Math.random() * 20); // Slightly more for arrival
          status = "delayed";
          isDelayed = true;
        }
        // No cancellations

        const departureEstimated = isDelayed
          ? departureDateTime
              .clone()
              .add(departureDelay, "minutes")
              .format("YYYY-MM-DD HH:mm:ss")
          : departureDateTime.format("YYYY-MM-DD HH:mm:ss");

        const arrivalEstimated = isDelayed
          ? arrivalDateTime
              .clone()
              .add(arrivalDelay, "minutes")
              .format("YYYY-MM-DD HH:mm:ss")
          : arrivalDateTime.format("YYYY-MM-DD HH:mm:ss");

        insertData.push([
          flightDate,
          status,
          template.flight_number,
          template.airline_iata,
          template.airline_icao,
          template.airline_name,
          template.departure_airport_iata,
          template.departure_airport_icao,
          template.departure_airport_name,
          template.departure_terminal,
          template.departure_gate,
          departureDateTime.format("YYYY-MM-DD HH:mm:ss"),
          departureEstimated,
          template.arrival_airport_iata,
          template.arrival_airport_icao,
          template.arrival_airport_name,
          template.arrival_terminal,
          template.arrival_gate,
          template.arrival_baggage,
          arrivalDateTime.format("YYYY-MM-DD HH:mm:ss"),
          arrivalEstimated,
          departureDelay,
          arrivalDelay,
          isDelayed,
          isCancelled,
        ]);
      });
    });

    // Batch insert all data
    console.log(`🚀 Inserting ${insertData.length} flight records...`);

    const insertQuery = `
      INSERT INTO flights (
        flight_date, flight_status, flight_number,
        airline_iata, airline_icao, airline_name,
        departure_airport_iata, departure_airport_icao, departure_airport_name,
        departure_terminal, departure_gate, departure_scheduled, departure_estimated,
        arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
        arrival_terminal, arrival_gate, arrival_baggage,
        arrival_scheduled, arrival_estimated,
        departure_delay, arrival_delay, is_delayed, is_cancelled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `;

    const batchSize = 100;
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      const promises = batch.map((values) => client.query(insertQuery, values));
      await Promise.all(promises);

      if (i % 1000 === 0) {
        console.log(
          `📈 Inserted ${i + batch.length}/${insertData.length} records...`
        );
      }
    }

    console.log(
      `✅ Successfully generated ${insertData.length} flight records across ${dates.length} days`
    );
    console.log(
      `📊 Average of ${Math.round(
        insertData.length / dates.length
      )} flights per day`
    );
  } catch (error) {
    console.error("Error extending flight data:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to clean up duplicate SQ961 data
async function cleanupDuplicateSQ961Data() {
  console.log("🧹 Cleaning up duplicate SQ961 flight data...");

  const client = await db.connect();
  try {
    // Delete all existing SQ961 flights to start fresh
    const result = await client.query(
      "DELETE FROM flights WHERE flight_number = 'SQ961'"
    );
    console.log(`✅ Removed ${result.rowCount} existing SQ961 flights`);
  } catch (error) {
    console.error("❌ Error cleaning up SQ961 data:", error);
  } finally {
    client.release();
  }
}

// Clean up any existing LHR data
async function cleanupLHRData() {
  try {
    const client = await db.connect();
    try {
      // Remove any flights with LHR as departure or arrival
      await client.query(
        "DELETE FROM flights WHERE departure_airport_iata = 'LHR' OR arrival_airport_iata = 'LHR'"
      );

      // Remove LHR airport entry
      await client.query("DELETE FROM airports WHERE iata = 'LHR'");

      console.log("🧹 Cleaned up LHR data from database");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error cleaning up LHR data:", error);
    // Don't fail startup if cleanup fails
  }
}

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    await cleanupLHRData();
    await cleanupDuplicateSQ961Data();
    await loadSampleDataFromJSON();
    await addSQ961RealData();
    await extendFlightDataAcrossDateRange();

    app.listen(PORT, () => {
      console.log(
        `🛫 Travelsure Persistent Flight API Server running on port ${PORT}`
      );
      console.log(`📋 Available endpoints:`);
      console.log(`   GET /api/flights - Get flights with optional filters`);
      console.log(`   GET /api/flights/:flightNumber - Get specific flight`);
      console.log(`   GET /api/airlines - Get airlines`);
      console.log(`   GET /api/airports - Get airports`);
      console.log(`   GET /api/statistics - Get flight statistics`);
      console.log(`   GET /health - Health check`);

      console.log(`\n� API Documentation:`);
      console.log(`   Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(
        `   Interactive API explorer with detailed schemas and examples`
      );

      console.log(`\n�📖 Example usage:`);
      console.log(`\n🛫 FLIGHTS API:`);
      console.log(`   Get all flights (paginated):`);
      console.log(`   → http://localhost:${PORT}/api/flights`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?limit=20&offset=10`
      );

      console.log(`\n   Filter by departure/arrival airports:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?departure_iata=JFK`
      );
      console.log(`   → http://localhost:${PORT}/api/flights?arrival_iata=LAX`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?departure_iata=JFK&arrival_iata=CDG`
      );

      console.log(`\n   Filter by airline:`);
      console.log(`   → http://localhost:${PORT}/api/flights?airline_iata=AA`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?airline_iata=UA&limit=5`
      );

      console.log(`\n   Filter by flight status:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_status=delayed`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_status=scheduled`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_status=cancelled`
      );

      console.log(`\n   Filter by delay/cancellation status:`);
      console.log(`   → http://localhost:${PORT}/api/flights?is_delayed=true`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?is_cancelled=true`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?is_delayed=false&limit=10`
      );

      console.log(`\n   Filter by date:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_date=2025-10-22`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_date=2025-10-23&is_delayed=true`
      );

      console.log(`\n   Combined filters:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?departure_iata=JFK&airline_iata=AA&is_delayed=true`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?arrival_iata=DXB&flight_status=scheduled&limit=15`
      );

      console.log(`\n🎭 DELAY SIMULATION:`);
      console.log(`   Simulate realistic delays on scheduled flights:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights?simulateDelay=true`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?simulateDelay=true&limit=20`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?departure_iata=JFK&simulateDelay=true`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?airline_iata=AA&simulateDelay=true&limit=10`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights?flight_status=scheduled&simulateDelay=true`
      );

      console.log(`\n🔍 SPECIFIC FLIGHT API:`);
      console.log(`   Get flight by number:`);
      console.log(`   → http://localhost:${PORT}/api/flights/AA1234`);
      console.log(`   → http://localhost:${PORT}/api/flights/UA5678`);
      console.log(`   → http://localhost:${PORT}/api/flights/EK2468`);

      console.log(`\n   Get flight by number and date:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights/AA1234?flight_date=2025-10-22`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights/DL9876?flight_date=2025-10-23`
      );

      console.log(`\n   Simulate delay for specific flight:`);
      console.log(
        `   → http://localhost:${PORT}/api/flights/AA1234?simulateDelay=true`
      );
      console.log(
        `   → http://localhost:${PORT}/api/flights/UA5678?flight_date=2025-10-22&simulateDelay=true`
      );

      console.log(`\n✈️ AIRLINES API:`);
      console.log(`   Get all airlines:`);
      console.log(`   → http://localhost:${PORT}/api/airlines`);
      console.log(
        `   → http://localhost:${PORT}/api/airlines?limit=20&offset=5`
      );

      console.log(`\n🏢 AIRPORTS API:`);
      console.log(`   Get all airports:`);
      console.log(`   → http://localhost:${PORT}/api/airports`);
      console.log(`   → http://localhost:${PORT}/api/airports?limit=15`);

      console.log(`\n   Search airports:`);
      console.log(
        `   → http://localhost:${PORT}/api/airports?search=New%20York`
      );
      console.log(`   → http://localhost:${PORT}/api/airports?search=JFK`);
      console.log(`   → http://localhost:${PORT}/api/airports?search=London`);

      console.log(`\n📊 STATISTICS API:`);
      console.log(`   Get today's flight statistics:`);
      console.log(`   → http://localhost:${PORT}/api/statistics`);

      console.log(`\n❤️ HEALTH CHECK:`);
      console.log(`   Check server health:`);
      console.log(`   → http://localhost:${PORT}/health`);

      console.log(`\n🌐 CURL Examples:`);
      console.log(
        `   curl "http://localhost:${PORT}/api/flights?is_delayed=true&limit=5"`
      );
      console.log(`   curl "http://localhost:${PORT}/api/flights/AA1234"`);
      console.log(
        `   curl "http://localhost:${PORT}/api/airports?search=Dubai"`
      );
      console.log(`   curl "http://localhost:${PORT}/api/statistics"`);
      console.log(
        `   curl "http://localhost:${PORT}/api/flights?simulateDelay=true&limit=10"`
      );
      console.log(
        `   curl "http://localhost:${PORT}/api/flights/UA1234?simulateDelay=true"`
      );

      console.log(`\n💡 Pro Tips:`);
      console.log(`   • Use 'limit' and 'offset' parameters for pagination`);
      console.log(
        `   • Airport codes (IATA) should be 3 letters (e.g., JFK, LAX, CDG)`
      );
      console.log(
        `   • Airline codes (IATA) should be 2 letters (e.g., AA, UA, DL)`
      );
      console.log(`   • Date format: YYYY-MM-DD (e.g., 2025-10-22)`);
      console.log(`   • Boolean values: 'true' or 'false' as strings`);
      console.log(
        `   • Flight status options: scheduled, active, landed, delayed, cancelled`
      );
      console.log(
        `   • simulateDelay=true: Applies realistic delays to ~10% of eligible flights`
      );
      console.log(
        `   • Simulation only affects 'scheduled' and 'active' flights not already delayed`
      );
      console.log(
        `   • Simulated delays include: light (15-45min), moderate (45-90min), heavy (90-180min)`
      );
      console.log(
        `   • Response includes 'simulation' object with delay statistics when simulateDelay=true`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
