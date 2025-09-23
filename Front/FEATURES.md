# Features and Manual Test Guide (client)

This file lists the major frontend features implemented in the client and gives concise manual test instructions for each. Run these tests against a running backend (default: http://localhost:4100) and the Next dev server on http://localhost:3100 (or port you start it on).

General setup

- Start backend (if present) so API endpoints respond on port 4100.
- In `client/` run:
  - `npm install` (first time)
  - `npm run dev` (starts Next on port 3100)
- Open: http://localhost:3100

Important note: Some features require backend or WebSocket server availability. If you see a "Backend API not available" banner, start the backend first.

Features and how to test

1) Authentication flows (pages under `(auth)`)
- Files: `src/app/(auth)/login`, `register`, `forgot-password`, `reset-password`
- How to test:
  - Visit `/auth/register` and submit a new user (fill required fields). Expected: successful registration message or redirect to login.
  - Visit `/auth/login` and log in with valid credentials. Expected: redirect to dashboard and user session active.
  - Try invalid credentials: expect validation or error toast.
  - Forgot/reset flows: submit email, follow reset token link flow (backend required).

2) Dashboard and Topbar/Sidebar
- Files: `src/components/Topbar.tsx`, `Sidebar.tsx`, `src/app/(dashboard)/...`
- How to test:
  - Log in and confirm Sidebar items are visible and usable.
  - Use Topbar search, notifications, and user menu. Expected: hover/focus accessibility, keyboard navigation.

3) Analytics (Advanced / BI / Predictive / Visualization)
- Files: `src/components/analytics/*` and `src/app/(dashboard)/analytics` pages
- How to test:
  - Open Analytics pages from dashboard.
  - Interact with DataVisualizationStudio controls (color pickers, ranges, checkboxes). Expected: UI updates, aria labels present, tooltips show text.
  - Run sample filters, export/report features if present.

4) Collaboration editors
- Files: `CollaborativeRichTextEditor.tsx`, `CollaborativeTaskEditor.tsx`, `CollaborativeWhiteboard.tsx`, `LiveCursors.tsx`, `Huddle.tsx`
- How to test:
  - Open a document or note page that uses the editor.
  - In one browser, edit content; in another browser or incognito, open same doc and verify real-time updates and presence cursors. (Requires y-websocket/yjs backend or mock socket.)
  - Test rich text formatting (bold, lists, headings) and presence indicators.

5) Kanban / Board and Tasks
- Files: `components/kanban/*`, `src/app/(dashboard)/tasks` pages
- How to test:
  - Create a new task, move task between columns, edit task details.
  - Verify drag and drop works with keyboard (if implemented) and that state persists via API.

6) Projects and Project pages
- Files: `src/app/(dashboard)/projects`, `src/components/project-management/*`
- How to test:
  - Create a new project from UI.
  - Add members or tags, create milestones, allocate resources.
  - Open project detail (`/projects/[id]`) and confirm pages load and display data.

7) File upload and management
- Files: `src/components/files/FileUpload.tsx`
- How to test:
  - Use File Upload to attach a file; verify upload progress and successful storage.
  - Try invalid file types and verify validation.

8) Comments, Tags, Reactions
- Files: `components/comments/CommentList.tsx`, `components/tags/TagList.tsx`, `Reactions.tsx`
- How to test:
  - Add/remove comments on an item; expect the list to update and backend call.
  - Add tags to entities and verify filtering by tag.
  - React to comments (emoji), verify UI reflects counts.

9) Notifications & Presence
- Files: `components/notifications/NotificationList.tsx`, `PresenceBar.tsx`, `SocketProvider.tsx`
- How to test:
  - Trigger an action that creates a notification (assign task, mention user).
  - Confirm notification appears in list and toast appears.
  - PresenceBar should show online users; test by opening multiple browsers.

10) Real-time Socket features
- Files: `src/socket.ts`, `SocketProvider.tsx`, `useSocket` hook
- How to test:
  - Confirm socket connects on app load (server console and client socket logs).
  - Trigger a socket event (new message/comment) and verify clients receive it.

11) BackendError and graceful offline handling
- Files: `components/BackendError.tsx`, health checks in app
- How to test:
  - Stop backend (or mock endpoint failure). Reload frontend. Expected: banner showing backend is unavailable and selective features disabled.
  - Restart backend: banner disappears and features resume.

12) Accessibility fixes
- Files: various analytics and components updated with aria-labels/ids
- How to test:
  - Run keyboard-only navigation across forms and dialogs.
  - Use aXe or Lighthouse accessibility audit against http://localhost:3100 to see pass/fail for labeled controls.

13) Toasts and transient UI
- Files: `toast.tsx`, `react-hot-toast` usage
- How to test:
  - Trigger success/error actions (login failure, save success) and confirm toast messages appear and are accessible (focusable/dismissable).

14) Sidebar / Workspace/Invite/Members flows
- Files: `src/app/(dashboard)/workspace`, `invite`, `members`
- How to test:
  - Invite a user to workspace and verify invite sends and membership list updates.
  - Remove a member and check permissions update.

15) Misc developer UX fixes
- Items: Babel/Turbopack handling, dev script `npm run dev` (port 3100)
- How to test:
  - Run `npm run dev` and confirm Next starts without the multiple Babel config error.

Quick smoke tests

- Start backend and frontend, open http://localhost:3100:
  - Login/register flows work.
  - Create a project and a task, attach a file, add a comment, add a tag.
  - Open analytics and interact with controls.
  - Open a second browser to verify real-time collaboration updates.

Notes & next steps

- If any feature depends on the backend, ensure the backend is started (default 4100). The frontend shows a banner when backend health checks fail.
- For automated testing, we can add a small Cypress test suite or Playwright scripts to automate these manual steps — I can scaffold that next if you like.

If you'd like, I can extend this file with direct route URLs, expected API calls, and sample test accounts. Reply which additions you want and I’ll update `FEATURES.md`.
