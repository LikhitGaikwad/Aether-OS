# 🚀 Aether OS – Multi-Agent AI Assistant

<p align="center">

![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

## 🌟 Overview

Aether OS is a **Dockerized Multi-Agent AI Assistant** that intelligently routes user queries to specialized tools and services through an agent orchestration framework.

The system integrates multiple AI-powered capabilities such as mathematical computation, information retrieval, visualization, and conversational reasoning while maintaining persistent conversation history.

The application follows a **full-stack architecture** with:

- ⚡ FastAPI Backend
- 🎨 React Frontend
- 🤖 Multi-Agent AI Workflow
- 🧠 LangGraph-based Orchestration
- 🗄 SQLite Chat Persistence
- 🐳 Dockerized Deployment
- ☁ AWS EC2 Hosting

---

# 🎯 Features

✅ Multi-Agent Query Routing

✅ AI Chat Interface

✅ Persistent Chat History

✅ Tool Calling

✅ Mathematical Computation

✅ Modular Agent Architecture

✅ REST API Backend

✅ Responsive React Frontend

✅ Dockerized Deployment

✅ Cloud Deployment on AWS EC2

---

# 🏗 System Architecture

```
                    User
                      │
                      ▼
              React Frontend
             (Port 3000)
                      │
          REST API Requests
                      │
                      ▼
              FastAPI Backend
              (Port 8000)
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
     LangGraph    AI Agents     Tool Calls
          │
          ▼
     SQLite Database
          │
          ▼
 Persistent Chat Memory
```

## 🖥️ Application

<p align="center">
  <img src="aether-os/Deployment/app-home.png" width="900">
</p>

## 📚 FastAPI API Documentation

<p align="center">
  <img src="aether-os/Deployment/fastapi-docs.png" width="900">
</p>

## 🐳 Docker Containers

<p align="center">
  <img src="aether-os/Deployment/docker-ps.png" width="900">
</p>

## ☁️ AWS EC2 Deployment

<p align="center">
  <img src="aether-os/Deployment/ec2-instance.png" width="900">
</p>

---

# ⚙ Tech Stack

## Backend

- Python 3.10
- FastAPI
- Uvicorn
- LangChain
- LangGraph
- LangGraph Checkpoint
- Pydantic
- SQLite
- AioSQLite

---

## Frontend

- React
- JavaScript
- HTML5
- CSS3
- React Scripts

---

## AI & LLM

- Google Gemini API
- LangChain
- LangGraph
- Multi-Agent Workflow
- Tool Calling
- Prompt Engineering

---

## DevOps

- Docker
- Docker Compose
- AWS EC2
- Ubuntu 24.04 LTS
- Git
- GitHub

---

## Database

- SQLite

---

## Tools

- VS Code
- Postman
- GitHub
- Docker Desktop

---

# 📂 Project Structure

```
Aether-OS
│
├── main.py
├── be_new.py
├── requirements.txt
├── Dockerfile.backend
├── docker-compose.yml
│
├── aether-os
│   ├── src
│   ├── public
│   ├── package.json
│   └── Dockerfile.frontend
│
├── chatbot.db
│
└── docs
    ├── app-home.png
    ├── fastapi-docs.png
    ├── docker-compose-ps.png
    ├── ec2-instance.png
    └── architecture.png
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/LikhitGaikwad/Aether-OS.git

cd Aether-OS
```

---

## Docker Deployment

```bash
docker compose up --build
```

---

## Frontend

```
http://localhost:3000
```

---

## Backend

```
http://localhost:8000
```

---

## API Documentation

```
http://localhost:8000/docs
```

---

# ☁ Cloud Deployment

The application has been deployed on **AWS EC2** using Docker Compose.

Deployment includes:

- Ubuntu 24.04 LTS
- Docker
- Docker Compose
- FastAPI
- React
- SQLite
- AWS Security Groups
- REST API

---

# 🔄 Deployment Workflow

```
GitHub
    │
    ▼
AWS EC2
    │
Docker Compose
    │
 ├── Frontend Container
 └── Backend Container
          │
          ▼
     SQLite Database
```

---

# 🔑 Environment Variables

Create a `.env`

```env
GOOGLE_API_KEY=YOUR_API_KEY
```

---

# 📦 Docker

Build

```bash
docker compose build
```

Run

```bash
docker compose up
```

Stop

```bash
docker compose down
```

---

# 📈 Future Improvements

- Authentication
- User Accounts
- PostgreSQL Integration
- Redis Caching
- Vector Database
- RAG Pipeline
- Streaming Responses
- CI/CD using GitHub Actions
- Kubernetes Deployment
- HTTPS with Nginx
- Domain Hosting

---
