# ReWear - Community Clothing Exchange Platform

A sustainable fashion platform that enables users to exchange unused clothing through direct swaps or a point-based redemption system.

## 🚀 Features

- **User Authentication**: Secure email/password registration and login
- **Item Management**: Upload, browse, and manage clothing items
- **Swap System**: Direct item swaps or point-based exchanges
- **Real-time Notifications**: Socket.io powered live updates
- **Admin Panel**: Comprehensive admin dashboard for moderation
- **Search & Filters**: Advanced search with category and condition filters
- **Responsive Design**: Mobile-first responsive UI
- **Point System**: Earn and spend points for sustainable fashion choices

## 📁 Project Structure

\`\`\`
rewear-platform/
├── client/                 # Frontend (Next.js)
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utility functions
└── server/                # Backend (Node.js/Express)
    ├── models/            # MongoDB models
    ├── routes/            # API routes
    ├── middleware/        # Express middleware
    └── server.js          # Main server file
\`\`\`

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### 1. Clone the Repository

\`\`\`bash
git clone <your-repo-url>
cd rewear-platform
\`\`\`

### 2. Backend Setup

\`\`\`bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env
\`\`\`

**Configure your `.env` file:**

\`\`\`env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rewear
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
CLIENT_URL=http://localhost:3000

# Optional: Cloudinary for image uploads
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
\`\`\`

### 3. Frontend Setup

\`\`\`bash
# Navigate to client directory (from root)
cd client

# Install dependencies
npm install

# The .env.local file is already configured for local development
\`\`\`

### 4. Database Setup

Make sure MongoDB is running on your system:

\`\`\`bash
# For macOS with Homebrew
brew services start mongodb-community

# For Ubuntu/Debian
sudo systemctl start mongod

# For Windows, start MongoDB service from Services panel
\`\`\`

### 5. Running the Application

**Start the Backend Server:**

\`\`\`bash
# From the server directory
cd server
npm run dev
\`\`\`

The server will start on `http://localhost:5000`

**Start the Frontend Application:**

\`\`\`bash
# From the client directory (in a new terminal)
cd client
npm run dev
\`\`\`

The client will start on `http://localhost:3000`

## 🔧 Development Scripts

### Backend (server/)
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend (client/)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Browse Items**: Explore available clothing items
3. **List Items**: Upload your unused clothing with photos and details
4. **Make Swaps**: Request direct swaps or use points to redeem items
5. **Manage Profile**: Update your profile and track your swap history

## 🔐 Admin Features

- User management (activate/deactivate accounts)
- Item moderation (approve/reject listings)
- Swap monitoring and statistics
- Featured items management
- Comprehensive dashboard with analytics

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Items
- `GET /api/items` - Get all items (with filters)
- `POST /api/items` - Create new item
- `GET /api/items/:id` - Get single item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Swaps
- `GET /api/swaps` - Get user's swaps
- `POST /api/swaps` - Create swap request
- `PUT /api/swaps/:id/respond` - Accept/reject swap
- `PUT /api/swaps/:id/complete` - Mark swap as completed

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Manage users
- `GET /api/admin/items` - Review items
- `PUT /api/admin/items/:id/review` - Approve/reject items

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set environment variables in your hosting platform
2. Update `MONGODB_URI` to your production database
3. Update `CLIENT_URL` to your frontend domain
4. Deploy the server directory

### Frontend Deployment (Vercel/Netlify)

1. Update `NEXT_PUBLIC_API_URL` to your backend URL
2. Deploy the client directory
3. Configure build settings if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **CORS Errors**
   - Verify `CLIENT_URL` in server `.env`
   - Check frontend API URL configuration

3. **Socket.io Connection Issues**
   - Ensure both frontend and backend are running
   - Check firewall settings
   - Verify socket URL configuration

4. **Image Upload Issues**
   - Configure Cloudinary credentials
   - Check file size limits
   - Verify image format support

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page
- Review the documentation
- Contact the development team

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced recommendation system
- [ ] Integration with shipping providers
- [ ] Social features and user reviews
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
\`\`\`

## 🏃‍♂️ Quick Start Commands

Here's how to run the ReWear platform:

### Terminal 1 (Backend):
\`\`\`bash
cd server
npm install
npm run dev
\`\`\`

### Terminal 2 (Frontend):
\`\`\`bash
cd client
npm install
npm run dev
\`\`\`

### Access the Application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

The platform is now ready to use! You can register new users, list items, and start swapping clothes sustainably! 🌱👕
