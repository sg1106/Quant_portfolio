import os
import PyPDF2
import google.generativeai as genai
import logging
import warnings
from dotenv import load_dotenv
import pickle
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import tempfile
from flask import Flask, request, jsonify

# Suppress resource_tracker warnings
warnings.filterwarnings("ignore", category=UserWarning, module="multiprocessing.resource_tracker")

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure caching for HuggingFace models
os.environ['TRANSFORMERS_CACHE'] = os.path.join(tempfile.gettempdir(), 'transformers_cache')
os.environ['HF_HOME'] = os.path.join(tempfile.gettempdir(), 'huggingface')

from sentence_transformers import SentenceTransformer

app = Flask(__name__, static_folder='.', static_url_path='')

# Configuration
PDF_PATH = "swastik_resume.pdf"
RESUME_LINK = "https://drive.google.com/file/d/1ie7blieqrY69-_bJsJI24AnKI0sWvYqi/view?usp=drive_link"
EMBEDDING_MODEL_NAME = "all-MiniLM-L12-v2"
PICKLE_DB_PATH = os.path.join(tempfile.gettempdir(), "vector_data.pkl")

# Global variables
rag_model = None
gemini_model = None
history = []

load_dotenv()

# Configure Gemini
def configure_gemini():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")
    if not api_key:
        logger.error("No Gemini API key found in environment variables. RAG pipeline cannot start.")
        raise ValueError("GEMINI_API_KEY environment variable is not set. Please set it in your .env file.")
    
    # Allow model selection via environment variables, defaulting to gemini-1.5-flash (stable production model)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    try:
        genai.configure(api_key=api_key)
        logger.info(f"Gemini configured using model: {model_name}")
        return genai.GenerativeModel(model_name)
    except Exception as e:
        logger.error(f"Failed to configure Gemini API with model {model_name}: {e}")
        raise

# Extract text from PDF
def extract_text_from_pdf(pdf_path):
    try:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                text += f"\n[Page {page_num}]\n{page_text}\n"
            if not text.strip():
                raise ValueError("No text could be extracted from the PDF")
            logger.info(f"Successfully extracted text from {pdf_path}")
            return text
    except Exception as e:
        logger.error(f"Error reading PDF {pdf_path}: {e}")
        raise

# Split text into chunks
def chunk_text(text, chunk_size=500, overlap=50):
    try:
        sentences = text.split('. ')
        chunks = []
        current_chunk = ""
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
            if len(current_chunk) + len(sentence) < chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
                if i > 0 and overlap > 0:
                    prev_chunk = chunks[-1].split('. ')[-1] if chunks else ""
                    current_chunk = prev_chunk + ". " + current_chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
    except Exception as e:
        logger.error(f"Error chunking text: {e}")
        raise

# Store chunks and embeddings using pickle
def store_in_pickle_db(chunks, model, pickle_path=PICKLE_DB_PATH):
    try:
        embeddings = model.encode(chunks)
        with open(pickle_path, 'wb') as f:
            pickle.dump({'chunks': chunks, 'embeddings': embeddings}, f)
        logger.info(f"Stored {len(chunks)} chunks and embeddings to {pickle_path}")
    except Exception as e:
        logger.error(f"Error storing pickle DB: {e}")
        raise

# Retrieve relevant chunks using cosine similarity
def retrieve_relevant_chunks(query, model, pickle_path=PICKLE_DB_PATH, top_k=6):
    if model is None:
        raise ValueError("Embedding model is not initialized.")
    try:
        with open(pickle_path, 'rb') as f:
            data = pickle.load(f)
        chunks = data['chunks']
        embeddings = data['embeddings']
        query_embedding = model.encode([query])
        similarities = cosine_similarity(query_embedding, embeddings)[0]
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = [chunks[i] for i in top_indices]
        logger.info(f"Retrieved {len(results)} relevant chunks for query: {query}")
        return results
    except Exception as e:
        logger.error(f"Error retrieving chunks: {e}")
        raise

# Generate answer using Gemini
def generate_answer(query, context_chunks, history, model):
    try:
        history = history[-5:]
        history_text = ""
        for turn in history:
            history_text += f"User: {turn['question']}\nAssistant: {turn['answer']}\n"

        context = "\n\n".join(context_chunks)
        prompt = f"""You are an expert assistant tasked with answering questions based solely on the provided PDF document context.
Instructions:
- Provide a **complete**, **accurate**, and **detailed** response.
- Use **bullet points** or **numbered lists** for clarity.
- Include **section titles** and **subsection titles** where applicable.
- If the query asks about experience or internships, include a subsection titled "Internship Details" or "Professional Experience".
- If the context lacks information to answer the query, state: "The document does not contain that information."
- Avoid speculative answers or external knowledge.
- Ensure the response is well-structured and concise.

Conversation History:
{history_text}

Context from PDF:
{context}

Current User Question: {query}
Response:
"""

        response = model.generate_content(prompt)
        answer = response.text.strip()
        
        # Add resume link at the end in markdown format for easy parsing on frontend
        # (The script js/chat.js will convert markdown to HTML)
        answer += f'\n\nFor reference, please view the [Resume PDF]({RESUME_LINK}).'
        logger.info(f"Generated answer for query: {query}")
        return answer
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise

# Initialize RAG pipeline on startup
def init_rag_pipeline():
    global rag_model, gemini_model, history
    try:
        logger.info("Starting RAG pipeline initialization...")
        
        if not os.path.exists(PDF_PATH):
            logger.warning(f"PDF file does not exist at path: {PDF_PATH}. RAG will load once the file is present.")
            return False
        
        text = extract_text_from_pdf(PDF_PATH)
        chunks = chunk_text(text)
        
        logger.info("Loading embedding model (all-MiniLM-L12-v2)...")
        rag_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info("Embedding model loaded successfully.")

        store_in_pickle_db(chunks, rag_model)
        gemini_model = configure_gemini()
        history = []
        
        logger.info("RAG pipeline initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Pipeline initialization error: {e}")
        rag_model = None
        gemini_model = None
        return False

# Flask routes
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    global rag_model, gemini_model, history
    try:
        data = request.get_json()
        query = data.get('question', '').strip()
        
        if not query:
            return jsonify({'error': 'No question provided'}), 400
        
        # If pipeline not initialized, try initializing it again (in case PDF was uploaded later)
        if rag_model is None or gemini_model is None:
            initialized = init_rag_pipeline()
            if not initialized:
                if not os.path.exists(PDF_PATH):
                    return jsonify({
                        'error': 'Resume PDF is missing. Please make sure "swastik_resume.pdf" is placed in the project folder.',
                        'code': 'missing_pdf'
                    }), 500
                else:
                    return jsonify({
                        'error': 'RAG pipeline not initialized. Check your Gemini API key and logs.',
                        'code': 'initialization_error'
                    }), 500
        
        relevant_chunks = retrieve_relevant_chunks(query, rag_model)
        answer = generate_answer(query, relevant_chunks, history, gemini_model)
        
        # Strip HTML-style link if Gemini tries to generate one, standardizing it
        # We append a clean Markdown-like link in generate_answer.
        history.append({"question": query, "answer": answer})
        
        return jsonify({'answer': answer}), 200
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize pipeline on startup (if PDF is present)
    init_rag_pipeline()
    
    port = int(os.getenv("PORT", 7860))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting Flask server on {host}:{port}")
    app.run(host=host, port=port)
