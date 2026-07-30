# Multi-Agent Data Analyst - Frontend

This directory contains the user interface for the Multi-Agent Data Analyst application. It is built using React, Vite, and Tailwind CSS to provide a responsive and modern data analysis dashboard.

## Overview

The frontend serves as the primary interaction layer for users to upload CSV datasets, submit natural language queries, and visualize the generated data insights. It communicates directly with the FastAPI backend to relay queries to the LangGraph orchestration pipeline.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

### Prerequisites

Ensure you have Node.js and npm (or your preferred package manager) installed on your system.

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the project dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

To start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be accessible at `http://localhost:5173`. Ensure the FastAPI backend is also running concurrently so the frontend can route API requests successfully.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

The compiled assets will be output to the `dist` directory, ready to be served by any static file hosting service.

## Linting

The project utilizes Oxlint for fast and reliable linting.

```bash
npm run lint
```
