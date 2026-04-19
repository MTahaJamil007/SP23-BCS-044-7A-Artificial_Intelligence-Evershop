# EverShop 🛒

## 📌 Project Description
Multi-vendor eCommerce platform with AI chatbot integration.

## 🚀 Features
- User roles (Admin, Vendor, Customer)
- Product management
- Order system
- AI chatbot (Gemini API)
- Sentiment analysis (optional)

## ⚙️ Tech Stack
- Frontend: React
- Backend: Node.js (Express)
- Database: PostgreSQL
- AI: Gemini API

## 🧑‍💻 Setup Instructions

### 1. Clone repo
git clone <your-repo-url>

### 2. Install dependencies
cd server
npm install

cd ../client
npm install

### 3. Setup environment variables
Create `.env` in server:

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=evershop
GEMINI_API_KEY=your_key

### 4. Run project
# backend
cd server
npm start

# frontend
cd client
npm start

## 🗄️ Database
Run `schema.sql` in PostgreSQL.

## 📄 Documentation
See PROJECT_DOCUMENTATION.txt