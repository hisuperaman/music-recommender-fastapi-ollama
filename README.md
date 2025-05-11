## Softwares required
- Python 3.13.1
- MongoDB
- Ollama - llama3.2
- Jupyter Notebook (Optional: for analyzing dataset)

## Installation and Running
### Client
- cd client
- npm install
- npm run dev

### pickle data from jupyter notebook
- df, combined_similarity, tfidf, tfidf_matrix
- save them in /server

### Server
- cd server
- python -m venv .venv
- activate virtual environment
    - For Windows: source .venv/bin/activate
    - For Linux/Mac: .venv/scripts/activate
- pip install -r requirements.txt
- set environment variables in .env file 
- python main.py