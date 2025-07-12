# ReWear Platform

This project is a full-stack application for a sustainable fashion platform, ReWear, where users can swap clothes.

## Project Structure

The project is divided into two main parts: `client` (Next.js frontend) and `server` (Node.js/Express backend).

\`\`\`
.
├── client/                 # Next.js frontend application
│   ├── app/                # Next.js App Router pages and layouts
│   │   ├── globals.css     # Global CSS styles
│   │   ├── layout.tsx      # Root layout for the application
│   │   ├── login/          # Login page
│   │   │   └── page.tsx
│   │   ├── page.tsx        # Home page (LandingPage component)
│   │   └── register/       # Registration page
│   │       └── page.tsx
│   ├── components/         # Reusable React components
│   │   ├── LandingPage.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/             # Shadcn UI components
│   ├── contexts/           # React Context API providers
│   │   ├── AuthContext.tsx
│   │   └── SocketContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                # Utility functions
│   │   └── utils.ts
│   ├── public/             # Static assets
│   ├── styles/             # Additional global styles (can be merged with app/globals.css)
│   ├── .env.local          # Local environment variables for client
│   ├── components.json     # Shadcn UI configuration
│   ├── next.config.mjs     # Next.js configuration
│   ├── package.json        # Frontend dependencies and scripts
│   ├── postcss.config.mjs  # PostCSS configuration
│   ├── tailwind.config.ts  # Tailwind CSS configuration
│   └── tsconfig.json       # TypeScript configuration
└── server/                 # Node.js/Express backend API
    ├── middleware/         # Express middleware
    │   └── auth.js         # Authentication middleware
    ├── models/             # Mongoose schemas
    │   ├── Item.js
    │   ├── Swap.js
    │   └── User.js
    ├── routes/             # API routes
    │   ├── admin.js
    │   ├── auth.js
    │   ├── items.js
    │   └── swaps.js
    ├── .env                # Environment variables for server
    ├── package.json        # Backend dependencies and scripts
    └── server.js           # Main Express server file
\`\`\`

## Setup and Running

Follow these steps to set up and run the ReWear platform locally.

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd rewear-platform
\`\`\`

### 2. Backend Setup (Server)

Navigate to the `server` directory:

\`\`\`bash
cd server
\`\`\`

Install backend dependencies:

\`\`\`bash
npm install
\`\`\`

Create a `.env` file in the `server` directory and add your environment variables. Replace the placeholder values with your actual credentials:

\`\`\`env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
\`\`\`

Start the backend server:

\`\`\`bash
npm start
\`\`\`

The backend server will run on `http://localhost:5000` (or the PORT you specified).

### 3. Frontend Setup (Client)

Open a new terminal and navigate to the `client` directory:

\`\`\`bash
cd ../client
\`\`\`

Install frontend dependencies:

\`\`\`bash
npm install
\`\`\`

Create a `.env.local` file in the `client` directory and add your environment variables. Replace the placeholder values with your actual credentials:

\`\`\`env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
\`\`\`

Start the Next.js development server:

\`\`\`bash
npm run dev
\`\`\`

The frontend application will run on `http://localhost:3000`.

### 4. Access the Application

Open your web browser and go to `http://localhost:3000` to access the ReWear platform.

## Technologies Used

### Frontend
*   **Next.js**: React framework for production.
*   **React**: JavaScript library for building user interfaces.
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
*   **Shadcn UI**: Reusable UI components built with Radix UI and Tailwind CSS.
*   **Socket.IO Client**: For real-time communication.

### Backend
*   **Node.js**: JavaScript runtime.
*   **Express.js**: Web application framework for Node.js.
*   **Mongoose**: MongoDB object data modeling (ODM) for Node.js.
*   **MongoDB**: NoSQL database.
*   **JWT (JSON Web Tokens)**: For authentication.
*   **Bcrypt.js**: For password hashing.
*   **Cloudinary**: For image storage and management.
*   **Socket.IO**: For real-time communication.

---
