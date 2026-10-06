# Daywell

A small, responsive daily task planner with a focus timer. Built with React, TypeScript, Vite, Tailwind CSS, and Lucide icons. Tasks are saved in the browser with `localStorage`, so no account, API key, or backend is needed.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. In this project folder, run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to create the production site in `dist/`.

The main app and task logic live in `src/App.tsx`; styling is in `src/index.css`. On first visit, Daywell shows four example tasks. You can add, edit, complete, delete, and undo deletion of tasks. The focus timer offers 25-minute focus and 5-minute break modes.

## A realistic two-hour build plan

| Time | Milestone |
| --- | --- |
| 0-20 min | Set up Vite, React, styles, and the responsive shell. |
| 20-65 min | Build the task list, form, filters, and `localStorage` persistence. |
| 65-90 min | Add the focus/break timer and progress indicator. |
| 90-110 min | Polish mobile styles, empty states, and keyboard accessibility. |
| 110-120 min | Build, test the interactions, and deploy. |

## Deploy to Vercel

1. Push this project to a GitHub repository. If this is a new repository, create one on GitHub, then run the commands below from the project folder (replace the URL):

   ```bash
   git init
   git add .
   git commit -m "Build Daywell"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/daywell.git
   git push -u origin main
   ```

2. Sign in at [vercel.com](https://vercel.com), select **Add New > Project**, and import the GitHub repository.
3. Use the **Vite** framework preset. If Vercel asks for build settings, set **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. Click **Deploy**. Vercel will give you a live `vercel.app` URL. Later pushes to the repository trigger new deployments.

No environment variables or SPA rewrite rules are needed because this app has one URL and no server routes. Browser storage is local to each browser/device; it does not sync tasks between devices.

Vercel's current Vite deployment guidance: https://vercel.com/docs/frameworks/frontend/vite