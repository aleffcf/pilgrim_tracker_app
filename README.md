# 🥾 Aparecida Pilgrim Tracking — Mobile App

A mobile application built with **React Native and Expo** to support pilgrim groups traveling to **Aparecida, Brazil**.

The application connects to a dedicated REST API and provides a simple mobile experience for joining a pilgrim group, authenticating users, sharing location data, and viewing other members of the same group.

> **Portfolio Project** — This repository demonstrates mobile application development with React Native, Expo, secure token storage, API integration, GPS tracking, and background task handling.

---

## 📱 About the Project

The application was designed around a simple problem:

> **How can a group of pilgrims keep track of each other during a journey to Aparecida?**

The mobile application acts as the client for a backend API responsible for authentication, group management, and location data.

The main user flow is:

```text
┌──────────────────────┐
│   Open the App       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Enter Group Code     │
│ or Scan QR Code      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Authenticate User    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Receive JWT Token    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Start Tracking       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Share Location       │
│ and View Group       │
└──────────────────────┘
```

---

# 🎯 Main Features

* Join a pilgrim group using a short code
* QR Code-based group entry
* User authentication through the backend API
* Secure JWT storage on the device
* Automatic authorization for API requests
* GPS location tracking
* Background location task support
* Display of group members and their latest locations
* Group-based location isolation
* Loading and error states for network operations

---

# 🛠️ Technology Stack

| Technology        | Purpose                           |
| ----------------- | --------------------------------- |
| React Native      | Mobile application framework      |
| Expo              | React Native development platform |
| Expo Router       | File-based navigation             |
| TypeScript        | Static typing                     |
| Expo Secure Store | Secure JWT storage                |
| AsyncStorage      | Non-sensitive local persistence   |
| Fetch API         | HTTP communication                |
| Expo Location     | GPS/location capabilities         |

---

# 🏗️ Application Architecture

The mobile application acts as a client of the backend API.

```text
┌───────────────────────────────┐
│        React Native App       │
│                               │
│ ┌───────────┐ ┌─────────────┐ │
│ │   Screens │ │ Navigation  │ │
│ └─────┬─────┘ └─────────────┘ │
│       │                       │
│       ▼                       │
│ ┌───────────────────────────┐ │
│ │       API Client          │ │
│ │                           │ │
│ │  apiFetch()               │ │
│ │  JWT handling             │ │
│ │  Error handling           │ │
│ └─────────────┬─────────────┘ │
│               │               │
│ ┌─────────────▼─────────────┐ │
│ │      Location Task        │ │
│ │                           │ │
│ │ Background GPS tracking   │ │
│ └───────────────────────────┘ │
└───────────────┬───────────────┘
                │
                │ HTTPS / REST
                ▼
┌───────────────────────────────┐
│        FastAPI Backend        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          PostgreSQL           │
└───────────────────────────────┘
```

---

# 🔌 Backend Integration

The mobile application communicates with the backend through a centralized API wrapper.

The API client automatically:

1. Retrieves the stored JWT.
2. Adds the `Authorization` header.
3. Adds `Content-Type: application/json`.
4. Executes the request.
5. Converts API errors into JavaScript errors.

Example:

```typescript
const response = await apiFetch('/me');
```

Authenticated requests automatically become:

```http
Authorization: Bearer <access_token>
```

This keeps authentication logic out of individual screens and provides a single integration point for the backend.

---

# 🔐 Authentication Flow

The application uses the following authentication flow:

```text
User
 │
 │ Group Code
 ▼
/tenant/{join_code}/exists
 │
 │ Group exists
 ▼
Login Screen
 │
 │ Access Code
 ▼
/login
 │
 │ JWT
 ▼
SecureStore
 │
 ▼
Authenticated Requests
```

The group join code is stored using `AsyncStorage` because it is not considered a secret.

The JWT, on the other hand, is stored using **Expo SecureStore**.

---

# 🔒 Secure Token Storage

The application uses `expo-secure-store` for authentication tokens.

```typescript
await SecureStore.setItemAsync('access_token', token);
```

The API client retrieves the token whenever an authenticated request is made.

```typescript
const token = await getToken();
```

This avoids storing authentication credentials in regular application storage.

The application also provides a session cleanup function:

```typescript
await clearSession();
```

which removes the stored token.

---

# 👥 Joining a Group

The initial screen allows the pilgrim to enter their group code manually.

Example:

```text
RA2026
```

The code is normalized before being sent to the API:

```typescript
const codigoNormalizado =
  codigoDigitado.trim().toUpperCase();
```

The application then verifies the group:

```http
GET /tenant/{join_code}/exists
```

If the group exists, the join code is saved locally and the user proceeds to authentication.

This prevents users from continuing with an invalid group code.

---

# 📷 QR Code Flow

The application also provides a QR Code entry point:

```text
Enter Group Code
       │
       ├───────────────┐
       │               │
       ▼               ▼
Manual Entry       Scan QR Code
       │               │
       └───────┬───────┘
               ▼
         Validate Group
```

The intended QR Code flow allows the group organizer to provide a code through a printed badge or other physical identifier.

This makes the onboarding process more practical for large pilgrim groups.

---

# 📍 Location Tracking

Location tracking is one of the main features of the application.

The application sends GPS coordinates to the backend:

```http
POST /location
```

with:

```json
{
  "latitude": -22.8469,
  "longitude": -45.2297
}
```

The backend stores the latest known coordinates and timestamp for the authenticated user.

---

# 🌎 Background Location

The project includes a dedicated location task:

```text
app/locationTask
```

The task is imported early in the application's root layout:

```typescript
import "../app/locationTask";
```

This ensures that the background location task is registered when the application starts, rather than only when the map screen is opened.

The root navigation is handled through Expo Router:

```typescript
export default function RootLayout() {
  return <Stack />;
}
```

---

# 🗺️ Group Location Visualization

Authenticated users can retrieve the latest locations of other members of their group through:

```http
GET /pessoas
```

The backend restricts this information to users belonging to the same tenant.

The mobile application can use this data to display pilgrims on a map.

Conceptually:

```text
                 🧍 Pilgrim A
                     │
                     │
       🧍 Pilgrim B ─┼─ 🧍 Pilgrim C
                     │
                     │
                 📍 You
```

Each location includes:

* User ID
* Username
* Latitude
* Longitude
* Last-seen timestamp

---

# 📡 API Client

The application centralizes API communication in:

```text
app/api.ts
```

The API client exposes:

```typescript
saveToken()
getToken()
clearSession()
apiFetch()
```

This creates a small abstraction layer between the UI and the backend.

Instead of repeating authentication headers across screens:

```typescript
fetch(...)
```

the application can use:

```typescript
apiFetch(...)
```

and automatically receive the configured authentication behavior.

---

# 🧭 Navigation

Navigation is implemented using **Expo Router**.

The root layout is defined through:

```text
_layout.tsx
```

and uses a Stack navigator.

This allows the application to follow a file-based navigation architecture as additional screens are introduced.

A conceptual structure is:

```text
app/
│
├── _layout.tsx
├── index.tsx
├── login.tsx
├── scanner.tsx
├── mapa.tsx
└── locationTask.ts
```

> The structure above represents the intended organization of the application and can evolve as new features are added.

---

# 🧱 Suggested Project Structure

As the application grows, a scalable structure could be organized as:

```text
app/
│
├── _layout.tsx
├── index.tsx
├── login.tsx
├── scanner.tsx
├── mapa.tsx
│
├── api.ts
├── locationTask.ts
│
components/
├── Map/
├── UserCard/
├── Loading/
└── Buttons/
│
services/
├── auth.ts
├── location.ts
└── users.ts
│
hooks/
├── useAuth.ts
└── useLocation.ts
│
assets/
│
constants/
│
types/
│
package.json
├── app.json
└── README.md
```

This separation would make the project easier to maintain as the number of screens and API operations increases.

---

# 🚀 Getting Started

## Requirements

* Node.js
* npm or Yarn
* Expo CLI / Expo tooling
* Android Studio for Android development
* Xcode for iOS development on macOS
* A running instance of the backend API

---

# 📦 Installation

Clone the repository:

```bash
git clone <repository-url>
cd pilgrim_tracker_app
```

Install dependencies:

```bash
npm install
```

or:

```bash
yarn install
```

Start Expo:

```bash
npx expo start
```

---

# 🔗 API Configuration

The application currently defines the backend URL in:

```text
app/api.ts
```

Example:

```typescript
export const API_URL = 'HOST:PORT';
```

For production, this should be moved to an environment-based configuration.

For example:

```text
EXPO_PUBLIC_API_URL=https://api.example.com
```

This avoids hard-coding environment-specific addresses into the application.

> **Important:** The current local IP address is intended for development and should not be committed as the production API configuration.

---

# 🧪 Development Environment

When running the backend locally on a development machine, the mobile device must be able to reach that machine over the local network.

For example:

```text
Mobile Device
     │
     │ 
     ▼
FastAPI :8000
```

Using:

```text
localhost
```

from a physical mobile device will generally refer to the device itself rather than the developer's computer.

Therefore, a LAN IP address can be used during local development.

---

# 🔄 Application Lifecycle

A typical session looks like this:

```text
Launch
  │
  ▼
Check / Enter Group
  │
  ▼
Authenticate
  │
  ▼
Store JWT
  │
  ▼
Open Tracking Experience
  │
  ├───────────────┐
  ▼               ▼
Send Location   Fetch Group
Periodically    Locations
  │               │
  └───────┬───────┘
          ▼
       Map View
```

---

# ⚡ Performance Considerations

Location tracking can have a significant impact on battery and network usage.

The application should avoid sending GPS updates unnecessarily.

Possible strategies include:

* Time-based updates
* Distance-based updates
* Lower GPS accuracy when appropriate
* Reduced frequency when the user is stationary
* Batching updates when network conditions require it

The ideal configuration depends on the desired tracking precision and battery-life requirements.

---

# 🔐 Privacy Considerations

Location data is sensitive information.

The application should therefore consider:

* Explicit location permission
* Clear explanation of why location is required
* Secure communication using HTTPS
* Secure authentication token storage
* Group-level access control
* Data retention policies
* User consent
* Protection of historical location data

The backend currently exposes only the latest known location rather than a complete historical route.

---

# 🛡️ Production Checklist

Before releasing the application:

* [ ] Move API URL to environment configuration
* [ ] Use HTTPS in production
* [ ] Configure production API endpoint
* [ ] Verify Android location permissions
* [ ] Verify iOS location permissions
* [ ] Configure background location correctly
* [ ] Test tracking with the screen locked
* [ ] Test tracking when the application is backgrounded
* [ ] Test poor network conditions
* [ ] Test GPS unavailable scenarios
* [ ] Test expired JWT sessions
* [ ] Test logout/session cleanup
* [ ] Review location privacy requirements
* [ ] Create production builds with EAS
* [ ] Test on physical devices

---

# 🔮 Future Improvements

Possible improvements for future versions include:

### 🗺️ Enhanced Map Experience

* Custom pilgrim markers
* Distance between pilgrims
* Group center
* Route visualization
* Automatic map centering
* Offline map support

### 📍 Advanced Tracking

* Location history
* Route replay
* Distance traveled
* Estimated arrival time
* Geofencing
* Emergency location sharing

### 👥 Group Features

* Participant list
* Participant status
* Last-seen indicators
* Group announcements
* Emergency contact functionality

### 🔔 Notifications

* Group member separated from group
* Emergency alerts
* Important organizer messages
* Tracking stopped notifications

### 🔐 Authentication

* Refresh tokens
* Session management
* Device management
* Better logout/revocation handling

---

# 🔗 Related Backend

This mobile application is designed to consume the **Aparecida Pilgrim Tracking API**, a FastAPI backend responsible for:

* User management
* Group management
* Authentication
* JWT authorization
* Location storage
* Group member location retrieval
* Administrative operations

Backend repository:

```text
<backend-repository-url>
```

---

# 💡 Technical Highlights

This project demonstrates practical mobile development concepts including:

* React Native
* Expo
* Expo Router
* TypeScript
* REST API integration
* JWT authentication
* Secure credential storage
* Local application storage
* GPS/location services
* Background task registration
* Mobile networking
* Error handling
* Multi-tenant backend integration
* Mobile/backend architecture

---

# 📸 Screenshots

Add screenshots of the main application screens here.

Recommended portfolio screenshots:

```text
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│             │  │             │  │             │
│   Welcome   │  │    Login    │  │     Map     │
│             │  │             │  │             │
│             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

For a portfolio repository, screenshots are especially valuable because they allow recruiters and clients to understand the product without running the project locally.

---

# 👨‍💻 Portfolio Context

This project was developed as the mobile component of a complete pilgrim tracking system.

The architecture separates responsibilities between two applications:

```text
┌──────────────────────┐
│    Mobile Client     │
│                      │
│ React Native + Expo  │
└──────────┬───────────┘
           │
           │ REST API
           ▼
┌──────────────────────┐
│       Backend        │
│                      │
│ FastAPI + PostgreSQL │
└──────────────────────┘
```

This separation allows the mobile application and backend to evolve independently while maintaining a clearly defined API contract.

The project demonstrates the integration of a mobile client with a secure asynchronous backend, including authentication, group-based authorization, and location tracking.

---

# 📄 License

This project is **proprietary software**.

The source code is publicly available for portfolio, study and evaluation.

Viewing the source code does not grant permission to copy, modify, distribute, sublicense, or use the software commercially without prior written permission from the copyright holder.

**All rights reserved.**

---

# 📬 Contact

For professional inquiries, collaboration, or additional project information, please contact the author through the contact information available on the GitHub profile.
