# TaskFlow AI

TaskFlow AI is an AI-powered task management and daily planning application designed to help users organize tasks, plan their day, and improve productivity.

## Live Demo

[Open TaskFlow AI](http://taskflow-ai-prod.eba-pewkjpus.ap-south-1.elasticbeanstalk.com/#dashboard)

## Features

- **Task Management:** Create, view, update, and manage tasks.
- **AI Planner:** Generate personalized milestones using the Gemini API.
- **Daily Planner:** Organize unfinished tasks into a daily schedule with working hours, focus sessions, and breaks.
- **Persistent Storage:** Store tasks using MongoDB Atlas.
- **Responsive Dashboard:** Access the application through a web browser.

## Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **AI Integration:** Google Gemini API
- **Deployment:** AWS Elastic Beanstalk

## Architecture

1. The React frontend provides the dashboard and planning interfaces.
2. The Express backend exposes API endpoints for task management and AI planning.
3. MongoDB Atlas stores task data.
4. The Gemini API generates personalized planning suggestions through the backend.
5. AWS Elastic Beanstalk hosts the application.

## Run Locally

### Prerequisites

- Node.js and npm
- A MongoDB Atlas connection string
- A Google Gemini API key

### Setup

1. Clone this repository.
2. Install dependencies using the instructions in the project configuration.
3. Configure the required environment variables on the backend.
4. Start the backend and frontend using the project's npm scripts.

Never commit real API keys, database passwords, or `.env` files to GitHub.

## Project Purpose

This project demonstrates full-stack web development, REST API integration, database persistence, AI-powered planning, and cloud deployment.

## Author

Savitha R
