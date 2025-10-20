const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const moment = require("moment");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, "flights.db");

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err);
        reject(err);
        return;
      }
      console.log("📊 Connected to SQLite database");

      // Create tables
      db.serialize(() => {
        // Airlines table
        db.run(`CREATE TABLE IF NOT EXISTS airlines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          iata TEXT UNIQUE,
          icao TEXT,
          name TEXT
        )`);

        // Airports table
        db.run(`CREATE TABLE IF NOT EXISTS airports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          iata TEXT UNIQUE,
          icao TEXT,
          name TEXT,
          city TEXT,
          country TEXT,
          timezone TEXT
        )`);

        // Flights table with your requested fields
        db.run(
          `CREATE TABLE IF NOT EXISTS flights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          flight_date TEXT NOT NULL,
          flight_status TEXT NOT NULL,
          flight_number TEXT NOT NULL,
          airline_iata TEXT,
          airline_icao TEXT,
          airline_name TEXT,
          
          departure_airport_iata TEXT,
          departure_airport_icao TEXT,
          departure_airport_name TEXT,
          departure_terminal TEXT,
          departure_gate TEXT,
          departure_scheduled TEXT NOT NULL,
          departure_estimated TEXT,
          departure_actual TEXT,
          departure_delay INTEGER DEFAULT 0,
          
          arrival_airport_iata TEXT,
          arrival_airport_icao TEXT,
          arrival_airport_name TEXT,
          arrival_terminal TEXT,
          arrival_gate TEXT,
          arrival_baggage TEXT,
          arrival_scheduled TEXT NOT NULL,
          arrival_estimated TEXT,
          arrival_actual TEXT,
          arrival_delay INTEGER DEFAULT 0,
          
          is_delayed BOOLEAN DEFAULT 0,
          is_cancelled BOOLEAN DEFAULT 0,
          
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (airline_iata) REFERENCES airlines (iata),
          FOREIGN KEY (departure_airport_iata) REFERENCES airports (iata),
          FOREIGN KEY (arrival_airport_iata) REFERENCES airports (iata)
        )`,
          (err) => {
            if (err) {
              console.error("Error creating flights table:", err);
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    });
  });
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
      iata: "LHR",
      icao: "EGLL",
      name: "London Heathrow Airport",
      city: "London",
      country: "United Kingdom",
      timezone: "Europe/London",
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

    // Determine if flight is delayed (30% chance)
    const isDelayed = Math.random() < 0.3;
    const isCancelled = Math.random() < 0.05; // 5% chance of cancellation

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
function loadSampleDataFromJSON() {
  return new Promise((resolve, reject) => {
    // Check if we already have data
    db.get("SELECT COUNT(*) as count FROM flights", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log(`📄 Database already contains ${row.count} flights`);
        // Add additional sample data even if we have existing data
        addAdditionalSampleData()
          .then(() => resolve())
          .catch(reject);
        return;
      }

      // Load from sample-data.json
      try {
        const sampleDataPath = path.join(__dirname, "sample-data.json");
        if (!fs.existsSync(sampleDataPath)) {
          console.log(
            "📄 No sample-data.json found, will create with generated data"
          );
          resolve();
          return;
        }

        const rawData = fs.readFileSync(sampleDataPath, "utf8");
        const sampleData = JSON.parse(rawData);

        if (!sampleData.data || !Array.isArray(sampleData.data)) {
          console.log("📄 Invalid sample data format");
          resolve();
          return;
        }

        console.log(
          `📄 Loading ${sampleData.data.length} flights from sample-data.json...`
        );

        // Process each flight from sample data
        const insertPromises = sampleData.data.map((flight) => {
          return new Promise((insertResolve, insertReject) => {
            // Calculate delay status
            const departureDelay = flight.departure.delay || 0;
            const arrivalDelay = flight.arrival.delay || 0;
            const isDelayed = departureDelay > 0 || arrivalDelay > 0;
            const isCancelled = flight.flight_status === "cancelled";

            const insertQuery = `
              INSERT OR IGNORE INTO flights (
                flight_date, flight_status, flight_number,
                airline_iata, airline_icao, airline_name,
                departure_airport_iata, departure_airport_icao, departure_airport_name,
                departure_terminal, departure_gate, 
                departure_scheduled, departure_estimated, departure_actual, departure_delay,
                arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
                arrival_terminal, arrival_gate, arrival_baggage,
                arrival_scheduled, arrival_estimated, arrival_actual, arrival_delay,
                is_delayed, is_cancelled
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              isDelayed ? 1 : 0,
              isCancelled ? 1 : 0,
            ];

            db.run(insertQuery, values, function (err) {
              if (err) {
                console.error("Error inserting flight:", err);
                insertReject(err);
              } else {
                insertResolve();
              }
            });

            // Also insert airlines and airports if they don't exist
            if (flight.airline.iata) {
              db.run(
                `INSERT OR IGNORE INTO airlines (iata, icao, name) VALUES (?, ?, ?)`,
                [flight.airline.iata, flight.airline.icao, flight.airline.name]
              );
            }

            if (flight.departure.iata) {
              db.run(
                `INSERT OR IGNORE INTO airports (iata, icao, name, timezone) VALUES (?, ?, ?, ?)`,
                [
                  flight.departure.iata,
                  flight.departure.icao,
                  flight.departure.airport,
                  flight.departure.timezone,
                ]
              );
            }

            if (flight.arrival.iata) {
              db.run(
                `INSERT OR IGNORE INTO airports (iata, icao, name, timezone) VALUES (?, ?, ?, ?)`,
                [
                  flight.arrival.iata,
                  flight.arrival.icao,
                  flight.arrival.airport,
                  flight.arrival.timezone,
                ]
              );
            }
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            console.log("📄 Sample data loaded successfully!");
            // Add additional sample data
            return addAdditionalSampleData();
          })
          .then(() => {
            console.log("📄 Additional sample data added successfully!");
            resolve();
          })
          .catch(reject);
      } catch (error) {
        console.error("Error loading sample data:", error);
        resolve(); // Don't fail if sample data can't be loaded
      }
    });
  });
}

// Function to add additional sample data
function addAdditionalSampleData() {
  return new Promise((resolve, reject) => {
    const additionalFlights = generateAdditionalSampleData();
    console.log(`📄 Adding ${additionalFlights.length} additional flights...`);

    const insertPromises = additionalFlights.map((flight) => {
      return new Promise((insertResolve, insertReject) => {
        const insertQuery = `
          INSERT OR IGNORE INTO flights (
            flight_date, flight_status, flight_number,
            airline_iata, airline_icao, airline_name,
            departure_airport_iata, departure_airport_icao, departure_airport_name,
            departure_terminal, departure_gate, 
            departure_scheduled, departure_estimated, departure_actual, departure_delay,
            arrival_airport_iata, arrival_airport_icao, arrival_airport_name,
            arrival_terminal, arrival_gate, arrival_baggage,
            arrival_scheduled, arrival_estimated, arrival_actual, arrival_delay,
            is_delayed, is_cancelled
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

        db.run(insertQuery, values, function (err) {
          if (err) {
            console.error("Error inserting additional flight:", err);
            insertReject(err);
          } else {
            insertResolve();
          }
        });

        // Also insert airlines and airports if they don't exist
        if (flight.airline_iata) {
          db.run(
            `INSERT OR IGNORE INTO airlines (iata, icao, name) VALUES (?, ?, ?)`,
            [flight.airline_iata, flight.airline_icao, flight.airline_name]
          );
        }

        if (flight.departure_airport_iata) {
          db.run(
            `INSERT OR IGNORE INTO airports (iata, icao, name, timezone) VALUES (?, ?, ?, ?)`,
            [
              flight.departure_airport_iata,
              flight.departure_airport_icao,
              flight.departure_airport_name,
              "UTC",
            ]
          );
        }

        if (flight.arrival_airport_iata) {
          db.run(
            `INSERT OR IGNORE INTO airports (iata, icao, name, timezone) VALUES (?, ?, ?, ?)`,
            [
              flight.arrival_airport_iata,
              flight.arrival_airport_icao,
              flight.arrival_airport_name,
              "UTC",
            ]
          );
        }
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        console.log("📄 Additional sample data inserted successfully!");
        resolve();
      })
      .catch(reject);
  });
}

// Helper function to get flights with filters
function getFlights(filters = {}, limit = 10, offset = 0) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        f.*,
        da.name as departure_airport_name,
        da.city as departure_city,
        da.country as departure_country,
        aa.name as arrival_airport_name,
        aa.city as arrival_city,
        aa.country as arrival_country
      FROM flights f
      LEFT JOIN airports da ON f.departure_airport_iata = da.iata
      LEFT JOIN airports aa ON f.arrival_airport_iata = aa.iata
      WHERE 1=1
    `;

    const params = [];

    // Apply filters
    if (filters.departure_iata) {
      query += ` AND f.departure_airport_iata = ?`;
      params.push(filters.departure_iata.toUpperCase());
    }

    if (filters.arrival_iata) {
      query += ` AND f.arrival_airport_iata = ?`;
      params.push(filters.arrival_iata.toUpperCase());
    }

    if (filters.airline_iata) {
      query += ` AND f.airline_iata = ?`;
      params.push(filters.airline_iata.toUpperCase());
    }

    if (filters.flight_number) {
      query += ` AND f.flight_number = ?`;
      params.push(filters.flight_number.toUpperCase());
    }

    if (filters.flight_status) {
      query += ` AND f.flight_status = ?`;
      params.push(filters.flight_status.toLowerCase());
    }

    if (filters.flight_date) {
      query += ` AND f.flight_date = ?`;
      params.push(filters.flight_date);
    }

    if (filters.is_delayed !== undefined) {
      query += ` AND f.is_delayed = ?`;
      params.push(filters.is_delayed ? 1 : 0);
    }

    if (filters.is_cancelled !== undefined) {
      query += ` AND f.is_cancelled = ?`;
      params.push(filters.is_cancelled ? 1 : 0);
    }

    // Add ordering and pagination
    query += ` ORDER BY f.flight_date DESC, f.departure_scheduled ASC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM flights f 
        WHERE 1=1
      `;

      const countParams = [];

      // Apply same filters for count
      if (filters.departure_iata) {
        countQuery += ` AND f.departure_airport_iata = ?`;
        countParams.push(filters.departure_iata.toUpperCase());
      }

      if (filters.arrival_iata) {
        countQuery += ` AND f.arrival_airport_iata = ?`;
        countParams.push(filters.arrival_iata.toUpperCase());
      }

      if (filters.airline_iata) {
        countQuery += ` AND f.airline_iata = ?`;
        countParams.push(filters.airline_iata.toUpperCase());
      }

      if (filters.flight_number) {
        countQuery += ` AND f.flight_number = ?`;
        countParams.push(filters.flight_number.toUpperCase());
      }

      if (filters.flight_status) {
        countQuery += ` AND f.flight_status = ?`;
        countParams.push(filters.flight_status.toLowerCase());
      }

      if (filters.flight_date) {
        countQuery += ` AND f.flight_date = ?`;
        countParams.push(filters.flight_date);
      }

      if (filters.is_delayed !== undefined) {
        countQuery += ` AND f.is_delayed = ?`;
        countParams.push(filters.is_delayed ? 1 : 0);
      }

      if (filters.is_cancelled !== undefined) {
        countQuery += ` AND f.is_cancelled = ?`;
        countParams.push(filters.is_cancelled ? 1 : 0);
      }

      db.get(countQuery, countParams, (countErr, countRow) => {
        if (countErr) {
          reject(countErr);
          return;
        }

        // Format flights data
        const flights = rows.map((row) => ({
          flight_date: row.flight_date,
          flight_status: row.flight_status,
          departure: {
            airport: row.departure_airport_name,
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
            airport: row.arrival_airport_name,
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

        resolve({
          data: flights,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: flights.length,
            total: countRow.total,
          },
        });
      });
    });
  });
}

// Routes

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

    const result = await getFlights(filters, parseInt(limit), parseInt(offset));
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

// Get specific flight by flight number and date
app.get("/api/flights/:flightNumber", async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { flight_date } = req.query;

    const filters = { flight_number: flightNumber };
    if (flight_date) filters.flight_date = flight_date;

    const result = await getFlights(filters, 1, 0);

    if (result.data.length > 0) {
      res.json({
        data: result.data,
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

// Get airlines
app.get("/api/airlines", (req, res) => {
  const { limit = 10, offset = 0 } = req.query;

  db.all(
    `SELECT * FROM airlines ORDER BY name LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)],
    (err, rows) => {
      if (err) {
        console.error("Error fetching airlines:", err);
        res.status(500).json({
          error: { code: "database_error", message: "Error fetching airlines" },
        });
        return;
      }

      db.get(`SELECT COUNT(*) as total FROM airlines`, (countErr, countRow) => {
        if (countErr) {
          console.error("Error counting airlines:", countErr);
          res.status(500).json({
            error: {
              code: "database_error",
              message: "Error counting airlines",
            },
          });
          return;
        }

        res.json({
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: rows.length,
            total: countRow.total,
          },
          data: rows,
        });
      });
    }
  );
});

// Get airports
app.get("/api/airports", (req, res) => {
  const { limit = 10, offset = 0, search } = req.query;

  let query = `SELECT * FROM airports`;
  let params = [];

  if (search) {
    query += ` WHERE name LIKE ? OR city LIKE ? OR iata LIKE ?`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY name LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching airports:", err);
      res.status(500).json({
        error: { code: "database_error", message: "Error fetching airports" },
      });
      return;
    }

    let countQuery = `SELECT COUNT(*) as total FROM airports`;
    let countParams = [];

    if (search) {
      countQuery += ` WHERE name LIKE ? OR city LIKE ? OR iata LIKE ?`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    db.get(countQuery, countParams, (countErr, countRow) => {
      if (countErr) {
        console.error("Error counting airports:", countErr);
        res.status(500).json({
          error: { code: "database_error", message: "Error counting airports" },
        });
        return;
      }

      res.json({
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: rows.length,
          total: countRow.total,
        },
        data: rows,
      });
    });
  });
});

// Get flight statistics
app.get("/api/statistics", (req, res) => {
  const today = moment().format("YYYY-MM-DD");

  db.serialize(() => {
    const stats = {};

    // Total flights today
    db.get(
      `SELECT COUNT(*) as total FROM flights WHERE flight_date = ?`,
      [today],
      (err, row) => {
        if (err) {
          console.error("Error getting total flights:", err);
          res.status(500).json({
            error: {
              code: "database_error",
              message: "Error fetching statistics",
            },
          });
          return;
        }
        stats.total_flights_today = row.total;

        // On-time flights (not delayed)
        db.get(
          `SELECT COUNT(*) as ontime FROM flights WHERE flight_date = ? AND is_delayed = 0`,
          [today],
          (err, row) => {
            if (err) {
              console.error("Error getting on-time flights:", err);
              res.status(500).json({
                error: {
                  code: "database_error",
                  message: "Error fetching statistics",
                },
              });
              return;
            }
            stats.ontime_flights = row.ontime;
            stats.on_time_percentage =
              stats.total_flights_today > 0
                ? Math.round(
                    (stats.ontime_flights / stats.total_flights_today) * 100
                  )
                : 0;

            // Delayed flights
            db.get(
              `SELECT COUNT(*) as delayed FROM flights WHERE flight_date = ? AND is_delayed = 1`,
              [today],
              (err, row) => {
                if (err) {
                  console.error("Error getting delayed flights:", err);
                  res.status(500).json({
                    error: {
                      code: "database_error",
                      message: "Error fetching statistics",
                    },
                  });
                  return;
                }
                stats.delayed_flights = row.delayed;

                // Cancelled flights
                db.get(
                  `SELECT COUNT(*) as cancelled FROM flights WHERE flight_date = ? AND is_cancelled = 1`,
                  [today],
                  (err, row) => {
                    if (err) {
                      console.error("Error getting cancelled flights:", err);
                      res.status(500).json({
                        error: {
                          code: "database_error",
                          message: "Error fetching statistics",
                        },
                      });
                      return;
                    }
                    stats.cancelled_flights = row.cancelled;

                    // Average delay
                    db.get(
                      `SELECT AVG(departure_delay) as avg_delay FROM flights WHERE flight_date = ? AND is_delayed = 1`,
                      [today],
                      (err, row) => {
                        if (err) {
                          console.error("Error getting average delay:", err);
                          res.status(500).json({
                            error: {
                              code: "database_error",
                              message: "Error fetching statistics",
                            },
                          });
                          return;
                        }
                        stats.average_delay_minutes = Math.round(
                          row.avg_delay || 0
                        );

                        res.json({ data: stats });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

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

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    await loadSampleDataFromJSON();

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
      console.log(`\n📖 Example usage:`);
      console.log(
        `   http://localhost:${PORT}/api/flights?departure_iata=MEL&limit=5`
      );
      console.log(
        `   http://localhost:${PORT}/api/flights?is_delayed=true&limit=10`
      );
      console.log(`   http://localhost:${PORT}/api/flights?is_cancelled=true`);
      console.log(
        `   http://localhost:${PORT}/api/flights/CX178?flight_date=2025-10-17`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
