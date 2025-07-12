# ReWear Platform

ReWear is a sustainable fashion swapping platform designed to give clothes a second life and promote eco-friendly consumption habits. This monorepo contains both the Next.js frontend (`client`) and the Node.js/Express backend (`server`).

## Table of Contents

- [ReWear Platform](#rewear-platform)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Technologies Used](#technologies-used)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
      - [1. Clone the repository](#1-clone-the-repository)
      - [2. Backend Setup](#2-backend-setup)
      - [3. Frontend Setup](#3-frontend-setup)
      - [4. Database Configuration](#4-database-configuration)
  - [Running the Application](#running-the-application)
    - [Backend](#backend)
    - [Frontend](#frontend)
  - [Usage](#usage)
  - [Admin Features](#admin-features)
  - [API Endpoints](#api-endpoints)
  - [Deployment](#deployment)
  - [Troubleshooting](#troubleshooting)
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- User authentication (registration, login, logout)
- Item listing and management
- Swap request initiation and management
- Real-time notifications for swap updates
- User profiles
- Admin panel for managing users and items (future)
- Search and filter items (future)

## Technologies Used

**Frontend:**
- Next.js 14 (App Router)
- React
- Tailwind CSS
- Shadcn/ui
- Lucide React (icons)
- Socket.IO Client

**Backend:**
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT (JSON Web Tokens) for authentication
- Bcrypt for password hashing
- Socket.IO
- Cloudinary (for image storage - future)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)

### Installation

#### 1. Clone the repository

\`\`\`bash
git clone https://github.com/your-username/rewear-platform.git
cd rewear-platform
\`\`\`

#### 2. Backend Setup

Navigate into the `server` directory, install dependencies, and create your environment file.

\`\`\`bash
cd server
npm install
cp .env.example .env # Create a .env file from the example
\`\`\`

Edit the `.env` file with your MongoDB URI and JWT secret:

\`\`\`
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
\`\`\`

#### 3. Frontend Setup

Navigate into the `client` directory, install dependencies, and create your environment file.

\`\`\`bash
cd ../client
npm install
cp .env.local.example .env.local # Create a .env.local file from the example
\`\`\`

Edit the `.env.local` file with your backend API base URL:

\`\`\`
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
\`\`\`

#### 4. Database Configuration

Ensure your MongoDB instance is running and accessible via the `MONGO_URI` you provided in the `server/.env` file.

## Running the Application

You will need two separate terminal windows, one for the backend and one for the frontend.

### Backend

In the `server` directory:

\`\`\`bash
npm start
\`\`\`

The backend server will start on `http://localhost:5000` (or the `PORT` you specified).

### Frontend

In the `client` directory:

\`\`\`bash
npm run dev
\`\`\`

The Next.js development server will start on `http://localhost:3000`. Open your browser and navigate to `http://localhost:3000` to view the application.

## Usage

- **Register/Login:** Create an account or log in to access the platform's features.
- **List Items:** Upload details and images of clothes you want to swap.
- **Browse Items:** Explore items listed by other users.
- **Initiate Swaps:** Send swap requests for items you're interested in.
- **Manage Swaps:** Accept, decline, or track your ongoing swaps.

## Admin Features

(To be implemented)
- User management (view, edit, delete users)
- Item management (view, edit, delete items)
- Swap management (monitor and resolve swap issues)

## API Endpoints

**Authentication:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Items:**
- `GET /api/items` (get all items)
- `GET /api/items/:id` (get single item)
- `POST /api/items` (create new item)
- `PUT /api/items/:id` (update item)
- `DELETE /api/items/:id` (delete item)
- `GET /api/items/user/:userId` (get items by user)

**Swaps:**
- `GET /api/swaps` (get all swaps)
- `GET /api/swaps/:id` (get single swap)
- `POST /api/swaps` (create new swap request)
- `PUT /api/swaps/:id/accept` (accept swap)
- `PUT /api/swaps/:id/decline` (decline swap)
- `PUT /api/swaps/:id/complete` (mark swap as complete)

**Admin:**
- `GET /api/admin/users`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/items`
- `DELETE /api/admin/items/:id`

## Deployment

### Frontend (Next.js)

The Next.js application can be easily deployed to Vercel.
1. Link your GitHub repository to Vercel.
2. Ensure your `NEXT_PUBLIC_API_BASE_URL` environment variable is set correctly in Vercel for your production backend URL.

### Backend (Node.js/Express)

The Node.js/Express backend can be deployed to platforms like Render, Heroku, or a custom VPS.
1. Set up your environment variables (`MONGO_URI`, `JWT_SECRET`, `PORT`) on your chosen hosting platform.
2. Ensure your backend is accessible from your frontend deployment.

## Troubleshooting

- **"Couldn't find any `pages` or `app` directory"**: Ensure you are running `npm run dev` from within the `client` directory and that the `app` directory exists inside `client`.
- **Backend not starting**: Check your `server/.env` file for correct `MONGO_URI` and `JWT_SECRET`. Ensure MongoDB is running.
- **Frontend not connecting to backend**: Verify `NEXT_PUBLIC_API_BASE_URL` in `client/.env.local` points to the correct backend address (e.g., `http://localhost:5000/api`). Check browser console for network errors.

## Roadmap

- Implement image upload functionality using Cloudinary.
- Develop user dashboard for managing profile, items, and swaps.
- Create a comprehensive browse/catalog page with search and filtering.
- Implement real-time chat for swap negotiations.
- Add review and rating system for users.
- Enhance admin panel features.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.
