# Spottify - Period Tracking PWA

A simple, clean period tracking Progressive Web App built with React, TypeScript, Vite, and Firebase.

## Features

- **Daily Input**: Record period flow, basal body temperature, cramps, and sore breasts
- **Historical View**: See all past measurements organized by date
- **Cycle Predictions**: Estimate next period, ovulation, and fertile window using weighted averages
- **Statistics**: View cycle averages, variations, and insights
- **PWA Support**: Install on iOS and Android devices, works offline
- **Firebase Authentication**: Secure user accounts and data storage

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase:
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Update `src/firebase.ts` with your config
4. Run development server: `npm run dev`

## Deployment

The app is configured for GitHub Pages deployment. Push to main branch to automatically deploy.

## Technologies

- React 19 + TypeScript
- Vite 7
- Firebase (Auth + Firestore)
- React Router
- PWA Manifest
