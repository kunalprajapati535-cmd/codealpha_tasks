# Mini Social Media Platform

A complete mini social media application for **Task 2: Social Media Platform**.

## Features

- User registration and login
- User profiles
- Edit profile bio/name
- Create posts
- Delete your own posts
- Like/unlike posts
- Add comments
- Follow/unfollow users
- Followers/following counts
- Home feed
- Explore users
- Search users and posts
- Responsive UI
- SQLite database

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- Express Session
- bcryptjs

### Database
- SQLite through better-sqlite3

## Project Structure

```text
social_media_platform/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## Run Locally

1. Install Node.js 18+.
2. Open a terminal inside this project.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

The SQLite database (`social.db`) is created automatically on first run.

## Demo Accounts

The app automatically creates two demo users:

- `demo` / `demo123`
- `alex` / `alex123`

You can also create a new account from the registration form.

## Notes

This is a college/project-ready mini application. For production deployment, add HTTPS, CSRF protection, rate limiting, stronger session storage, input sanitization, and a production database.
