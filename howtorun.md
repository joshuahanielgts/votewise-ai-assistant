# How to Run VoteWise Locally

This project consists of a **FastAPI backend** and a **React frontend (Vite)**. You need two terminal windows to run both simultaneously.

---

### Method 1: The Quick Way (Windows)

We have created a handy launcher script. Simply double-click the `start.bat` file in the root folder, or run this in your terminal:
```bat
.\start.bat
```
This will automatically set up the Python virtual environment, install backend requirements, and start both the frontend and backend in separate windows!

---

### Method 2: Manual Terminal Commands

If you prefer to run things manually or are on macOS/Linux, follow these steps.

#### 1. Start the Backend API
Open a terminal, navigate to the `backend` folder, set up your Python environment, and start the server:

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create a virtual environment (optional but recommended)
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the FastAPI server
python -m uvicorn main:app --reload
```
*The backend will now run on `http://127.0.0.1:8000`.*

#### 2. Start the Frontend
Open a **new** terminal window, stay in the root project folder, and start the Vite development server:

```bash
# 1. Install Node.js dependencies (if you haven't already)
npm install

# 2. Run the frontend server
npm run dev
```
*The frontend will now run on `http://localhost:5173` (or the port specified in your terminal).*

---

### Troubleshooting

- **"uvicorn is not recognized"**: Ensure you have activated your virtual environment (`.\venv\Scripts\activate`) before running uvicorn. Alternatively, using `python -m uvicorn main:app --reload` usually bypasses this issue.
- **"I'm having trouble connecting" in the UI**: This means the frontend cannot reach the backend. Ensure your backend terminal is running and shows no errors. Also ensure that you visit `http://localhost:5173` (or the local link provided by Vite) to view the app, rather than going to `http://localhost:8000` (which is strictly the API server).
