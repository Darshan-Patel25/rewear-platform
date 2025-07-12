# ReWear: Sustainable Fashion Swapping Platform

ReWear is a full-stack web application designed to facilitate sustainable fashion by allowing users to swap clothes with each other. This platform aims to reduce textile waste and promote a circular economy in the fashion industry.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation and Setup](#installation-and-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Development Scripts](#development-scripts)
- [Usage](#usage)
- [Admin Features](#admin-features)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Authentication**: Secure registration and login for users.
- **Item Listing**: Users can list clothes they want to swap with details like category, size, condition, and photos.
- **Item Browsing**: Browse available items with search and filter options.
- **Swap Requests**: Users can send and receive swap requests for items.
- **Swap Management**: Accept, decline, and manage ongoing swaps.
- **User Profiles**: View and manage personal profiles, listed items, and swap history.
- **Real-time Notifications**: Get notified about new swap requests and status updates.
- **Admin Panel**: (Future) Manage users, items, and disputes.

## Technologies Used

**Frontend (Client)**:
- Next.js (React Framework)
- Tailwind CSS
- Shadcn/ui
- Lucide React (Icons)
- Socket.IO Client (for real-time features)

**Backend (Server)**:
- Node.js
- Express.js
- MongoDB (Database)
- Mongoose (ODM)
- JSON Web Tokens (JWT) for authentication
- Bcrypt.js for password hashing
- Socket.IO (for real-time features)

## Installation and Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher recommended)
- npm or Yarn
- MongoDB (local or cloud-based like MongoDB Atlas)

### Backend Setup

1.  **Clone the repository:**
    \`\`\`bash
    git clone <repository-url>
    cd rewear-platform
    \`\`\`

2.  **Navigate to the `server` directory:**
    \`\`\`bash
    cd server
    \`\`\`

3.  **Install backend dependencies:**
    \`\`\`bash
    npm install
    # or
    yarn install
    \`\`\`

4.  **Create a `.env` file** in the `server` directory and add your environment variables:
    \`\`\`dotenv
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    \`\`\`
    - Replace `your_mongodb_connection_string` with your MongoDB URI (e.g., `mongodb://localhost:27017/rewear` or your MongoDB Atlas connection string).
    - Replace `your_jwt_secret_key` with a strong, random string for JWT signing.

5.  **Start the backend server:**
    \`\`\`bash
    npm start
    # or
    yarn start
    \`\`\`
    The server will run on `http://localhost:5000` (or the port you specified).

### Frontend Setup

1.  **Navigate to the `client` directory** in a new terminal window:
    \`\`\`bash
    cd client
    \`\`\`

2.  **Install frontend dependencies:**
    \`\`\`bash
    npm install
    # or
    yarn install
    \`\`\`

3.  **Create a `.env.local` file** in the `client` directory and add your environment variables:
    \`\`\`dotenv
    NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
    NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
    \`\`\`
    - Ensure `NEXT_PUBLIC_API_BASE_URL` points to your backend API.
    - Ensure `NEXT_PUBLIC_SOCKET_URL` points to your backend Socket.IO server.

4.  **Start the frontend development server:**
    \`\`\`bash
    npm run dev
    # or
    yarn dev
    \`\`\`
    The Next.js application will run on `http://localhost:3000` (or the next available port).

## Development Scripts

**Backend (server directory):**
- `npm start`: Starts the Node.js server.
- `npm run dev`: Starts the Node.js server with `nodemon` for automatic restarts on file changes (if `nodemon` is installed globally or as a dev dependency).

**Frontend (client directory):**
- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the Next.js application for production.
- `npm run start`: Starts the Next.js production server (after building).
- `npm run lint`: Runs ESLint to check for code quality issues.

## Usage

1.  **Register**: Create a new account on the platform.
2.  **Login**: Access your account.
3.  **List an Item**: Go to your dashboard or a dedicated "List Item" page to add clothes you want to swap. Provide details and upload images.
4.  **Browse Items**: Explore items listed by other users. Use filters and search to find specific clothing.
5.  **Send Swap Request**: If you find an item you like, send a swap request to its owner. You might offer one of your items in return.
6.  **Manage Swaps**: Check your "My Swaps" or "Notifications" section to see incoming requests, accept or decline them, and track the status of your ongoing swaps.
7.  **Arrange Exchange**: Once a swap is accepted, communicate with the other user to arrange the physical exchange of items.

## Admin Features

(To be implemented in future iterations)
- User management (view, edit, delete users)
- Item moderation (approve, reject, remove items)
- Dispute resolution

## API Endpoints

**Authentication (`/api/auth`)**
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Log in a user.
- `GET /api/auth/me`: Get current user's profile (protected).

**Items (`/api/items`)**
- `POST /api/items`: Create a new item (protected).
- `GET /api/items`: Get all items (can be filtered/paginated).
- `GET /api/items/:id`: Get a single item by ID.
- `PUT /api/items/:id`: Update an item by ID (protected, owner only).
- `DELETE /api/items/:id`: Delete an item by ID (protected, owner only).
- `GET /api/items/user/:userId`: Get items by a specific user.

**Swaps (`/api/swaps`)**
- `POST /api/swaps`: Create a new swap request (protected).
- `GET /api/swaps/user/:userId`: Get all swaps involving a user (protected).
- `GET /api/swaps/:id`: Get a single swap by ID.
- `PUT /api/swaps/:id/accept`: Accept a swap request (protected).
- `PUT /api/swaps/:id/decline`: Decline a swap request (protected).
- `PUT /api/swaps/:id/complete`: Mark a swap as completed (protected).

## Deployment

### Vercel (Frontend)

1.  **Build the Next.js application:**
    \`\`\`bash
    cd client
    npm run build
    \`\`\`
2.  **Deploy to Vercel:**
    - Connect your GitHub repository to Vercel.
    - Configure the root directory for the project to `client/`.
    - Add `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` environment variables in Vercel settings, pointing to your deployed backend URL.

### Render/Heroku/AWS (Backend)

1.  **Push your `server` directory to a separate repository** or configure your deployment service to deploy only the `server` directory.
2.  **Configure environment variables** (`PORT`, `MONGO_URI`, `JWT_SECRET`) in your chosen hosting provider.
3.  **Deploy the Node.js application.**

## Troubleshooting

- **"Port 3000 already in use"**: If you see this, another process is using port 3000. You can either kill the process or Next.js will automatically try the next available port (e.g., 3001).
- **Backend not connecting to MongoDB**: Double-check your `MONGO_URI` in the `server/.env` file. Ensure your MongoDB instance is running and accessible.
- **Frontend not connecting to Backend**: Verify `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` in `client/.env.local` match your backend server's address and port.
- **"Element type is invalid" or "X is not exported from lucide-react"**: Ensure all `lucide-react` icons are correctly imported and that your `package.json` has `lucide-react` installed. If issues persist, try deleting `node_modules` and `package-lock.json` (or `yarn.lock`) in both `client` and `server` directories and reinstalling dependencies.

## Roadmap

- Implement user dashboards with item management and swap history.
- Add a robust search and filtering system for items.
- Develop a real-time chat feature for swappers.
- Introduce a rating and review system for users.
- Build an admin panel for content and user moderation.
- Integrate image upload services (e.g., Cloudinary).
- Implement push notifications.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.
\`\`\`
