# Panoramai

This is the code for the panoramai web app (archived, details [here](https://www.maximevidal.com/writing/worldmaking-experiment.html)).

![panoramai](frontend/app/opengraph-image.jpg)

## Frontend

To run the development server:

```bash
npm install
npm run dev
```

You'll need to fill in `NEXT_PUBLIC_GOOGLE_API_KEY`and `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local`.

## Backend

To build the worker and server images:

```bash
sudo docker build -t WORKER_IMAGE_NAME:TAG -f docker/Dockerfile.worker .
sudo docker build -t SERVER_IMAGE_NAME:TAG -f docker/Dockerfile.server .
```

To run the backend, fill in `APP_WORKER_IMAGE`, `APP_SERVER_IMAGE`, `GOOGLE_KEY` and `DOMAIN_NAME` in `docker/.env`.

Then, run in the `docker` folder:

```bash
sudo docker compose up
```
