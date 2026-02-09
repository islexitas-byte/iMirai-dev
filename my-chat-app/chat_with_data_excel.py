import warnings
import json
import uvicorn
from openai import OpenAI
from dotenv import load_dotenv
from fastapi import FastAPI, Body, Form
from typing import Dict, Any, Optional
import pandas as pd

load_dotenv()
warnings.filterwarnings("ignore")

def safe_json(obj):
    return json.loads(json.dumps(obj, ensure_ascii=True, default=str))

app = FastAPI(title="Chat with Data (JSON)")

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="http://207.180.148.74:46439/v1",
    timeout=60
)

try:
    model_ISL0 = client.models.list().data[0].id
except Exception as e:
    raise RuntimeError(f"LLM model fetch failed: {e}")


@app.post("/chat_with_data")
async def chat_with_data(
    SESSION_ID: str = Form(...),
    QUESTION: str = Form(...),
    DATA_JSON: str = Form(...)
):
    if not QUESTION or not DATA_JSON:
        return {"ERROR": "QUESTION and DATA_JSON are required"}

    try:
        if isinstance(DATA_JSON, str):
            DATA_JSON = json.loads(DATA_JSON)
    except json.JSONDecodeError:
        return {"ERROR": "DATA_JSON must be valid JSON"}

    # 🔑 NORMALIZE INPUT SHAPE (IMPORTANT)
    if isinstance(DATA_JSON, dict):
        DATA_JSON = pd.DataFrame(DATA_JSON).to_dict(orient="records")

    if not isinstance(DATA_JSON, list) or not DATA_JSON:
        return {"ERROR": "DATA_JSON must be a non-empty list of records"}

    DATA_JSON = safe_json(DATA_JSON)

    columns = list(DATA_JSON[0].keys())


    prompt = f"""
    You are a Python data analyst.

    You are given a pandas DataFrame named df.

    Columns:
    {columns}

    Rules:
    - Return ONLY Python code
    - Store final answer in variable `result`
    - `result` MUST be a number, string, list, or dict
    - NEVER return a DataFrame or Series
    - No prints, no explanations


    Question:
    {QUESTION}
"""


    response = client.chat.completions.create(
        model=model_ISL0,
        messages=[
            {"role": "system", "content": "Answer strictly from JSON data."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    if not response.choices or not response.choices[0].message.content:
        return {"ANSWER": "LLM returned empty response"}
    code = response.choices[0].message.content.strip()
    # code = response.choices[0].message.content.strip()

    if code.startswith("```"):
        code = code.replace("```python", "").replace("```", "").strip()

    print("\n========== GPT GENERATED CODE ==========")
    print(code)
    print("========================================\n")

    df = pd.DataFrame(DATA_JSON)

    local_env = {"df": df}
    exec(code, {}, local_env)
    result = local_env.get("result")

    if hasattr(result, "to_dict"):  # DataFrame or Series
        return {
            "ERROR": "LLM returned a DataFrame. Expected scalar or JSON output."
        }

    return {"ANSWER": safe_json(result)}


    # return {"ANSWER": safe_json(local_env.get("result"))}
    # raw_answer = response.choices[0].message.content

    # try:
    #     return {"ANSWER": json.loads(raw_answer)}
    # except json.JSONDecodeError:
    #     return {"ANSWER": raw_answer}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
