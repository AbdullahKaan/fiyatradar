import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
AFFILIATE_TAG = os.getenv("AFFILIATE_TAG", "")

# Embedding model
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMENSION = 768
SIMILARITY_THRESHOLD = 0.88  # cosine similarity to consider same product

# Gemini model for analysis
GEMINI_MODEL = "gemini-2.5-flash"

# Scraping limits
MAX_PRODUCTS_PER_RUN = 500
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
