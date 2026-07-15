# 🚂 RailOptima — Railway Signal Optimization System

<div align="center">

![Railway Signal Optimization](public/wap7-model.png)

[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**An AI-powered real-time railway signal optimization system that uses
Machine Learning to minimize train delays and maximize network throughput.**

</div>

---

## 👨‍💻 Developed By

<div align="center">

| Developer | Role |
|-----------|------|
| **Gourab Dey** | Project Lead & ML Engineer |
| **Chitradeep Das** | Frontend Developer |
| **Sandipan Karmakar** | Backend Developer |
| **Sandip Mandal** | ML Model & Data Engineer |

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [ML Models Used](#-ml-models-used)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [How It Works](#-how-it-works)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## 🔍 Overview

RailOptima is a full-stack intelligent railway management system that simulates
a real railway network and uses Artificial Intelligence to optimize signal
states in real time. The system continuously monitors train positions, signal
aspects, switch positions, and delay accumulations, and when the operator
requests optimization it runs the current network state through a trained
Machine Learning pipeline to generate the safest and most efficient set of
signal and switch changes that will reduce delays and improve throughput across
the entire network.

The system is built on a three-tier architecture consisting of a React
TypeScript frontend for simulation and visualization, an Express Node.js
backend for API orchestration and fallback handling, and a Python Flask ML
service hosting the trained Random Forest, Gradient Boosting, and PPO
Reinforcement Learning models.

---

## ✨ Features
