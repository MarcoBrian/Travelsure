# Travelsure Mock Flight API Server

A comprehensive mock API server that simulates flight data similar to Aviation Stack API. Perfect for development and testing of flight-related applications.

## Features

- 🛫 Realistic flight data generation
- ✈️ Multiple endpoints for different data types
- 🔍 Filtering and pagination support
- 📊 Flight statistics and analytics
- 🌍 Global airline and airport data
- 📱 RESTful API design
- ⚡ Real-time flight tracking simulation

## Installation

```bash
cd backend/mock-server
npm install
```

## Usage

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in PORT environment variable).

## API Endpoints

### 🛫 Flights

#### Get Flights

```
GET /api/flights
```

**Query Parameters:**

- `departure_iata` - Filter by departure airport IATA code (e.g., JFK)
- `arrival_iata` - Filter by arrival airport IATA code (e.g., LAX)
- `airline_iata` - Filter by airline IATA code (e.g., AA)
- `flight_iata` - Filter by flight number (e.g., AA1234)
- `flight_status` - Filter by status (scheduled, active, landed, cancelled, incident, diverted)
- `flight_date` - Filter by date (YYYY-MM-DD format)
- `limit` - Number of results (default: 10)
- `offset` - Pagination offset (default: 0)

**Example:**

```
GET /api/flights?departure_iata=JFK&arrival_iata=LAX&limit=5
```

#### Get Specific Flight

```
GET /api/flights/:flightNumber
```

**Query Parameters:**

- `flight_date` - Flight date (YYYY-MM-DD format)

**Example:**

```
GET /api/flights/AA1234?flight_date=2025-10-16
```

### ✈️ Airlines

#### Get Airlines

```
GET /api/airlines
```

**Query Parameters:**

- `limit` - Number of results (default: 10)
- `offset` - Pagination offset (default: 0)

### 🏢 Airports

#### Get Airports

```
GET /api/airports
```

**Query Parameters:**

- `search` - Search by name, city, or IATA code
- `limit` - Number of results (default: 10)
- `offset` - Pagination offset (default: 0)

**Example:**

```
GET /api/airports?search=kennedy&limit=5
```

### 🗺️ Routes

#### Get Popular Routes

```
GET /api/routes
```

Returns popular flight routes with distance and operating airlines.

### 📊 Statistics

#### Get Flight Statistics

```
GET /api/statistics
```

Returns daily flight statistics including on-time performance, delays, and cancellations.

### 🔍 Health Check

#### Health Check

```
GET /health
```

Returns server health status and uptime.

## Response Format

All endpoints return JSON responses with the following structure:

### Success Response

```json
{
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 10,
    "total": 100
  },
  "data": [...]
}
```

### Error Response

```json
{
  "error": {
    "code": "error_code",
    "message": "Error description"
  }
}
```

## Sample Flight Data Structure

```json
{
  "flight_date": "2025-10-16",
  "flight_status": "scheduled",
  "departure": {
    "airport": "John F. Kennedy International Airport",
    "timezone": "UTC",
    "iata": "JFK",
    "icao": "KJFK",
    "terminal": "A",
    "gate": "12",
    "delay": null,
    "scheduled": "2025-10-16T14:30:00.000Z",
    "estimated": "2025-10-16T14:30:00.000Z",
    "actual": null
  },
  "arrival": {
    "airport": "Los Angeles International Airport",
    "timezone": "UTC",
    "iata": "LAX",
    "icao": "KLAX",
    "terminal": "B",
    "gate": "25",
    "baggage": "5",
    "delay": null,
    "scheduled": "2025-10-16T18:45:00.000Z",
    "estimated": "2025-10-16T18:45:00.000Z",
    "actual": null
  },
  "airline": {
    "name": "American Airlines",
    "iata": "AA",
    "icao": "AAL"
  },
  "flight": {
    "number": "AA1234",
    "iata": "AA1234",
    "icao": "AAL1234"
  },
  "aircraft": {
    "registration": "N123AA",
    "iata": "737-800",
    "icao": "B738",
    "icao24": "A12B3C"
  },
  "live": {
    "updated": "2025-10-16T15:30:00.000Z",
    "latitude": 40.6413,
    "longitude": -73.7781,
    "altitude": 35000,
    "direction": 270,
    "speed_horizontal": 450,
    "speed_vertical": 0,
    "is_ground": false
  }
}
```

## Available Airlines

- American Airlines (AA)
- Delta Air Lines (DL)
- United Airlines (UA)
- Emirates (EK)
- Qatar Airways (QR)
- Lufthansa (LH)
- Air France (AF)
- British Airways (BA)
- Singapore Airlines (SQ)
- Cathay Pacific (CX)

## Available Airports

- JFK - John F. Kennedy International Airport (New York)
- LAX - Los Angeles International Airport (Los Angeles)
- LHR - London Heathrow Airport (London)
- CDG - Charles de Gaulle Airport (Paris)
- DXB - Dubai International Airport (Dubai)
- NRT - Narita International Airport (Tokyo)
- SIN - Singapore Changi Airport (Singapore)
- FRA - Frankfurt Airport (Frankfurt)
- HKG - Hong Kong International Airport (Hong Kong)
- SYD - Sydney Kingsford Smith Airport (Sydney)

## Environment Variables

- `PORT` - Server port (default: 3001)

## Development

The server generates realistic mock data including:

- Flight schedules and real-time updates
- Airline and airport information
- Aircraft details and live tracking
- Delays and status updates
- Terminal and gate assignments

Perfect for testing flight booking systems, travel apps, and aviation-related applications without needing real API access or rate limits.
