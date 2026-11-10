# OpenCode Mobile App & Bridge

A cross-platform mobile application and local bridge server designed to execute and monitor commands for OpenCode from your mobile device.

## Architecture

- **`server/`**: Node.js & Express local bridge server with bearer token authentication and command execution safety limits.
- **`mobile/`**: Flutter cross-platform client (iOS & Android) with a chat interface for command submission and real-time output rendering.

## Getting Started

### 1. Run the Bridge Server
```bash
cd server
npm install
npm start
```

### 2. Run the Mobile App
Ensure Flutter is installed, then:
```bash
cd mobile
flutter pub get
flutter run
```

## Security
Requests to the bridge server require an `Authorization: Bearer <AUTH_TOKEN>` header (default token is configured in `server/index.js`).
