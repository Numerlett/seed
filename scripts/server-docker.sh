docker build -t seed-server:latest -f Dockerfile.server .
docker run -d --name seed-server -p 8080:8080 --env-file server/.env seed-server:latest