from fastapi import FastAPI, HTTPException, Form, UploadFile, File, BackgroundTasks,Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openai import OpenAI
from pydantic import BaseModel
from typing import Literal,Optional
from deps import get_connection
from prompts import knowai_prompts
from tasks import run_task
from training_data_code import run_training
from project_plans_save import save_project_plans
import pandas as pd
import json
import tiktoken
import warnings
import requests
import httpx
import random
import os
import re

# ===== CREDIT CONFIGURATION =====
TOTAL_CREDITS_PER_USER = 20
TOKENS_PER_CREDIT = 20000

warnings.filterwarnings('ignore')
client = OpenAI(
    api_key='YOUR_API_KEY',
    base_url = "http://207.180.148.74:46530/v1"
)
model_ISL0 = 'gpt-oss-120b'
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",'https://mirai.pilogcloud.com'],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# DOCS_CHAT_URL = "http://49.213.134.9:15207/chat-test"
DOWNLOAD_DIR = r"my-chat-app"  # directory where files exist
DOCUMENT_FOLDER = r'Trained Data'

# Pydantic model for request from your frontend
# class AskPayload(BaseModel):
#     question: str
#     sessionId: Optional[str] = None
#     username: str
#     File: UploadFile[File] = None
class FeedbackData(BaseModel):
    question: str
    Thumbs_up: Literal["1", "0"] 
    Thumbs_down: Literal["1", "0"]
    Percentage: str
    sessionId: Optional[str] = None
    reason:Optional[str] = None

# Serve index.html at "/"
@app.get("/", response_class=FileResponse)
async def get_index():
    index_path = os.path.join("static", "index.html")
    return FileResponse(index_path)

# Optional: static folder if you add other assets later
# app.mount("/static", StaticFiles(directory="static"), name="static")

def detect_table(html: str) -> bool:
    return bool(re.search(r"<table[\s\S]*?>", html, re.IGNORECASE))

def wrap_table_response(html: str) -> str:
    return f"""
    <div class="llm-table-response" data-copyable="true">
        {html}
    </div>
    """

def normalize_question(question: str, model_name: str) -> dict:
    """
    Silently rewrites unclear / grammatically incorrect questions
    without changing the original intent.
    """

    system_prompt = """
    You are a query normalization engine.

    Your task:
    - Rewrite the user's question into clear, complete, professional English
    - Preserve the original intent exactly
    - Do NOT add new requirements
    - Do NOT answer the question
    - Do NOT explain anything
    - Use 'PiLog' as the default company name, don't invent new names if you were used at anywhere.
    - **if the user gave 'pilot' then you have to consider that as *PiLog*, don't return any unknown names.** 

    Output JSON strictly in this format:
    {
      "needs_correction": true | false,
      "normalized_question": "<string>"
    }
    """

    response = client.chat.completions.create(
        model=model_name,
        temperature=0.0,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
    )

    try:
        return json.loads(response.choices[0].message.content)
    except Exception:
        # Safe fallback
        return {
            "needs_correction": False,
            "normalized_question": question
        }


def generate_next_questions(
    chat_history: list,
    effective_question: str,
    answer: str,
    model_name: str,
    max_questions: int = 3
) -> list:

    system_prompt = f"""
       You are a conversational AI assistant that suggests SHORT, CLEAR follow-up questions,
similar to how ChatGPT suggests next questions.

Your task:
Suggest up to {max_questions} concise follow-up questions a user might ask next,
based ONLY on:
- The latest user question
- The latest assistant answer

### STRICT STYLE RULES (VERY IMPORTANT)

1. Each question must be SHORT (max 12 words).
2. One idea per question.
3. No commas, no compound sentences.
4. No corporate filler words.
5. No phrases like:
   - "that aligns with"
   - "in order to"
   - "can you provide"
   - "please explain"
6. Questions must feel natural and effortless to read.
7. Avoid repeating concepts already asked.
8. If no useful follow-ups exist, return an EMPTY list.

### GOOD EXAMPLES
- "Implementation timeline for PiLog?"
- "How does PiLog ensure data security?"
- "ROI calculation template?"
- "Key milestones for deployment?"

### BAD EXAMPLES (DO NOT GENERATE)
- "Can you provide a detailed ROI calculation template that aligns with success metrics?"
- "What implementation timeline and key milestones should we plan for deploying PiLog?"

### OUTPUT FORMAT (JSON ONLY)
{{
  "next_questions": ["question 1", "question 2", "question 3"]
}}

    """

    messages = [{"role": "system", "content": system_prompt}]

    # include limited chat history (last 3 turns max)
    for msg in chat_history[-6:]:
        messages.append(msg)

    messages.append({
        "role": "user",
        "content": f"""
        Latest question:
        {effective_question}

        Latest answer:
        {answer}
        """
    })

    response = client.chat.completions.create(
        model=model_name,
        temperature=0.6,
        messages=messages
    )

    try:
        data = json.loads(response.choices[0].message.content)
        return data.get("next_questions", [])[:max_questions]
    except Exception:
        return []


def get_response(model_name,msg,files_message,chat_history,role,sampledata=None):
    # print('retriving started')

    # retriever = db.as_retriever(
    # search_type="mmr", search_kwargs={"k": 10, "fetch_k": 5}
    # )
    # # print('retriving done')

    # output = retriever.invoke(msg)
    try:
        # with httpx.AsyncClient(timeout=90.0) as client:
        resp = requests.post(
            "http://207.180.148.74:45074/test-new-RAG",
            data={"question": msg},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        output = resp.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error contacting docs-chat API: {e}",
        )
    """----------------------------------------------------
    2. Document
    ----------------------------------------------------
    Use this ONLY when the user EXPLICITLY asks for:
    - A document to be created or prepared
    - DOC, DOCX, PDF, Word file
    - "Create a document"
    - "Prepare a report document"
    - "Give me a PDF"
    - "Make a Word file"
    IMPORTANT:
    If the user only asks for INFORMATION or EXPLANATION,
    and does NOT ask for a document or file,
    you MUST NOT use Document."""
    # print(output)
    documents_data = []
    if role:
        user_role = role.lower()
    for j in output:
        metadata = j.get('metadata',{})
        source = metadata.get('source','').lower()
        if 'playbook' not in source:
            documents_data.append(j['page_content'])
        else:
            if user_role == 'admin':
                documents_data.append(j['page_content'])
            else:
                pass  
    # print('response generation start')
    if sampledata:
        extra_content = [{'role':'user','content':sampledata},files_message]
    else:
        extra_content = [files_message]
    response = client.chat.completions.create(
    model=model_ISL0,
    messages = [{'role':'system','content':f"{knowai_prompts['INTENT CLASSIFICATION']}"},
    *chat_history,{'role':'user','content': msg},*extra_content],
    temperature=0.0)
    classify_res = response.choices[0].message.content
    print(classify_res)
    if classify_res not in ['File','Project Plan File','Data Harmonisation','Data Insights','General']:
        return 'General',classify_res
    if classify_res == 'General':
        documentsr = {"role":"assistant","content":f"[retrieved_documents]\n{documents_data}"}
    elif classify_res == 'Project Plan File':
        documentsr = {"role":"system","content":f"""
            # **AUTHORITATIVE PROJECT STRUCTURE**

            This defines the **ONLY allowed source** for:

            * Phases
            * Activities
            * Activity sequencing

            You MUST use this structure exactly as provided.
            You are NOT allowed to invent, modify, reorder, or replace.

            ---

            ### **Controlled Exception — Dynamic Project Name Injection**

            Replacing the **project name placeholder** inside activity descriptions is:

            * A **dynamic parameter substitution**
            * NOT a modification of:

            * Activity structure
            * Activity intent
            * Activity sequencing

            This substitution is **mandatory** and **does not violate** the authoritative structure rule.

            ---

            User input may only influence:

            * Dates
            * Duration
            * Responsibility
            * Output format
            * **Project name token inside existing activity descriptions**

            ---
            [retrieved_documents]
            {documents_data}
            """}
    else:
        documentsr = {"role":"assistant","content":f"[retrieved_documents]\n{documents_data}"}

    if classify_res=='Data Harmonisation':
        if sampledata:
            msg = sampledata
        response = client.chat.completions.create(
            model='gpt-oss-120b',
            messages = [{'role':'system','content':f"""{knowai_prompts[classify_res]}"""},
            *chat_history,{'role':'user','content':f"""{msg}"""}],
            )
    elif classify_res=='Data Insights':
        return 'Data Insights',''
    else:
        message = [
            {"role": "system", "content": knowai_prompts[classify_res]},
            *chat_history,
            documentsr,
            {"role":"user","content":"""
            ## Question
            {question}""".format(question=msg)}
        ]        
    # print(knowai_prompts[classify_res])
        response = client.chat.completions.create(
        model=model_name,
        messages = message,
        temperature=0.0,
        max_tokens = 50000)

    extracted_text = response.choices[0].message.content
    # print('response generation done')
    return classify_res,extracted_text

def title_generation(question,model_name):
    response = client.chat.completions.create(
    model=model_name,
    messages = [
            {"role": "system", "content": 
            """Your task is to generate chat session title based on the first question.
            Output should be only title without any kind of explanations.
            """},
            {"role": "user","content": question}])
    extracted_text = response.choices[0].message.content
    return extracted_text
def get_existing_data(question,conn,type_,session_id):
    if type_=='all':
        sql = """
        SELECT *
        FROM FEEDBACK_ANALYSIS
        WHERE QUESTION = :question and SESSION_ID = :session_id
        """
    else:
        sql = """
        SELECT POSITIVE_REACTION,NEGITIVE_REACTION,POSITIVE_PERCENTAGE,NEGITIVE_PERCENTAGE
        FROM FEEDBACK_ANALYSIS
        WHERE QUESTION = :question and SESSION_ID = :session_id
        """

    # --- Execute query ---
    cursor = conn.cursor()
    cursor.execute(sql, {"question": question,'session_id':session_id})

    # --- Convert to DataFrame ---
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()

    df = pd.DataFrame(rows, columns=columns)
    return df

def get_chat_history(session_id):
   
    con = get_connection()
    # print('connection')

    data = pd.read_sql(f"SELECT QUESTION,AI_RESPONSE FROM FEEDBACK_ANALYSIS WHERE SESSION_ID='{session_id}' ORDER BY CREATE_DATE ASC",con)
    # print('data retrived')
    data = data.astype({'AI_RESPONSE':str})
    # print('clob changes')
    data = data.loc[-4:]
    con.close()
    # print('conn closed')

    history = []
    # print('data convertion started')

    for k,v in data.iterrows():
        history.extend([{'role':'user','content':v['QUESTION']},{'role':'assistant','content':eval(v['AI_RESPONSE'])[-1]}])
    # print('data convertion done')
    return history
def export_data(res_new):
    # print(res_new)
    file_name = res_new['file_name']
    format_ = res_new['format'].lower()
    if format_ == 'excel':
        pd.read_html(res_new['sheet1'])[0].to_excel(file_name,index=False)
    elif format_ == 'csv':
        pd.read_html(res_new['sheet1'])[0].to_csv(file_name,index=False)
    elif format_ == 'json':
        pd.read_html(res_new['sheet1'])[0].to_json(file_name)

def link_regeneration(res):
    if res.startswith('{'):
        html_content = """
    <div class="pilog-answer">
        <p class="pilog-answer-summary">{}</p>
    </div>"""
        res_new = eval(res)
        file_name = res_new['file_name']
        file_preview = create_download_link_html(file_name,res_new['format'].lower())
        # export_data(res_new)
        resp = {'answer':html_content.format(res_new['message']),'preview_html':file_preview}
        return resp
    else:
        return res

def build_corrected_question_banner(original: str, corrected: str) -> str:
    return f"""
    <div class="ai-question-correction">
        <em>{corrected}</em>
    </div>
    """

def get_files_from_folder(folder_path):
    files = []
    for f in os.listdir(folder_path):
        full_path = os.path.join(folder_path, f)
        if os.path.isfile(full_path):
            # print('f',f)
            files.append(f)  # includes extension
    return files

# ===== TOKEN COUNT LOGIC START =====

def count_tokens(text: str, model: str = "gpt-oss-120b") -> int:
    """
    Count tokens using tiktoken for a given text
    """
    if not text:
        return 0
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")

    return len(encoding.encode(text))


def update_user_tokens(conn, username: str, tokens_used: int):
    """
    Increment TOKENS_USED in PKA_LOGIN
    """
    cur = conn.cursor()
    cur.execute("""UPDATE PKA_LOGIN SET TOKENS_USED = NVL(TOKENS_USED, 0) + :tokens_used WHERE USER_NAME = :username""", {"tokens_used": tokens_used, "username": username})
    conn.commit()
    cur.close()

# ===== TOKEN COUNT LOGIC END =====

# ===== CREDIT CALCULATION LOGIC START =====

def calculate_user_credits(tokens_used: int) -> dict:
    """
    Calculate credits used and remaining credits based on tokens
    """
    credits_used = round(tokens_used / TOKENS_PER_CREDIT,2)
    credits_left = TOTAL_CREDITS_PER_USER - credits_used

    if credits_left < 0:
        credits_left = 0

    return {
        "total_credits": TOTAL_CREDITS_PER_USER,
        "credits_used": credits_used,
        "credits_left": credits_left
    }

# ===== CREDIT CALCULATION LOGIC END =====


# ===== CREDIT FETCH LOGIC START =====

def get_user_token_and_credit_info(conn, username: str) -> dict:
    cur = conn.cursor()
    cur.execute("""SELECT NVL(TOKENS_USED, 0) FROM PKA_LOGIN WHERE USER_NAME = :username""", {"username": username})

    row = cur.fetchone()
    cur.close()

    tokens_used = row[0] if row else 0
    credit_info = calculate_user_credits(tokens_used)

    return {
        "tokens_used": tokens_used,
        **credit_info
    }

# ===== CREDIT FETCH LOGIC END =====


@app.get('/suggested-questions')
def listofquestions():
    pick_set = random.randint(1,4)
    questions_dict = {
        1: {'questions':[
            "What is PiLog India known for in the field of data management?",
            "How does PiLog support master data governance for enterprises?",
            "What are the key industries PiLog India serves?",
            "What is artificial intelligence and how is it used in business today?",
            "What are the major benefits of using AI in supply chain management?",
            "What is a business model and why is it important?",
            "How does digital transformation impact modern organizations?"
        ]},
        2: {'questions':[
            "How does PiLog India contribute to data standardization?",
            "What is the importance of data quality in enterprise systems?",
            "How does PiLog integrate with ERP platforms like SAP?",
            "How can AI improve customer service operations?",
            "What is strategic planning in business?",
            "How do companies analyze market trends?",
            "What is the difference between revenue and profit?",
            "Why is customer retention important for business success?"
        ]},
        3: {'questions':[
            "What role does PiLog play in digital transformation projects?",
            "How does PiLog support asset data management?",
            "Why is data governance critical for large enterprises?",
            "How does AI help in predictive analytics?",
            "What is competitive advantage in business?",
            "How do companies build strong brand identity?",
            "What is the importance of financial planning?",
            "How does globalization affect business strategy?"
        ]},
        4: {'questions':[
            "What are the core solutions offered by PiLog India?",
            "How does PiLog help organizations achieve data compliance?",
            "What is master data management and why is it important?",
            "What is natural language processing in AI?",
            "How is AI used in fraud detection?",
            "How do businesses manage operational risks?",
            "What is the role of innovation in business growth?",
            "How do companies measure business performance?"
        ]}
    }

    return questions_dict[pick_set]

@app.post("/add-documents")
async def train_model(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(None),
    text: str = Form(None)
):
    TRAINING_DIR = r"Trained Data"
    if not file and not text:
        return {"error": "Provide either file or text"}

    if file:
        try:
            contents = file.file.read()
            file_name = file.filename
            with open(os.path.join(TRAINING_DIR,file_name), 'wb') as f:
                f.write(contents)
        except Exception:
            raise HTTPException(status_code=500, detail='Something went wrong')
        finally:
            file.file.close()
    else:
        file_name = f"text.html"
        file_path = os.path.join(TRAINING_DIR, file_name)
        html_text = f"""<p>{text}</p>"""
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_text)

    # content_id = str(uuid.uuid4())

    # 2. start background task
    background_tasks.add_task(run_training)
    # 3. immediate response
    return {
        "Content_File":file_name ,
        "message": "Training started. Status will be updated in the grid."
    }

@app.post('/auth/login')
def login_auth(username: str = Form(...), password: str = Form(...)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(f"SELECT NAME,CONTENT_AUTHORIZATION,ROLE FROM PKA_LOGIN WHERE USER_NAME=:0 AND PASSWORD=:1",(username,password))
    result = cur.fetchone()
    
    if result:
        name = result[0]
        cur.close()
        conn.close()
        return {'name':name,'username':username,'CONTENT_AUTHORIZATION':result[1],'role':result[2]}
    else:
        raise HTTPException(status_code=404, detail="User not found")
@app.post('/auth/register')
def user_register(name: str = Form(...),username: str = Form(...), password: str = Form(...), email: str = Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO PKA_LOGIN(NAME,USER_NAME,PASSWORD,EMAIL)VALUES(:0,:1,:2,:3)",(name,username,password,email))
        conn.commit()
        cur.close()
        conn.close()
        return {'message':'User Registered successfully'}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Register Now")

@app.post('/session/rename')
def rename_chat(name:str=Form(...), username:str=Form(...), session_id:str=Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE SESSION_NAMES SET TITLE=:0 WHERE USER_NAME=:1 AND SESSION_ID=:2",(name,username,session_id))
        conn.commit()
        cur.close()
        conn.close()
        return {'message':'Done'}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Rename The Session")   
@app.post('/session/delete')
def delete_session(username:str=Form(...), session_id:str=Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM SESSION_NAMES WHERE USER_NAME=:0 AND SESSION_ID=:1",(username,session_id))
        cur.execute("DELETE FROM FEEDBACK_ANALYSIS WHERE USER_NAME=:0 AND SESSION_ID=:1",(username,session_id))
        conn.commit()
        cur.close()
        conn.close()
        return {'message':'Done'}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Delete The Session") 
        
@app.get('/chat/session/{session_id}')
def get_session_history(session_id:str):
    try:
        conn = get_connection()
        cur = conn.cursor()
        query = f"""SELECT QUESTION,AI_RESPONSE,CREATE_DATE,USER_NAME FROM FEEDBACK_ANALYSIS WHERE SESSION_ID='{session_id}' ORDER BY CREATE_DATE ASC"""
        session = pd.read_sql(query,conn)
        # session = pd.read_excel()
        session = session.astype({'AI_RESPONSE':str})
        session['AI_RESPONSE'] = session['AI_RESPONSE'].apply(lambda x:link_regeneration(eval(x)[-1]) if x else x)
        sessions_json = {"session_id": session_id,
        "username": list(session['USER_NAME'])[0]}
        messages = []
        for row in session.iterrows():
            messages.append({
            "role": "user",
            "content":row[1][0] ,
            "created_at": row[1][2]
            })
            messages.append({
            "role": "assistant",
            "content":row[1][1] ,
            "created_at":row[1][2]
            })
        sessions_json['messages'] = messages 
        # print(sessions_json) 
        cur.close()
        conn.close()
        return sessions_json
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Fetch the sessions")

@app.get('/chat/sessions')
def get_all_sessions(username:str):
    try:
        conn = get_connection()
        cur = conn.cursor()
        query = """SELECT
            SESSION_ID,
            CREATE_DATE AS UPDATED_AT
        FROM (
            SELECT
                SESSION_ID,
                QUESTION,
                AI_RESPONSE,
                CREATE_DATE,
                ROW_NUMBER() OVER (
                    PARTITION BY SESSION_ID, USER_NAME
                    ORDER BY CREATE_DATE DESC
                ) rn
            FROM FEEDBACK_ANALYSIS WHERE USER_NAME = :username
        )
        WHERE rn = 1"""
        titles_query = """SELECT SESSION_ID,TITLE FROM SESSION_NAMES WHERE USER_NAME = :username"""
        sessions_data = pd.read_sql(query,conn,params={"username": username})
        sessions_titles = pd.read_sql(titles_query,conn,params={"username": username})
        sesions_final = sessions_data.merge(sessions_titles,on='SESSION_ID',how='left')
        sesions_final = sesions_final[['SESSION_ID','TITLE','UPDATED_AT']]
        sesions_final.sort_values(by=['UPDATED_AT'],ascending=False, inplace=True)
        # print(sesions_final)
        # sessions_data = sessions_data.astype({'LAST_MESSAGE_PREVIEW':str})
        # sessions_data['LAST_MESSAGE_PREVIEW'] = sessions_data['LAST_MESSAGE_PREVIEW'].apply(lambda x:eval(x)[-1] if x else x)
        sesions_final.columns = [i.lower() for i in sesions_final.columns]
        cur.close()
        conn.close()
        return {'sessions':[dict(row[1]) for row in sesions_final.iterrows()]}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Fetch the sessions")

@app.get('/session/title')
def get_session_title(username:str,session_id:str):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT TITLE FROM SESSION_NAMES WHERE USER_NAME=:0 AND SESSION_ID=:1",(username,session_id))
        result = cur.fetchone()
        cur.close()
        conn.close()
        return {'title':result[0]}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Fetch the sessions title")

@app.get('/tasks-list')
def get_tasks_list(username:str):
    try:
        conn = get_connection()
        cur = conn.cursor()       
        cur.execute("""SELECT TASK_ID,TASK_NAME,TASK_TYPE,CREATE_DATE,TOTAL_RECORDS,IN_PROGRESS,COMPLETED,FAILED,
        STATUS FROM USERS_TASKS_LIST WHERE USER_NAME=:0 AND TASK_TYPE=:1 ORDER BY CREATE_DATE DESC""",(username,'Harmonisation Task'))
        results = cur.fetchall()
        cur.execute("""SELECT TASK_ID,TASK_NAME,TASK_TYPE,CREATE_DATE,DATA_LOADED,DATA_ANALYSED,
        DATA_INSIGHTS_GENERATED,STATUS FROM USERS_TASKS_LIST WHERE USER_NAME=:0 AND TASK_TYPE=:1 ORDER BY CREATE_DATE DESC""",(username,'Insights Task'))
        results1 = cur.fetchall()
        results.extend(results1)
        cur.close()
        conn.close()
        dc_columns = ["Task ID","Task Name","Task Type","Date Time","Total Records","In Progress",
        "Completed","Failed","Status"]
        di_columns = ["Task ID","Task Name","Task Type","Date Time","Data Loaded","Data Analysed",
        "Data Insights Generated","Status"]
        final_result = [{dc_columns[i]:result[i] for i in range(len(dc_columns))} if result[2]=='Harmonisation Task'
         else {di_columns[i]:result[i] for i in range(len(di_columns))} for result in results]
        return final_result
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Unable Fetch the tasks please try later.")
@app.post("/save-feedback")
async def save_user_feedback(payload: FeedbackData):
    feedback = payload
    conn = get_connection()
    cur = conn.cursor()
    session_id = feedback.sessionId
    reason = feedback.reason
    existing_data = get_existing_data(feedback.question,conn,'not all',session_id)
    if existing_data.shape[0]>0:
        existing_data_ = {i:eval(existing_data[i][0].read()) if existing_data[i][0]!=None else [] for i in existing_data.columns}

    if (feedback.Thumbs_up=='1') and (feedback.Thumbs_down=='0'):
        if existing_data.shape[0]>0:
            feedback_data = (str(existing_data_['POSITIVE_REACTION']+[feedback.Thumbs_up]),str(existing_data_['POSITIVE_REACTION']+[feedback.Thumbs_down]),
            str(existing_data_['POSITIVE_PERCENTAGE']+[feedback.Percentage]),str(existing_data_['NEGITIVE_PERCENTAGE']+[0]),feedback.question,session_id,reason)
        else:
            feedback_data = (str([feedback.Thumbs_up]),str([feedback.Thumbs_down]),str([feedback.Percentage]),'[0]',feedback.question,session_id,reason)
    elif (feedback.Thumbs_down=='1') and (feedback.Thumbs_up=='0'):
        if existing_data.shape[0]>0:
            feedback_data = (str(existing_data_['POSITIVE_REACTION']+[feedback.Thumbs_up]),str(existing_data_['POSITIVE_REACTION']+[feedback.Thumbs_down]),
            str(existing_data_['POSITIVE_PERCENTAGE']+[0]),str(existing_data_['NEGITIVE_PERCENTAGE']+[feedback.Percentage]),feedback.question,session_id,reason)
        else:
            feedback_data = (str([feedback.Thumbs_up]),str([feedback.Thumbs_down]),'[0]',str([feedback.Percentage]),feedback.question,session_id,reason)
        
    cur.execute("""UPDATE FEEDBACK_ANALYSIS SET POSITIVE_REACTION=:0,NEGITIVE_REACTION=:1,POSITIVE_PERCENTAGE=:2,
    NEGITIVE_PERCENTAGE=:3,REASON=:4 WHERE QUESTION=:5 AND SESSION_ID=:6""",feedback_data)
    conn.commit()
    cur.close()
    conn.close()

@app.get("/api/knowledge-sources")
def get_knowledge_sources(role: Optional[str] = Query(None)):
    conn = get_connection()

    import oracledb

    def lob_as_string_handler(cursor, name, default_type, size, precision, scale):
        if default_type == oracledb.DB_TYPE_CLOB:
            return cursor.var(oracledb.DB_TYPE_LONG, arraysize=cursor.arraysize)


    conn.outputtypehandler = lob_as_string_handler

    cur = conn.cursor()
    cur.arraysize = 500          # bulk fetch
    cur.prefetchrows = 500      # reduce round trips

    # cur.execute("""
    #     SELECT
    #         CONTENT_ID,
    #         DOCUMENT_CONTENT,
    #         SOURCE_FILE,
    #         CATEGORY,
    #         CREATE_DATE,
    #         STATUS
    #     FROM PILOG_KNOWLEDGE_BASE
    #     ORDER BY CONTENT_ID DESC
    # """)
    cur.execute("""
        SELECT
            CONTENT_ID,
            DOCUMENT_CONTENT,
            SOURCE_FILE,
            CATEGORY,
            CREATE_DATE,
            STATUS,
            ROLE
        FROM PILOG_KNOWLEDGE_BASE
        WHERE
            UPPER(ROLE) = UPPER(:role)
            OR
            ',' || REPLACE(UPPER(ROLE), ' ', '') || ','
                LIKE '%,' || UPPER(:role) || ',%'
        ORDER BY CONTENT_ID DESC
    """, {"role": role})

    cols = [c[0] for c in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    return rows

@app.get("/api/knowledge-sources/{contentId}/content")
def get_knowledge_sources(contentId:str):
    print(contentId)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            DOCUMENT_CONTENT
        FROM PILOG_KNOWLEDGE_BASE
        WHERE CONTENT_ID = :content_id
    """,content_id=contentId)
    document_content = cur.fetchone()
    if document_content:
        result = document_content[0].read()
    cur.close()
    conn.close()
    return result
# Assuming you have an 'export_data' function that handles file writing.

# --- Helper function for icons/colors ---
def get_file_icon_details(file_format: str):
    """Returns the visual details (color, text) for the file icon."""
    format_ = file_format.lower()
    if format_ in ['xlsx', 'xls', 'excel']:
        return {
            'text': 'XLSX', 
            'color': '#107c41' # Excel Green
        }
    elif format_ == 'csv':
        return {
            'text': 'CSV', 
            'color': '#2563eb' # Accent Blue
        }
    elif format_ == 'json':
        return {
            'text': 'JSON', 
            'color': '#f97316' # Orange
        }
    else:
        return {
            'text': file_format.upper(), 
            'color': '#4b5563' # Default Grey
        }

# --- Main HTML Generation Function (replaces create_download_link_html) ---
def create_download_link_html(filename: str, file_format: str):
    """Generates the HTML fragment for the styled download card."""
    
    file_format = file_format.lower()
    # Ensure the file is saved with the correct extension for the download link
    # full_file_name = f"{filename}"
    # download_url = f"/download/{full_file_name}"
    
    icon_details = get_file_icon_details(file_format)
    
    # The new complex HTML structure for the card look
    # Uses the 'style' attribute for the dynamic color defined in the helper function
    html = f"""
    <div class="file-download-card">
        <div class="file-info-section">
            <div class="file-icon-wrapper" style="background-color: {icon_details['color']};">
                <span class="file-icon-text">{icon_details['text']}</span>
            </div>
            
            <span class="file-name-pill">{filename}</span>
        </div>
        
        <a href="http://127.0.0.1:8000/download/{filename}" download="{filename}" class="download-round-btn" style="background-color: {icon_details['color']};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        </a>
    </div>
    """
    return html


# @app.get("/download/{filename}")
# def download_file(filename: str):
#     file_path = os.path.join(DOWNLOAD_DIR, filename)

#     if not os.path.exists(file_path):
#         raise HTTPException(status_code=404, detail="File not found")

#     return FileResponse(
#         path=file_path,
#         filename=filename,
#         media_type="application/octet-stream"
#     )

@app.get("/download/{filename}")
def download_file(filename: str):
    possible_paths = [os.path.join(DOWNLOAD_DIR, filename),
                      os.path.join(DOCUMENT_FOLDER, filename)]
    file_path = None
    for path in possible_paths:
        if os.path.isfile(path):
            file_path = path
            break
 
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
 
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@app.get("/task/download/{taskId}")
def download_file(taskId: str):
    dir_folder = r"Data Harmonisation Results"
    filename = taskId+'.xlsx'
    file_path = os.path.join(dir_folder, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@app.get("/show/insights/{taskId}")
def show_insights(taskId: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT INSIGHTS_DATA FROM USERS_TASKS_LIST WHERE TASK_ID=:taskid",taskid=taskId)
    result = cur.fetchone()
    result = eval(result[0].read())
    cur.close()
    conn.close()
    return result

@app.post('/tasks/rename/{taskId}')
def rename_task(taskId: str, newName: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE USERS_TASKS_LIST SET TASK_NAME=:0 WHERE TASK_ID=:1", (newName, taskId))    
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success"}

@app.delete('/tasks/delete/{taskId}')
def delete_task(taskId: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM USERS_TASKS_LIST WHERE TASK_ID=:0", (taskId,))    
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success"}

@app.post('/tasks/delete')
def rename_task(taskId: str,newName:str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE USERS_TASKS_LIST WHERE TASK_ID=:1",(taskId,newName))    
    conn.commit()
    cur.close()
    conn.close()

@app.post("/ask")
async def ask(
    question: str = Form(...),
    username: str = Form(...),
    sessionId: Optional[str] = Form(None),
    File: Optional[UploadFile] = File(None),
    role: Optional[str] = Query(...)
):
    
    question = question.strip()
    session_id = sessionId
    user_name = username
    normalization = normalize_question(question, model_ISL0)

    if normalization.get("needs_correction"):
        effective_question = normalization["normalized_question"]
        correction_banner = build_corrected_question_banner(
            question,
            effective_question
        )
    else:
        effective_question = question
        correction_banner = ""
        # ---------------------------------------


    if File:
        conn = get_connection()
        cur = conn.cursor()
        try:
            contents = File.file.read()
            filepath = os.path.join(r'Data Harmonisation',File.filename)
            with open(filepath,'wb') as f:
                f.write(contents)
            if (File.filename.endswith('.xlsx')) or (File.filename.endswith('.xlsx')):
                data = pd.read_excel(filepath)
            elif File.filename.endswith('.csv'):
                data = pd.read_csv(filepath,encoding='ISO-8859-1')
            data1 = data.head(5).to_dict(orient='list')
            cur.execute("""INSERT INTO FILE_PATH_LIST(SESSION_ID,USERNAME,FILE_PATH,SAMPLE_DATA)VALUES(:0,:1,:2,:3)""",
            (session_id,user_name,filepath,str(data1)))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(e)
            return {"message": "There was an error processing the file. please try again later"}
        finally:
            File.file.close()        
    print(session_id)
    html_content = """
    <div class="pilog-answer">
        <p class="pilog-answer-summary">{}</p>
    </div>"""
    if session_id is None:
        return 'Session Id not generated'
    conn = get_connection()
    cur = conn.cursor()
    usage_info = get_user_token_and_credit_info(conn, user_name)

    if usage_info["credits_left"] <= 0:
        cur.close()
        conn.close()
        return JSONResponse(
            {
                "answer": "You have insufficient credits. Please recharge to continue.",
                "usage": usage_info,
            },
            status_code=200,
        )
    cur.close()
    conn.close()

    chat_history = get_chat_history(session_id)
    # print('data convertion recived')

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    available_files = get_files_from_folder(DOCUMENT_FOLDER)
    
    files_message = {
        "role": "user",
        "content": json.dumps(available_files, indent=2)
    }
    # try:
        # IMPORTANT CHANGE: using `data=` (form) instead of `json=`
    json_format = False
    file_exten = {'excel':'xlsx','csv':'csv','json':'json'}
    input_tokens = count_tokens(question, model_ISL0)

    if len(chat_history)>0:
        # resp = await client.post(
        #     DOCS_CHAT_URL,
        #     data={"question": question,'chat_history':chat_history},
        #     headers={"Content-Type": "application/x-www-form-urlencoded"},
        # )
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT SAMPLE_DATA,CLASSIFICATION FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
        sampledata = cur.fetchone()
        if (sampledata) and sampledata[1]!='Done':
            category,res = get_response(model_ISL0,effective_question,files_message,chat_history,role,sampledata[0].read())
        else:
            category,res = get_response(model_ISL0,effective_question,files_message,chat_history,role)
            # ================= OUTPUT TOKEN COUNT (NEW) =================
        output_tokens = count_tokens(res, model_ISL0)
        total_tokens = input_tokens + output_tokens

        # ================= UPDATE TOKENS (NEW) =================
        update_user_tokens(conn, user_name, total_tokens)

        # ================= REFRESH USAGE (NEW) =================
        usage_info = get_user_token_and_credit_info(conn, user_name)

        cur.close()
        conn.close()
        try:
            print('try entered')
            parsed_output = json.loads(res)
            selected_files = parsed_output.get("File")
            if selected_files == "You are asked document not found in our record":
                    print('get in second if')
                    return JSONResponse(
                        {"answer": "Please Provide Correct File Name."}
                    )
            
            # if selected_files == 'File':
            if isinstance(selected_files, str):
                selected_files = [selected_files]

            previews = []

            for file_name in selected_files:
                # print('file -- name', file_name)
                file_name = file_name.strip()
                file_path = os.path.join(DOCUMENT_FOLDER,file_name)
                print('file_name',file_name)
                print('file 90 path',file_path)

                if os.path.isfile(file_path):
                    # file_format = os.path.splitext(file_name)[1].replace(".", "").lower()
                    print('file_name',file_name)
                    file_format = os.path.splitext(file_name)[-1].lstrip(".").lower()
                    print(file_format)
                    previews.append(create_download_link_html(file_name, file_format))

            if len(previews) == 1:
                # print(previews)
                return JSONResponse(
                    {    
                        "answer": "Download the Below File",
                        "preview_html": previews[0]
                    }
                )
            else:
                return JSONResponse(
                    {
                        "answer": "Select the Required File From the Below List",
                        "preview_html": "<br/>".join(previews)
                    }
                )
        except:
            print('except entered')
            pass

        if (res.startswith('{')) and (category!='Data Harmonisation'):
            if category=='Project Plan File':
                saved = save_project_plans(res)
                if saved:
                    res_new = eval(res)
                    file_name = res_new['file_name']
                    file_preview = create_download_link_html(file_name,res_new['format'].lower())
                    json_format = True
                    resp = {'answer':html_content.format(res_new['message']),'preview_html':file_preview}
                else:
                    resp = {'answer':"We are having trouble to generate the project plans right now! Please try again after sometime."}
            else:
                res_new = eval(res)
                file_name = res_new['file_name']
                file_preview = create_download_link_html(file_name,res_new['format'].lower())
                export_data(res_new)
                resp = {'answer':html_content.format(res_new['message']),'preview_html':file_preview}
                json_format = True
        else:
            if (category=='Data Harmonisation') and (res.startswith('{')):
                message_list = {0:"The harmonisation process has started. Please refer to the Tasks tab for status updates.",
                1:"Your file has been successfully submitted for processing. Monitor progress in the Tasks tab.",
                2:"Data harmonisation is currently in progress. Status updates are available in the Tasks tab",
                3:"The task has been queued and is processing. See the Tasks tab for details."}
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT FILE_PATH FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
                file_path = cur.fetchone()
                run_task.delay(file_path[0],res,user_name,'Data Harmonisation',session_id)
                cur.close()
                conn.close()
                resp = {'answer':message_list[random.randint(0,3)]}
            elif (category=='Data Harmonisation') and (not res.startswith('{')):
                conn = get_connection()
                cur = conn.cursor()                
                cur.execute("UPDATE FILE_PATH_LIST SET CLASSIFICATION=:0 WHERE SESSION_ID=:1 AND USERNAME=:2",('Done',session_id,user_name))          
                resp = {'answer':res}
                conn.commit()
                cur.close()
                conn.close()
            elif (category=='Data Insights') and (res==''):
                message_list = {
                    0: "Insight generation has started for your submitted file. Check the Tasks tab for progress and updates.",
                    1: "Your file has been successfully processed. View the Tasks tab to explore generated insights and findings.",
                    2: "Insights are currently being generated from your data. Track progress and updates in the Tasks tab.",
                    3: "Your file is queued for insight generation. Visit the Tasks tab to monitor status updates."
                }
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT FILE_PATH FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
                file_path = cur.fetchone()
                run_task.delay(file_path[0],res,user_name,'Data Insights',session_id)
                cur.close()
                conn.close()
                resp = {'answer':message_list[random.randint(0,3)]}                
            else:
                resp = {'answer':res}
    else:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT SAMPLE_DATA FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
        sampledata = cur.fetchone()
        if sampledata:
            category,res = get_response(model_ISL0,effective_question,files_message,[],role,sampledata[0].read())
        else:
            category,res = get_response(model_ISL0,effective_question,files_message,[],role)
    # ================= OUTPUT TOKEN COUNT (NEW) =================
        output_tokens = count_tokens(res, model_ISL0)
        total_tokens = input_tokens + output_tokens

        # ================= UPDATE TOKENS (NEW) =================
        update_user_tokens(conn, user_name, total_tokens)

        # ================= REFRESH USAGE (NEW) =================
        usage_info = get_user_token_and_credit_info(conn, user_name)
        cur.close()
        conn.close()
        try:
            print('try entered')
            parsed_output = json.loads(res)
            selected_files = parsed_output.get("File")
            if selected_files == "You are asked document not found in our record":
                    print('get in second if')
                    return JSONResponse(
                        {"answer": "Please Provide Correct File Name."}
                    )
            
            # if selected_files == 'File':
            if isinstance(selected_files, str):
                selected_files = [selected_files]

            previews = []

            for file_name in selected_files:
                # print('file -- name', file_name)
                file_name = file_name.strip()
                file_path = os.path.join(DOCUMENT_FOLDER,file_name)
                print('file_name',file_name)
                print('file 90 path',file_path)

                if os.path.isfile(file_path):
                    # file_format = os.path.splitext(file_name)[1].replace(".", "").lower()
                    print('file_name',file_name)
                    file_format = os.path.splitext(file_name)[-1].lstrip(".").lower()
                    print(file_format)
                    previews.append(create_download_link_html(file_name, file_format))

            if len(previews) == 1:
                # print(previews)
                return JSONResponse(
                    {    
                        "answer": "Download the Below File",
                        "preview_html": previews[0]
                    }
                )
            else:
                return JSONResponse(
                    {
                        "answer": "Select the Required File From the Below List",
                        "preview_html": "<br/>".join(previews)
                    }
                )
        except:
            print('except entered')
            pass

        if (res.startswith('{')) and (category!='Data Harmonisation'):
            if category=='Project Plan File':
                saved = save_project_plans(res)
                if saved:
                    res_new = eval(res)
                    file_name = res_new['file_name']
                    file_preview = create_download_link_html(file_name,res_new['format'].lower())
                    json_format = True
                    resp = {'answer':html_content.format(res_new['message']),'preview_html':file_preview}
                else:
                    resp = {'answer':"We are having trouble to generate the project plans right now! Please try again after sometime."}
            else:
                res_new = eval(res)
                file_name = res_new['file_name']
                file_preview = create_download_link_html(file_name, res_new['format'].lower())
                export_data(res_new)
                resp = {'answer':html_content.format(res_new['message']),'preview_html':file_preview}
                json_format = True
        else:
            if (category=='Data Harmonisation') and (res.startswith('{')):
                message_list = {0:"The harmonisation process has started. Please refer to the Tasks tab for status updates.",
                1:"Your file has been successfully submitted for processing. Monitor progress in the Tasks tab.",
                2:"Data harmonisation is currently in progress. Status updates are available in the Tasks tab",
                3:"The task has been queued and is processing. See the Tasks tab for details."}
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT FILE_PATH FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
                file_path = cur.fetchone()
                run_task.delay(file_path[0],res,user_name,'Data Harmonisation',session_id)
                cur.close()
                conn.close()
                resp = {'answer':message_list[random.randint(0,3)]}
            elif (category=='Data Harmonisation') and (not res.startswith('{')):
                conn = get_connection()
                cur = conn.cursor()                
                cur.execute("UPDATE FILE_PATH_LIST SET CLASSIFICATION=:0 WHERE SESSION_ID=:1 AND USERNAME=:2",('Done',session_id,user_name))          
                resp = {'answer':res}
                conn.commit()
                cur.close()
                conn.close()
            elif (category=='Data Insights') and (res==''):
                message_list = {
                    0: "Insight generation has started for your submitted file. Check the Tasks tab for progress and updates.",
                    1: "Your file has been successfully processed. View the Tasks tab to explore generated insights and findings.",
                    2: "Insights are currently being generated from your data. Track progress and updates in the Tasks tab.",
                    3: "Your file is queued for insight generation. Visit the Tasks tab to monitor status updates."
                }
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT FILE_PATH FROM FILE_PATH_LIST WHERE SESSION_ID=:0 AND USERNAME=:1 ORDER BY CREATE_DATE DESC",(session_id,user_name))          
                file_path = cur.fetchone()
                run_task.delay(file_path[0],res,user_name,'Data Insights',session_id)
                cur.close()
                conn.close()
                resp = {'answer':message_list[random.randint(0,3)]}    
            else:
                resp = {'answer':res}
            # resp = await client.post(
            #     DOCS_CHAT_URL,
            #     data={"question": question},
            #     headers={"Content-Type": "application/x-www-form-urlencoded"},
            # )                
    has_table = False

    if isinstance(resp, dict) and 'answer' in resp:
        answer_html = resp['answer']

        # detect <table> in final rendered HTML
        if isinstance(answer_html, str) and re.search(r"<table[\s\S]*?>", answer_html, re.IGNORECASE):
            has_table = True

            # wrap response so frontend can attach copy button (GPT-style)
            resp['answer'] = f"""
            <div class="llm-table-response" data-copyable="true">
                {answer_html}
            </div>
            """
    if correction_banner:
        resp["answer"] = correction_banner + resp["answer"]
    # -----------------------------------------------
    # -------- ChatGPT-style Next Suggestions --------
    next_questions = []

    # Only generate for normal text answers
    if isinstance(resp.get("answer"), str):
        clean_answer = res if isinstance(res, str) else ""

        if len(clean_answer) > 20:
            next_questions = generate_next_questions(
                chat_history=chat_history,
                effective_question=effective_question,
                answer=clean_answer,
                model_name=model_ISL0,
                max_questions=3
            )

    if next_questions:
        print(next_questions)
        resp["suggested_next"] = next_questions
    # ----------------------------------------------
    # add non-breaking metadata flags
    resp['has_table'] = has_table
    resp['copyable'] = has_table
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM SESSION_NAMES WHERE SESSION_ID=:0 AND USER_NAME=:1',(session_id,user_name))
    result = cur.fetchone()
    if result is None:
        title = title_generation(question,model_ISL0)
        cur.execute("INSERT INTO SESSION_NAMES(USER_NAME,SESSION_ID,TITLE)VALUES(:0,:1,:2)",(user_name,session_id,title))
        conn.commit()
    existing_data = get_existing_data(question,conn,'all',session_id)
    existing_data_ = dict(zip(existing_data['QUESTION'],existing_data['AI_RESPONSE']))
    if json_format == True:
        resp_up = {'answer':res}
    else:
        resp_up = resp
    if existing_data.shape[0]>0:
        cur.execute("UPDATE FEEDBACK_ANALYSIS SET AI_RESPONSE=:0 WHERE QUESTION=:1 AND SESSION_ID=:2",(str(eval(existing_data_[question].read())+[resp_up['answer']]),question,session_id))
    else:
        cur.execute("INSERT INTO FEEDBACK_ANALYSIS(QUESTION,AI_RESPONSE,SESSION_ID,USER_NAME)VALUES(:0,:1,:2,:3)",(question,str([resp_up['answer']]),session_id,user_name))
    conn.commit()
    cur.close()
    conn.close()
    resp["usage"] = usage_info
    resp['sessionId'] = session_id
    return JSONResponse(resp)

@app.get('/user_role_details')
def get_user_details():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT NAME,USER_NAME,ROLE FROM PKA_LOGIN")
    columns = [col[0].lower() for col in cur.description]
    columns[1] ='username'
    columns_updated = columns
    rows = [dict(zip(columns_updated, r)) for r in cur.fetchall()]
    
    return rows

@app.post("/user_role_update")
def user_role_update(user_name:str = Form(...),role:str = Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE PKA_LOGIN SET ROLE = :0 WHERE USER_NAME = :1",(role,user_name))
        conn.commit()
        
        return {"message": "Successfully Updated User Role"}
    except Exception as e:
        print(e)
        raise HTTPException(status_code = 404, detail = "Failed to update user role")
    
@app.get("/credits/usage")
def get_current_usage(username: str):
    conn = get_connection()
    usage_info = get_user_token_and_credit_info(conn, username)
    conn.close()
    return usage_info
