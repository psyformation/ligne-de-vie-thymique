# Ligne de Vie Thymique — Application de Suivi Thymic

## Overview

This is a thymic episode tracking web application that allows users to trace their mood fluctuations and episodes over time. The application features a clean, medical-inspired interface with French localization, designed for tracking thymic episodes, life events, mixed episodes, and medication/substance usage that trigger mood changes. Its main purpose is to provide a comprehensive tool for monitoring and visualizing mental health patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack TypeScript architecture with a clear separation between client and server, utilizing React for the frontend and Express for the backend.

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI/UX**: Radix UI components with shadcn/ui design system, Tailwind CSS for styling.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Charts**: Chart.js with date-fns adapter for mood, medication, and substance visualization. Intensity-based color coding is used for mood episodes.
- **Features**: Patient mode enhancements including 2-month default episode duration, hospitalization tracking, and PDF/Excel export/import capabilities.
- **Life Events**: A "Événements Significatifs de Vie" section at the bottom of the Épisodes section in the praticien mode. Users can log life events (date, title, category, description). Events appear on the MoodChart as vertical dashed grey lines with white-background dark-grey text labels at y=-4.6 (bottom of chart), distinct from episode trigger annotations.
- **Mixed Episode Feature**: Praticien mode only. Visualizes mixed episodes with two separate violet curves (upper at +excitationLevel, lower at -depressiveLevel) plus violet box annotation on the MoodChart. Patient mode uses a standard single-slider input without mixed episode support.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM (configured for Neon Database).
- **Session Management**: Session-based with connect-pg-simple.
- **API Style**: RESTful API endpoints.
- **Data Models**:
    - **Users**: Basic authentication.
    - **Mood Entries**: Core thymic episode tracking (start/end dates, mood level, episode type, trigger events, notes), including mixed excitation/depressive levels.
    - **Medications**: Tracking with dosage, frequency, type, dates, and active status.
    - **Medication Logs**: Adherence tracking with taken dates/times, dosage, side effects, effectiveness.
    - **Substances**: Tracking consumption periods and frequencies.
    - **Patient Hospitalizations**: Records of patient hospitalizations during specific periods.

### System Design Choices
- **Development Setup**: Vite for frontend bundling, esbuild for backend compilation, hot reload, and shared TypeScript schemas for type safety.
- **Data Flow**: User input -> client-side validation -> API communication via TanStack Query -> server-side validation and storage -> real-time UI updates -> Chart.js visualization.
- **Database Management**: Schema defined in `shared/schema.ts`, Drizzle-kit for migrations, PostgreSQL connection pooling.
- **Interactive Charts**: Implemented free zoom functionality with mouse wheel/touch, dynamic timeline synchronization for medication and substance bars, and zoom state persistence.
- **Data Portability**: Local storage persistence for standalone HTML version, JSON export/import system for backup.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection.
- **@radix-ui/***: UI component library.
- **@tanstack/react-query**: Server state management.
- **chart.js**: Data visualization library with zoom plugin.
- **drizzle-orm**: Type-safe database ORM.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **tailwindcss**: Utility-first CSS framework.
- **typescript**: Static type checking.
- **vite**: Build tool and dev server.