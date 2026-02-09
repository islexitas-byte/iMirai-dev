import os
import re
import uuid
import requests
from tqdm import tqdm
from docx import Document
from deps import get_connection
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredPowerPointLoader,Docx2txtLoader,UnstructuredPDFLoader,UnstructuredExcelLoader,BSHTMLLoader

def cleanup_training_dir():
    TRAINING_DIR = r"Trained Data"
    for f in os.listdir(TRAINING_DIR):
        try:
            os.remove(os.path.join(TRAINING_DIR, f))
        except:
            pass

def insert_record(content_id, content, source_file):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO PILOG_KNOWLEDGE_BASE
        (CONTENT_ID, DOCUMENT_CONTENT, SOURCE_FILE, STATUS)
        VALUES (:1, :2, :3, 'PENDING')
    """, (content_id, content, source_file))

    conn.commit()
    cur.close()
    conn.close()

def update_status(content_ids, status):
    conn = get_connection()
    cur = conn.cursor()
    for content_id in content_ids:
        cur.execute("""
            UPDATE PILOG_KNOWLEDGE_BASE
            SET STATUS = :1
            WHERE CONTENT_ID = :2
        """, (status, content_id))

        conn.commit()
    cur.close()
    conn.close()


def estimate_docx_pages(file_path: str, words_per_page=650) -> int:
    doc = Document(file_path)
    words = sum(len(p.text.split()) for p in doc.paragraphs)
    return max(1, round(words / words_per_page))
def run_training():
    try:
        # update_status(content_id, "RUNNING")

        all_splits = []
        ids = []
        for ppt in tqdm(os.listdir(r'Trained Data')):
        # ppt = 'linkedin_data_cleaned (1).docx'
            pages = None
            ppt_file_path = os.path.join(r'Trained Data',ppt)
            # Load the data using UnstructuredPowerPointLoader
            # This will extract text and metadata from the slides
            if ppt.endswith('.pptx'):
                loader = UnstructuredPowerPointLoader(ppt_file_path)
                documents = loader.load()
            elif ppt.endswith('.docx'):
                try:
                    pages = estimate_docx_pages(ppt_file_path)
                    loader = Docx2txtLoader(ppt_file_path)
                    documents = loader.load()
                except KeyError as e:
                    print(ppt)
            elif ppt.endswith('.pdf'):
                # print(ppt)
                loader = UnstructuredPDFLoader(ppt_file_path)
                documents = loader.load()
            elif ppt.endswith('.xlsx') or ppt.endswith('.xls'):
                loader = UnstructuredExcelLoader(ppt_file_path)
                documents = loader.load()
            elif ppt.endswith('.html'):
                loader = BSHTMLLoader(ppt_file_path)
                documents = loader.load()

            if re.search(r'(\.docx|\.doc|\.html)$',ppt):
                if ppt.endswith('.docx'):
                    page_count = estimate_docx_pages(ppt_file_path)
                if page_count<=5:
                    all_splits.extend(documents)
                    for idx in range(len(documents)):
                        document_id = str(uuid.uuid4())
                        insert_record(document_id,documents[idx].page_content,ppt)
                        ids.append(document_id)

                else:
                    text_splitter = RecursiveCharacterTextSplitter(chunk_size=3500, chunk_overlap=1200)
                    documents1 = text_splitter.split_documents(documents)
                    all_splits.extend(documents1)
                    for idx in range(len(documents1)):
                        document_id = str(uuid.uuid4())
                        insert_record(document_id,documents1[idx].page_content,ppt)
                        ids.append(document_id)

            else:
                text_splitter = RecursiveCharacterTextSplitter(chunk_size=5000, chunk_overlap=2000)
                documents1 = text_splitter.split_documents(documents)
                all_splits.extend(documents1)
                for idx in range(len(documents1)):
                    document_id = str(uuid.uuid4())
                    insert_record(document_id,documents1[idx].page_content,ppt)
                    ids.append(document_id)
        response = requests.post('http://72.83.150.108:50241/Train-RAG',data={'documents':all_splits,'document_id':ids},timeout=60)
        if response.text:
            update_status(ids, "COMPLETED")
        else:
            update_status(ids, "FAILED")
        cleanup_training_dir()
        
    except Exception as e:
        print(e)
        update_status(ids, "FAILED")