# Planora — Smart AI Trip Planner
Planora is a full-stack AI-powered trip planning platform that helps users organize trips, discover places, manage activities, track expenses, and generate personalized travel recommendations.

It combines structured planning tools with intelligent recommendations to create a smooth travel planning experience.

---

## Overview

Planora allows travelers to:

* Create and manage trips
* Discover nearby places and AI-recommended destinations
* Plan daily activities
* Track expenses and budgets
* Upload trip banners and images
* Get personalized travel suggestions based on preferences

The platform integrates AI recommendations, location services, and a structured planning workflow into a single application.

---

## Features

### Trip Management

* Create, update, and delete trips
* Upload custom trip banners
* Track trip status and duration

### Places & Recommendations

* AI-generated travel recommendations
* Nearby place discovery
* Category filtering
* Favorites and visit status tracking
* Hidden gems and top-rated filtering

### Activities Planner

* Schedule activities by date
* Status tracking
* Trip-based activity organization

### Expense Tracking

* Add expenses per trip
* Budget monitoring
* Expense summaries and category insights

### Authentication

* Email/password login
* Google OAuth login
* JWT-based authentication

### File Uploads

* Image uploads
* Banner uploads
* Document uploads

---

## Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB + Mongoose
* JWT Authentication
* Multer (file uploads)
* Geoapify API (location & places)
* OpenRouter integration (AI recommendations)

### Frontend

* Vanilla JavaScript
* HTML & CSS
* Map integrations
* AI recommendation interface

### Infrastructure

* Render (Backend Hosting)
* GitHub Pages (Frontend Hosting)

---

## Project Structure

```
Trip-planner/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   └── utils/
│
├── pages/
│   ├── css/
│   ├── scripts/
|   |-- index.html
│   └── Svg/
```

---

## Getting Started

### 1. Clone the Repository

```
git clone https://github.com/akshat-shaw-509/Trip-planner.git
cd Trip-planner
```

---

### 2. Install Dependencies

```
npm install
```

---

### 3. Environment Variables

Create a `.env` file in the backend root:

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GEOAPIFY_API_KEY=your_geoapify_key
OPENROUTER_API_KEY=your_openrouter_key
NODE_ENV=development
```

---

### 4. Run the Server

```
npm run dev
```

Server will start at:

```
http://localhost:5000
```

---

## API Routes

Base URL:

```
/api
```

Main endpoints:

```
/api/auth
/api/trips
/api/places
/api/activities
/api/expenses
/api/uploads
/api/recommendations
```

Health check:

```
GET /api/health
```

---

## AI Recommendation System

Planora uses an AI-assisted recommendation engine that:

* Builds prompts dynamically based on trip context
* Applies filters such as rating, price, and distance
* Scores and ranks places intelligently
* Balances results across categories

---

## Security Features

* Helmet security headers
* Rate limiting
* JWT authentication
* Input validation middleware
* Protected routes

---

## Deployment

### Backend

Hosted on Render.

### Frontend

Hosted via GitHub Pages.

---

## Future Improvements

* Collaborative trip planning
* Real-time itinerary updates
* Advanced AI personalization
* Offline trip support

---

## Author

Akshat Shaw
GitHub: https://github.com/akshat-shaw-509

---

## License

This project is for educational and portfolio purposes.
