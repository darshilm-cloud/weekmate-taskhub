# PMS Server Project

## Description

This Node.js server application is designed for handling web server functionality, API routing, and database operations. It's configured to run differently in development and production environments.

## System Requirements

- Node.js version: 20.5.1

## Installation

Before installing, ensure you have Node.js version 20.5.1 installed on your system.

To install the project dependencies, navigate to the project's root directory and run:

```bash
npm install

```

## Environment Setup
Create an env folder in the server directory and include the following files:

 - .env.dev for development environment settings.
 - .env.prod for production environment settings.
Refer to the .env.sample in the env folder for the structure and required variables. Set the environment variables in .env.dev and .env.prod files as per your configuration needs.

## Run Server

 - Development:
 ```bash
 npm start
 ```

 - Production:
 ```bash
 npm start:prod
 ```

