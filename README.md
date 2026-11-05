# GATEI Portfolio Hub

You are a senior full-stack software engineer and system architect.

Your task is to build a COMPLETE, PRODUCTION-READY personal portfolio platform for a multimedia creative professional named GATEI.

⚠️ IMPORTANT:

- This must be a FULLY FUNCTIONAL system (frontend + backend + database).

- NOT a static template.

- NOT a UI mockup.

- NOT a preview-only web page.

- The system must be usable immediately after setup.

---

🧠 PROJECT OVERVIEW

Build a modern, high-performance, scalable personal website platform for:

GATEI — Multimedia Creative Professional

This platform should function as:

- Personal brand website

- Portfolio showcase system

- Client booking system

- Content management system (CMS)

- Media hosting interface (no compression)

---

🎯 CORE REQUIREMENTS

1. FRONTEND (USER-FACING WEBSITE)

Build a clean, cinematic, modern UI with smooth animations.

Sections:

1. HERO SECTION

- Name: GATEI

- Tagline: Replace "Multi-skilled multimedia person" with something more premium:

  → "Multimedia Creative Director & Production Specialist"

- Background: subtle motion or video

2. ABOUT SECTION

- Short professional bio

- Profile image section

3. SERVICES SECTION (well-structured categories)

Pre-Production

- Concept development & creative direction

- Scriptwriting & content structuring

- Casting

- Crew & equipment sourcing

Production

Audio

- Recording (studio & on-location)

- Editing, processing, enhancement

- Mixing & mastering

- Live sound engineering

- Equipment consulting

- Sound design & storytelling

Video

- Videography & cinematography

- Camera operation

- Editing & post-production

- Equipment setup

Additional

- Directing

- Graphic Design

4. PORTFOLIO SECTION (CRITICAL FEATURE)

This must NOT be static.

Build a dynamic media system that supports:

- Drag-and-drop uploads

- File types:

  - Images (ALL formats, any resolution)

  - Videos (MP4, MOV, etc.)

  - Audio (MP3, WAV, etc.)

- NO compression at upload

- Preserve original quality

- Support:

  - Portrait

  - Landscape

  - Mixed aspect ratios

Display:

- Grid layout

- Click to expand (lightbox or fullscreen)

- Categorization (Audio / Video / Graphics / Photography)

5. AUDIO SHOWCASE SECTION

- Dedicated player UI

- Play uploaded audio tracks

- Clean waveform-style UI (if possible)

6. SOCIAL MEDIA SECTION

Icons for:

- Instagram

- TikTok

- YouTube

- Portfolio link

When clicked:

→ Must redirect to actual links stored in database/admin panel

7. BOOKING SYSTEM

"BOOK ME" button opens form:

Fields:

- Full Name

- Email

- Phone Number

- Service Needed (dropdown)

- Project Description (textarea)

- Preferred Date

On submission:

- Save to database

- Send confirmation message:

  "Thank you for booking. We will get back to you within 24 hours."

---

2. BACKEND (MANDATORY)

Build a working backend with API endpoints.

Required Features:

- Authentication system (admin login)

- Media upload handling (NO compression)

- Booking form handling

- Social links management

- Portfolio management

API endpoints:

- POST /upload

- GET /portfolio

- POST /booking

- GET /bookings (admin)

- POST /social-links

- GET /social-links

---

3. DATABASE

Use a real database (NOT mock data)

Recommended:

- PostgreSQL OR MongoDB

Tables/Collections:

1. Users (admin)

2. Portfolio Items

   

   - id

   - file_url

   - type (image/video/audio)

   - category

   - created_at

3. Bookings

   

   - id

   - name

   - email

   - phone

   - service

   - description

   - date

4. Social Links

   

   - platform

   - url

---

4. ADMIN DASHBOARD (VERY IMPORTANT)

Build a protected admin panel where GATEI can:

- Upload media (drag & drop)

- Delete media

- View bookings

- Manage social links

- Update profile content

---

5. TECH STACK (STRICT)

Use modern scalable stack:

Frontend:

- Next.js (React)

- Tailwind CSS

Backend:

- Node.js + Express OR Next.js API routes

Database:

- MongoDB (preferred for flexibility)

Media Storage:

- Cloudinary OR AWS S3 (NO compression enforced)

---

6. PERFORMANCE & UX

- Fully responsive (mobile, tablet, desktop)

- Fast loading (lazy loading for media)

- Smooth animations (Framer Motion optional)

- Dark theme preferred (cinematic feel)

---

7. DELIVERABLES

Provide:

1. Full folder structure

2. All source code (frontend + backend)

3. Database schema

4. Setup instructions

5. Deployment guide (Vercel / Netlify + backend hosting)

6. Environment variables setup

7. How to run locally

---

8. BONUS (IF POSSIBLE)

- Email notification on booking

- WhatsApp integration (optional)

- Analytics tracking

- SEO optimization

---

🚫 WHAT NOT TO DO

- Do NOT create a static HTML template

- Do NOT create only frontend UI

- Do NOT skip backend

- Do NOT fake uploads (must actually store files)

- Do NOT compress uploaded media

---

✅ FINAL GOAL

This should be a real working production system that GATEI can:

- Upload content into

- Receive bookings from

- Share publicly

- Manage without coding

---

Build this step-by-step and provide complete working code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gateiportfolio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0fff30e1-3d51-4cf6-930f-ed975547445d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
