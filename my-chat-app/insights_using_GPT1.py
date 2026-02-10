import re
import time
import textwrap
import warnings
import cx_Oracle
import pandas as pd
from tqdm import tqdm
from time import strftime, gmtime
from openai import OpenAI
from datetime import datetime
from deps import get_connection, db_details
from langchain_community.utilities import SQLDatabase

warnings.filterwarnings('ignore')

client = OpenAI(api_key='',base_url='http://207.180.148.74:45100/v1')

def query_correction(res):
    pattren = r'WHERE(?!.*CASE).*?(GROUP BY|ORDER BY|FETCH|$)'
    text = res.upper()
    text = re.sub(r"[\n]",' ',text)
    pattren1 = r"(GROUP BY|ORDER BY|FETCH|WHERE)"
    sub_text = re.search(pattren,text)
    if sub_text:
        sub_text1=sub_text[0]
        sub_text1 = re.sub(pattren1,'',sub_text1).strip()
        sub_text1_lst = re.split(r"\b(AND|OR)\b",sub_text1)
        sub_text1_lst = [i.strip() for i in sub_text1_lst if i not in ['OR','AND']]
        for i in sub_text1_lst:
            if re.search(r"(\w{1,3}\.(\w+)\s*(?:=)\s*\'\w+(\s|\d+|)(\d+|)\'|(\w+)\s*(?:=)\s*\'\w+(\s|\d+|)(\d+|)\')",i):
                print(i)
                i = re.search(r"(\w{1,3}\.(\w+)\s*(?:=)\s*\'\w+(\s|\d+|)(\d+|)\'|(\w+)\s*(?:=)\s*\'\w+(\s|\d+|)(\d+|)\')",i)[0]
                i = re.sub(r"[\(\)]",'',i)
                print(i)
                s1 = i.replace("'","'%")  
                s1 = s1.replace("=","LIKE")
                s1 = s1[:-2]+"%'"
                s1 = '('+i+' OR '+s1+')'
                text = re.sub(i,s1,text)
    sub_text = re.search(pattren,text)
    if sub_text:
        sub_text1=sub_text[0]
        sub_text1 = re.sub(pattren1,'',sub_text1).strip()
        pattrens_ = {" NOT IN ('":r"(\w{1,3}\.(\w+)\s*(?:NOT IN)\s*\(\'|(\w+)\s*(?:NOT IN)\s*\(\')"," IN ('":r"(\w{1,3}\.(\w+)\s*(?<!NOT\s)(?:IN)\s*\(\'|(\w+)\s*(?<!NOT\s)(?:IN)\s*\(\')",
                    " != '":r"(\w{1,3}\.(\w+)\s*(?:!=)\s*\'|(\w+)\s*(?:!=)\s*\')"," = '":r"(\w{1,3}\.(\w+)\s*(?:=)\s*\'|(\w+)\s*(?:=)\s*\')"," LIKE '":r"(\w{1,3}\.(\w+)\s*(?:LIKE)\s*\'|(\w+)\s*(?:LIKE)\s*\')"}
        sub_text1_lst = re.split(r"\b(AND|OR)\b",sub_text1)
        sub_text1_lst = [i.strip() for i in sub_text1_lst if i not in ['OR','AND']]
        for replace_,sub_pattr in pattrens_.items():
            pattrens = {re.search(sub_pattr,i)[0].strip():'UPPER('+re.sub(r"(LIKE\s*\'|=\s*\'|NOT IN\s*\(\'|IN\s*\(\')",'',re.search(sub_pattr,i)[0]).strip()+')'+replace_ for i in sub_text1_lst if re.search(sub_pattr,i)}
            for i,j in pattrens.items():
                text = re.sub(re.escape(i),j,text)
    return text

def question_sql_genration(table_schema,status,data1):
    print("Genrating.....")
    start = time.time()
    query = {}
    input_text = f"""
Your task is to analyze the given table schema from a data analyst’s perspective and generate insightful analytical questions.

Instructions:
- Carefully examine the table schema and identify important columns, metrics, dimensions, and date/time fields.
- Ask questions that a data analyst would typically ask to understand the data, uncover insights, and support decision-making.
- Questions may include summaries, comparisons, trends, key findings, diagnostic insights, and recommendations.
- You must generate a maximum of 15 questions (this is a strict rule).
- Each question must be mapped to one or more of the following categories only:
  - Summary
  - Key Findings
  - Trends
  - Reasons & Insights
  - Recommendations
- A question may belong to multiple categories if applicable.

Chart & Axis Rules (STRICT):
- For each question, suggest one or more suitable chart types based on common React + JavaScript charting libraries.
- Chart suggestions must be ordered from most suitable to least suitable.
- For each question, you MUST provide explicit axis bindings for the primary chart (the first chart suggestion).
- Axis bindings must reference actual column names from the table schema.
- Do NOT invent columns that are not present in the schema.
- The X-axis must be a categorical or date/time column.
- The Y-axis must be a numeric column and MUST include an aggregation method.
- Axis labels must be human-readable and meaningful (not raw column names).

Allowed chart types only:
- bar
- line
- area
- pie
- stacked_bar
- table

Allowed aggregation values only:
- sum
- avg
- count
- min
- max

Allowed time granularities only (use only if applicable):
- year
- quarter
- month
- day

Output Format Rules (STRICT):
- The output must be valid JSON only.
- Do not include markdown, comments, explanations, numbering, or any extra text.
- The JSON structure must follow this exact schema:

{{
  "questions": [
    {{
      "question": "<analytical question>",
      "categories": ["<Category1>", "<Category2>"],
      "chart_suggestions": ["<chart_type1>", "<chart_type2>"],
      "chart_metadata": {{
        "xAxis": {{
          "column": "<column_name_from_schema>",
          "granularity": "<year|quarter|month|day>",
          "label": "<human-readable x-axis label>"
        }},
        "yAxis": {{
          "column": "<numeric_column_name_from_schema>",
          "aggregation": "<sum|avg|count|min|max>",
          "label": "<human-readable y-axis label>"
        }}
      }}
    }}
  ]
}}

Table Schema:
{table_schema}

    """
    if status==True:
        input_text1 = f"""
Your task is to analyze the given table schema and sample data from a data analyst’s perspective and generate insightful, time-based analytical questions.

Instructions:
- Carefully examine the table schema and the provided data (enclosed in backticks).
- Identify all date/time-related columns and numeric metrics.
- Determine the available time range (years, months, periods) strictly from the provided data.
- Generate questions that focus specifically on time-based analysis, including:
  - Trends over time
  - Year-over-year or month-over-month comparisons
  - Seasonality and recurring patterns
  - Growth or decline across periods
- If the data indicates specific available years or periods, restrict questions to only those ranges.
- You must generate a maximum of 15 questions (this is a strict rule).
- Each question must be mapped to one or more of the following categories only:
  - Summary
  - Key Findings
  - Trends
  - Reasons & Insights
  - Recommendations
- A question may belong to multiple categories if applicable.

Chart & Axis Rules (STRICT):
- For each question, suggest one or more suitable chart types based on common React + JavaScript charting libraries.
- Chart suggestions must be ordered from most suitable to least suitable.
- For each question, you MUST provide explicit axis bindings for the primary chart (first chart suggestion).
- Axis bindings must reference actual column names from the table schema.
- Do NOT invent columns that are not present in the schema.
- The X-axis must typically be a date/time or categorical column.
- The Y-axis must be a numeric column and MUST include an aggregation method.
- Axis labels must be human-readable and meaningful (not raw column names).

Allowed chart types only:
- bar
- line
- area
- pie
- stacked_bar
- table

Allowed aggregation values only:
- sum
- avg
- count
- min
- max

Allowed time granularities only:
- year
- quarter
- month
- day

Output Format Rules (STRICT):
- The output must be valid JSON only.
- Do not include markdown, comments, explanations, numbering, or any extra text.
- The JSON structure must follow this exact schema:

{{
  "questions": [
    {{
      "question": "<time-based analytical question>",
      "categories": ["<Category1>", "<Category2>"],
      "chart_suggestions": ["<chart_type1>", "<chart_type2>"],
      "chart_metadata": {{
        "xAxis": {{
          "column": "<column_name_from_schema>",
          "granularity": "<year|quarter|month|day>",
          "label": "<human-readable x-axis label>"
        }},
        "yAxis": {{
          "column": "<numeric_column_name_from_schema>",
          "aggregation": "<sum|avg|count|min|max>",
          "label": "<human-readable y-axis label>"
        }}
      }}
    }}
  ]
}}

Table Schema:
`{table_schema}`

Data:
`{data1}`
        """
    res = client.chat.completions.create(
        model="gpt-oss-120b",
        temperature = 0.0,
        messages=[
                {"role": "system", "content": '''You are a helpful and wonderful assistant.'''},
                {"role": "user", "content": f"""{input_text}"""},
        ]
        
        )

    print("Genrating Questions completed:",strftime("%H:%M:%S", gmtime(time.time()-start)))
    res = res.choices[0].message.content
    # print(res)
    # ques = [k for k in res.split('\n') if (k!='')and(k.strip().endswith('?'))]
    # ques = [re.sub(r"\d+\.",'',i).strip() for i in ques if re.search(r'data types|data type|length|correlation',i.lower()) is None]
    # print(ques)
    ques = eval(res)
    if status==True:
        res1 = client.chat.completions.create(
        model="gpt-oss-120b",
        temperature = 0.0,
        messages=[{"role": "system", "content": '''You are a helpful and wonderful assistant.'''},
                {"role": "user", "content": f"""{input_text1}"""}])
        res1 = res1.choices[0].message.content
        # ques2 = [k for k in res1.split('\n') if (k!='')and(k.endswith('?'))]
        ques2 = eval(res1)
        ques.update(ques2)
    # ques1 = []
    # [ques1.append(i) for i in ques if i not in ques1]

    return ques

def run_inference(question, table_meta_data):

    request = client.chat.completions.create(
        model="gpt-oss-120b",
        temperature = 0.0,
        messages=[
                {"role": "system", "content": '''You are a helpful and wonderful assistant.You are a Data Analysis agent skilled in writing Oracle SQL queries to extract data based on user questions.
    Your role is to generate precise queries using the provided schema, allowing the user to analyze the data and gain insights.
    Output should have only query do not include any explanations or introductory phrases.'''},
                {"role": "user", "content": f"""Schema:{table_meta_data}
                Question:'{question}'"""}])
    generated_query = request.choices[0].message.content
    generated_query = re.sub(r'(;$|;```$|```sql|;|```)','',generated_query).strip()
    if re.search(r'LIMIT(\s)',generated_query):
        generated_query = re.sub(r'LIMIT(\s)',' FETCH FIRST ',generated_query)+' ROWS ONLY'
    quarter_replace = re.search(r'EXTRACT\(QUARTER.*?\)',generated_query)
    if quarter_replace:
        col_name = re.search(r'(?<=FROM\s)[A-Za-z0-9_]+(?=\))',quarter_replace[0])[0]
        replace_val = f"TO_CHAR({col_name}, 'Q')"
        generated_query = re.sub(fr"{re.escape(quarter_replace[0])}",replace_val,generated_query)
    generated_query = query_correction(generated_query)
    # print(generated_query)
    return generated_query

def sql_query_genration(table_schema,data1,status):
    query = []
    ques1 = question_sql_genration(table_schema,status,data1)
    for i in tqdm(ques1['questions'],total=len(ques1['questions'])):
        # print(i)
        res = run_inference(i['question'],table_schema)
        i['query'] = res
        query.append(i)
    return query

def split_text(text, max_len=4096):
    # Split into paragraphs or sentences if possible
    paragraphs = textwrap.wrap(text, max_len, break_long_words=False, replace_whitespace=False)
    return paragraphs

def Insights_generation(json_result,table_schema,data_):
    start = time.time()
    list_ = []
    for i,j in tqdm(json_result.items(),total=len(json_result)):

        if (re.search('months',i.lower())is None)and(j[1]>1):
            input_text = f"""You are provided with a dictionary containing data extracted from a table, along with the schema of that table.
            Use the schema to understand the structure and meaning of the data. Analyze the provided data and generate a detail summary of data in a paragraph with values, focusing on key insights, trends, or notable information.
            Output should contain only summary do not include any explanations or introductory phrases.
            Schema:
            {table_schema}
            Data:
            {j[0]}"""
            request = client.chat.completions.create(
                model="gpt-oss-120b",
                temperature = 0.0,
                messages=[
                        {"role": "system", "content": '''You are a helpful and wonderful assistant.'''},
                        {"role": "user", "content": f"""{input_text}"""}])
            res = request.choices[0].message.content
            if ':' in res:
                res = res.split(':',maxsplit=1)[1]
        else:
            # i = re.sub(r"(^how is|^why|^where|^when|^what is|^who is|^how|^what)",i.upper())
            input_text = f"""Your task is to create an engaging audio script that clearly explains and summarizes the data based on question.
            I will provide a question and a dictionary of data related to the question asked by the user.
            Sometimes, the data could be a direct answer, which you can simply convert into plain text. 
            Output should contain only audio script do not include any introductory phrases (or) explanations
            `Question: {i}`
            `Data:{j[0]}`"""
            request = client.chat.completions.create(
                model="gpt-oss-120b",
                temperature = 0.0,
                messages=[
                        {"role": "system", "content": '''You are a helpful and wonderful assistant.'''},
                        {"role": "user", "content": f"""{input_text}"""}])
            res = request.choices[0].message.content
            res = re.sub(r'Here is a summary of the data in plain text:|Here is the audio script:','',res)
        list_.append(res)
    print("Insights Completed",strftime("%H:%M:%S", gmtime(time.time()-start)))
    print('\n')

    input_text = f"""Task:
        Analyze the provided data points and generate structured insights suitable for display in the iMirai Tasks insights modal.

        Input:
        {list_}

        Output Rules:
        - Use the section headers exactly as defined below.
        - Keep each section concise and UI-friendly.
        - Prefer bullet points over paragraphs.
        - Do not include unnecessary explanations or filler text.

        Sections (Render only if data exists):

        ### Summary
        - Brief overview of what the data represents.
        - Summarize the overall outcome or condition in 1–2 lines.

        ### Key Findings
        - List the most important observations derived directly from the data.
        - Include increases, decreases, irregularities, or notable values.

        ### Trends
        - Include this section only if clear trends exist.
        - Describe the trend direction (upward, downward, stable).
        - Avoid vague or assumed trends.

        ### Reasons & Insights
        - Explain *why* the findings or trends occurred based only on the provided data.
        - No external assumptions or generic reasoning.

        ### Recommendations
        - Provide clear, actionable recommendations derived strictly from the above insights.
        - Each recommendation must directly map to a finding or trend.
        - Avoid generic advice or best-practice statements.

        **Return output strictly in valid JSON format using the following schema:**

        {{
        "summary": "string",
        "key_findings": ["string"],
        "trends": ["string"],
        "reasons_insights": ["string"],
        "recommendations": ["string"]
        }}

        Rules:
        - Use empty arrays if a section has no data.
        - Do not include markdown symbols (###, -, **).
        - Do not include any extra text outside JSON.
        - Do NOT mention audio, narration, or storytelling.
        - Do NOT include introductions or conclusions.
        """
    request = client.chat.completions.create(
        model="gpt-oss-120b",
        temperature = 0.0,
        messages=[
                {"role": "system", "content": '''You are a helpful and wonderful assistant.'''},
                {"role": "user", "content": f"""{input_text}"""}],max_tokens = 50000)
    res = request.choices[0].message.content
    res = re.sub(r'(Here is a summary of the data in plain text\:|Here is a summary of the data\:|Here is a brief summary of the data\:|Intro|intro|duction|\bduction to the Data\b)','',res)
    res = re.sub(r'((\s|)\[pause.*?\]|\.{3,20})','.',res)
    res1 = re.sub(r"(\s{2,10}|Introduction|Note\:.*(\s|$)|This script.*$)",' ',res).strip()
    # print(res1)
    return res1

def convert_date(date_str):
    patterns = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%m-%d-%Y', '%d-%m-%Y', '%Y.%m.%d', '%m.%d.%Y', '%d.%m.%Y', '%Y/%d/%m', '%d/%m/%y', '%m/%d/%y', '%y/%m/%d', '%m-%d-%y', '%d-%m-%y', '%y.%m.%d', '%m.%d.%y', '%d.%m.%y', '%y/%d/%m', '%d/%m/%Y %H:%M:%S', '%Y/%m/%d %H:%M:%S', '%m/%d/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%m-%d-%Y %H:%M:%S', '%d-%m-%Y %H:%M:%S', '%d/%m/%y %H:%M:%S', '%m/%d/%y %H:%M:%S', '%y/%m/%d %H:%M:%S', '%m-%d-%y %H:%M:%S', '%d-%m-%y %H:%M:%S', '%Y.%m.%d %H:%M:%S', '%m.%d.%Y %H:%M:%S', '%d.%m.%Y %H:%M:%S', '%Y/%d/%m %H:%M:%S', '%d/%m/%Y %H:%M', '%Y/%m/%d %H:%M', '%m/%d/%Y %H:%M', '%Y-%m-%d %H:%M', '%m-%d-%Y %H:%M', '%d-%m-%Y %H:%M', '%d/%m/%y %H:%M', '%m/%d/%y %H:%M', '%y/%m/%d %H:%M', '%m-%d-%y %H:%M', '%d-%m-%y %H:%M', '%Y.%m.%d %H:%M', '%m.%d.%Y %H:%M', '%d.%m.%Y %H:%M', '%Y/%d/%m %H:%M', '%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%d-%m-%Y', '%Y.%m.%d', '%m.%d.%Y', '%d.%m.%Y', '%Y/%d/%m', '%d/%m/%y', '%m/%d/%y', '%y/%m/%d', '%m-%d-%y', '%d-%m-%y', '%y.%m.%d', '%m.%d.%y', '%d.%m.%y', '%y/%d/%m', '%d/%m/%Y %I:%M:%S %p', '%Y/%m/%d %I:%M:%S %p', '%m/%d/%Y %I:%M:%S %p', '%Y-%m-%d %I:%M:%S %p', '%m-%d-%Y %I:%M:%S %p', '%d-%m-%Y %I:%M:%S %p', '%d/%m/%y %I:%M:%S %p', '%m/%d/%y %I:%M:%S %p', '%y/%m/%d %I:%M:%S %p', '%m-%d-%y %I:%M:%S %p', '%d-%m-%y %I:%M:%S %p', '%Y.%m.%d %I:%M:%S %p', '%m.%d.%Y %I:%M:%S %p', '%d.%m.%Y %I:%M:%S %p', '%Y/%d/%m %I:%M:%S %p', '%d/%m/%Y %I:%M %p', '%Y/%m/%d %I:%M %p', '%m/%d/%Y %I:%M %p', '%Y-%m-%d %I:%M %p', '%m-%d-%Y %I:%M %p', '%d-%m-%Y %I:%M %p', '%d/%m/%y %I:%M %p', '%m/%d/%y %I:%M %p', '%y/%m/%d %I:%M %p', '%m-%d-%y %I:%M %p', '%d-%m-%y %I:%M %p', '%Y.%m.%d %I:%M %p', '%m.%d.%Y %I:%M %p', '%d.%m.%Y %I:%M %p', '%Y/%d/%m %I:%M %p', '%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%d-%m-%Y', '%Y.%m.%d', '%m.%d.%Y', '%d.%m.%Y', '%Y/%d/%m', '%d/%m/%y', '%m/%d/%y', '%y/%m/%d', '%m-%d-%y', '%d-%m-%y', '%y.%m.%d', '%m.%d.%y', '%d.%m.%y', '%y/%d/%m', '%d/%m/%Y %H:%M:%S %Z', '%Y/%m/%d %H:%M:%S %Z', '%m/%d/%Y %H:%M:%S %Z', '%Y-%m-%d %H:%M:%S %Z', '%m-%d-%Y %H:%M:%S %Z', '%d-%m-%Y %H:%M:%S %Z', '%d/%m/%y %H:%M:%S %Z', '%m/%d/%y %H:%M:%S %Z', '%y/%m/%d %H:%M:%S %Z', '%m-%d-%y %H:%M:%S %Z', '%d-%m-%y %H:%M:%S %Z', '%Y.%m.%d %H:%M:%S %Z', '%m.%d.%Y %H:%M:%S %Z', '%d.%m.%Y %H:%M:%S %Z', '%Y/%d/%m %H:%M:%S %Z', '%d/%m/%Y %H:%M %Z', '%Y/%m/%d %H:%M %Z', '%m/%d/%Y %H:%M %Z', '%Y-%m-%d %H:%M %Z', '%m-%d-%Y %H:%M %Z', '%d-%m-%Y %H:%M %Z', '%d/%m/%y %H:%M %Z', '%m/%d/%y %H:%M %Z', '%y/%m/%d %H:%M %Z', '%m-%d-%y %H:%M %Z', '%d-%m-%y %H:%M %Z', '%Y.%m.%d %H:%M %Z', '%m.%d.%Y %H:%M %Z', '%d.%m.%Y %H:%M %Z', '%Y/%d/%m %H:%M %Z', '%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%d-%m-%Y', '%Y.%m.%d', '%m.%d.%Y', '%d.%m.%Y', '%Y/%d/%m', '%d/%m/%y', '%m/%d/%y', '%y/%m/%d', '%m-%d-%y', '%d-%m-%y', '%y.%m.%d', '%m.%d.%y', '%d.%m.%y', '%y/%d/%m']
    for pattern in patterns:
        try:
            date_obj = datetime.strptime(str(date_str), pattern)
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None
def auto_convert_date(df):
    df1 = df.select_dtypes(include='object')
    for col in df1.columns:
        dat = [] 
        for i in df1[col]:
            temp = convert_date(i)
            if temp is None:
                break
            else:
                dat.append(temp)
        dat = [i for i in dat if i is not None]
        # print(col,len(dat),len(df1[col]))
        if len(dat)==len(df1[col]):
            df[col]=dat
            df[col] = df[col].astype('datetime64[ns]')
    return df
def convert_numeric(data):
    for col in data.select_dtypes(include='object').columns:
        converted = pd.to_numeric(data[col], errors='coerce')
        ratio = converted.notna().mean()
        if ratio > 0.9:
            data[col] = converted
            data[col].fillna(0.0,inplace=True)
        else:
            data[col].fillna('',inplace=True)
    for col in data.select_dtypes(include=['int64','float64']).columns:
        data[col].fillna(0.0,inplace=True)
    return data
def load_data(data_table,table_name,user_name,content_id):
    table_name = table_name.upper()+'_TEMP'
    conn = get_connection()
    USER_NAME,PASSWORD,HOST,PORT,SERVICE_NAME = db_details()
    cur = conn.cursor()
    insert_data = pd.DataFrame(data_table)
    insert_data.dropna(axis=0,how='all',inplace=True,ignore_index=True)
    create_columns = [re.sub(r'\W+',' ',col).strip() for col in insert_data.columns]
    create_columns = [re.sub(r'\s+','_',col).strip() for col in create_columns]
    insert_data.columns = create_columns
    insert_data = auto_convert_date(insert_data)
    insert_data = convert_numeric(insert_data)
    original_types = insert_data.dtypes.to_dict()
    types = {'int64':'NUMBER','float64':'NUMBER','object':'VARCHAR2(4000)','datetime64[ns]':'DATE'}
    table_columns = ', '.join([f'{'"'+col.upper()+'"'} {types[str(original_types[col])]}' for col in create_columns])
    exists = pd.read_sql(f"SELECT * FROM USER_TAB_COLS WHERE TABLE_NAME='{table_name}'",conn)
    if exists.shape[0]==0:
        create_query = f"""CREATE TABLE {table_name} ({table_columns})"""
        print(create_query)
        cur.execute(create_query)
        conn.commit()
    else:
        cur.execute(f"DROP TABLE {table_name}")
        conn.commit()
        create_query = f"""CREATE TABLE {table_name} ({table_columns})"""
        print(create_query)
        cur.execute(create_query)
        conn.commit()
    insert_values = list(insert_data.itertuples(index=False, name=None))
    query = f"""INSERT INTO {table_name}({','.join(['"'+i.upper()+'"' for i in list(insert_data.columns)])})VALUES({','.join([f':{_}' for _ in range(len(original_types))])})"""
    # print(query)
    cur.executemany(query,insert_values)
    cur.execute("""INSERT INTO USERS_TASKS_LIST(TASK_ID,USER_NAME,TASK_NAME,TASK_TYPE,
    DATA_LOADED,DATA_ANALYSED,DATA_INSIGHTS_GENERATED,STATUS)VALUES(:0,:1,:2,:3,:4,:5,:6,:7)""",(content_id,user_name,
    'Insights','Insights Task','Completed','In Progress','In Progress','In Progress'))
    conn.commit()
    cur.close()
    conn.close()

    new_res = {}
    db = SQLDatabase.from_uri(f'oracle+oracledb://{USER_NAME}:{PASSWORD}@{HOST}:{PORT}/?service_name={SERVICE_NAME}',include_tables=[table_name.lower()])
    schema_ = re.sub(r'(\n|\t)','',db.table_info.split('/*')[0])

    conn = get_connection()
    cur = conn.cursor()
    time_sheet = pd.read_sql(f"SELECT * FROM {table_name}",conn)
    if 'AUDIT_ID' in time_sheet.columns:
        time_sheet.drop('AUDIT_ID',axis=1,inplace=True)
    time_sheet = auto_convert_date(time_sheet)
    object_cols = list(time_sheet.select_dtypes(include='datetime64[ns]').columns)
    Status = False
    data1 = None
    if len(object_cols)>0:
        time_sheet['YEAR'] = time_sheet[object_cols[0]].dt.year
        time_sheet['Quarter'] = time_sheet[object_cols[0]].dt.quarter
        Status = True
        data1 = {i:list(time_sheet[i].unique()) for i in ['YEAR','Quarter']}
    sql_q = sql_query_genration(schema_,data1,Status)
    # print(sql_q)
    charts_data = []
    for j in sql_q['questions']:
        
        try:
            data = pd.read_sql(j['query'],conn)
            data.dropna(axis=1,how='all',inplace=True)
            if len(data)==0:
                print(data.shape)
            if (data.shape[0]>0)and(data.shape[0]<200):
                data = {k:(list(data[k])) for k in data.columns}
                new_res.update({j['question']:(data,data.shape[0])})
                j['data'] = data
                charts_data.append(j)
        except Exception as e:
            # print(i,e)
            pass
    cur.execute("UPDATE USERS_TASKS_LIST SET DATA_ANALYSED=:0,CHARTS_DATA=:1 WHERE TASK_ID=:2",
    ('Completed',str(charts_data),content_id))
    conn.commit()
    cur.close()
    conn.close()

    conn = get_connection()
    cursor = conn.cursor()
    llm_insights = Insights_generation(new_res,schema_,data_table)
    cursor.execute("UPDATE USERS_TASKS_LIST SET DATA_INSIGHTS_GENERATED=:0,STATUS=:1,INSIGHTS_DATA=:2 WHERE TASK_ID=:3",
    ('Completed','Completed',llm_insights,content_id))
    cursor.execute(f"DROP TABLE {table_name}")
    conn.commit()
    cursor.close()
    conn.close()
    # print(llm_insights)
    return llm_insights

