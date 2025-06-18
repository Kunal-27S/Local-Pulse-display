# Local Pulse

Local Pulse is a React-based web application that enables users to share hyperlocal, real-time, visual posts about anything happening around them. Content is ephemeral and targeted at nearby users, fostering real-world discovery and local awareness.

## Features

- User authentication (Sign In/Sign Up)
- Create and share local posts with images
- Real-time feed of nearby posts
- Interactive map view
- Tag-based content filtering
- Local chat functionality
- User profiles and settings
- Dark/Light theme support

## Tech Stack

- React
- Material-UI
- React Router
- Leaflet (for maps)
- Axios (for API calls)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/local-pulse.git
cd local-pulse
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
local-pulse/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── Home.jsx
│   │   ├── CreatePost.jsx
│   │   ├── MapView.jsx
│   │   ├── Explore.jsx
│   │   ├── Profile.jsx
│   │   ├── Settings.jsx
│   │   └── Chat.jsx
│   ├── components/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
└── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material-UI for the component library
- Leaflet for the mapping functionality
- React Router for navigation
