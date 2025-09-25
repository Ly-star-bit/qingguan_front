# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Next.js 14 application with TypeScript that serves as a customs information management web platform. The application includes features for processing Excel files, managing product data, handling shipping information, and generating customs documentation.

## Key Technologies
- Next.js 14 with App Router
- TypeScript
- Ant Design (antd) for UI components
- Redux Toolkit for state management
- Axios for HTTP requests
- ExcelJS and xlsx for Excel processing
- JWT for authentication
- Tailwind CSS for styling

## Common Development Commands
- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## Project Structure
- `src/app/` - Main application pages and API routes
- `src/components/` - Reusable React components
- `src/store/` - Redux store and slices
- `src/utils/` - Utility functions
- `public/` - Static assets
- `styles/` - Global CSS styles

## Key Features
1. Excel file processing with automated calculations
2. User authentication with JWT tokens
3. Role-based access control with menu permissions
4. Tab-based navigation with dynamic component loading
5. IP whitelisting middleware for security
6. Product data management for different shipping routes
7. PDF generation and document management

## Authentication
The application uses JWT tokens stored in localStorage for authentication. The middleware checks IP addresses against a whitelist. User permissions are managed through role-based access control.

## Excel Processing
The application includes an API route (`/api/process-excel`) that handles Excel file uploads, processes data using sheet formulas, and generates output files with calculated values.

## Important Notes
- The application uses dynamic imports for code splitting
- Menu items and permissions are fetched from a backend API
- Components are organized by business domain (VBA, business operations, user management)