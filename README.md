# Clever Collector / BackLog Academic Task Intelligence System

This is a full-stack academic task intelligence system with a React/Vite frontend, a Spring Boot backend, a WhatsApp bot, and a Google services integration server.

## Features
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Java Spring Boot, MySQL (REST API)
- **WhatsApp Bot**: Node.js, whatsapp-web.js for automated task extraction
- **Third-Party Server**: Node.js Express server handling Google Calendar & Gmail OAuth

## Prerequisites
- Node.js (v18 or higher recommended)
- Java 17 or higher
- Maven (to build and run the Spring Boot backend)
- MySQL Server (running locally on port 3306)

## Database Setup
1. Start your local MySQL server.
2. Ensure you have the following credentials, or update `backlog-backend/src/main/resources/application.properties`:
   - URL: `jdbc:mysql://localhost:3306/backlog_db?createDatabaseIfNotExist=true`
   - Username: `root`
   - Password: `Abi@6043062007` (Update this in application.properties if yours is different)

## Setup Instructions

### 1. Spring Boot Backend
1. Navigate to the backend folder:
   ```bash
   cd backlog-backend
   ```
2. Build and run the project using Maven:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```
   The backend will start on `http://localhost:8081`.

### 2. Google Integration Server (Calendar & Gmail)
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the node server:
   ```bash
   npm run start
   ```
   The server will start on `http://localhost:3001`.
   *(All `.env` configurations and API keys are already populated).*

### 3. WhatsApp Automaton Bot
1. Navigate to the bot folder:
   ```bash
   cd whatsapp-bot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the bot:
   ```bash
   npm run start
   ```
   The bot will start on `http://localhost:3004`. Open the terminal to scan the QR code with your WhatsApp app.

### 4. React Frontend Web Dashboard
1. Navigate to the root directory (`clever-collector-main`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:8080` (or the port Vite provides).

## Environment Setup
- All `.env` files and `application.properties` have been successfully populated and provided with active API keys, endpoints, and credentials for a seamless launch.
- Avoid committing these `.env` keys if you plan to make this repository public.

## Notes
- To make sure everything runs properly, start the services in this recommended order: MySQL Database -> Spring Boot Backend -> Google Node Server -> WhatsApp Bot -> React Frontend.
- This zip file preserves the exact folder structure and all configurations.
