# 🖥️ DXENG · Frontend Platform

![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Blue?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel&logoColor=white)

> The administrative interface and documentation portal for the **DXENG Platform**.

This project serves as the presentation layer for our Developer Experience platform. It consumes the monorepo's APIs and agents to provide dashboards, AI-generated documentation visualization, and management tools for engineering teams.

---

##  Features

* **⚡ Next.js App Router:** Modern architecture using React Server Components.
* **🎨 Responsive UI:** Fast and consistent styling (via Tailwind/PostCSS).
* **🤖 AI Integration:** Chat interface and visualization for agents (RAG/Dxgen).
* **📊 Dashboards:** Visualization of engineering metrics and project status.

---

##  Getting Started

Follow the steps below to run the application locally.

### Prerequisites

* Node.js 20+
* Package manager (`npm`, `yarn`, `pnpm`, or `bun`)

### 1. Installation

Since this project is part of a monorepo, make sure to install dependencies at the root level:

```bash
# At the monorepo root
npm install
```
## 2. Environment Configuration
Copy the example file to configure your local variables (API keys, backend URLs, etc.)

```
Bash
cp .env.example .env.local
```
## 3. Running the Server
Start the development server:
```
Bash

npm run dev
# or
yarn dev
# or
pnpm dev
```
Open http://localhost:3000 with your browser to see the result.

## 📂 Project Structure
Below is a quick overview of the main folders within ```src/``` or ```app/:```

Folder /// Description

```app/```	Application routes (Pages, Layouts, API Routes).

```components/``` 	Reusable React components (Buttons, Cards, Inputs).

```lib/```	Utility functions, client configurations (e.g., Supabase, Axios).

```public/```	Static assets (Images, Fonts, Icons).


## ☁️ Deploy
The easiest way to deploy this app is through Vercel:

Check out the [ Next.js Deployment Documentation](https://nextjs.org/docs/app/getting-started/deploying) for more details.


