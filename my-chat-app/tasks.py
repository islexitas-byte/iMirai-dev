import re
import os
import uuid
import pandas as pd
from tqdm import tqdm
from celery_app import celery_app
from deps import get_connection
from GPU_CHAR_NEW import names
from insights_using_GPT import load_data
@celery_app.task(bind=True,)
def run_task(self, file_path, columnNames,user_name,taskType,session_id):
    content_id = str(uuid.uuid4())
    if taskType=='Data Harmonisation':
        columnNames = eval(columnNames)
        df = pd.read_excel(file_path)
        df = df[columnNames['columns']]
        print(columnNames)
        if len(columnNames['missing_columns'])==2:
            df['Record No'] = ['M000000'+str(i+1) for i in range(len(df))]
            df['Class'] = ['No Object']*len(df)
            col2 = columnNames['columns']
            df = df[['Record No','Class',col2[0]]]
        elif 'Record No' in columnNames['missing_columns']:
            df['Record No'] = ['M000000'+str(i+1) for i in range(len(df))]
            df = df[['Record No']+columnNames['columns']]
        elif 'Class' in columnNames['missing_columns']:
            df['Class'] = ['No Object']*len(df)
            col2 = columnNames['columns']
            df = df[[col2[0],'Class',col2[1]]]
        df.columns = ['MDRM','Class','LONG_DES']
        df['LONG_DESC1'] = [re.sub(fr"({j}|{'|'.join([re.escape(i.strip()) for i in j.split(',')])})",'',i)for i,j in zip(df['LONG_DES'],df['Class'])]    
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""INSERT INTO USERS_TASKS_LIST(TASK_ID,USER_NAME,TASK_NAME,TASK_TYPE,
        TOTAL_RECORDS,IN_PROGRESS,FAILED,COMPLETED,STATUS)VALUES(:0,:1,:2,:3,:4,:5,:6,:7,:8)""",(content_id,user_name,
        'Data Harmonisation','Harmonisation Task',len(df),len(df),0,0,'In Progress'))
        conn.commit()
        total_data = pd.DataFrame()
        remaining_records = len(df)
        total_records_processed = 0
        failed_records = 0
        for desc,mdrm, cls in tqdm(zip(df['LONG_DES'],df['MDRM'], df['Class']),total=len(df)):
            try:
                ss = names(mdrm,cls,desc)
                ss = ss.loc[ss['PROP_NAME']!='SPECIFICATION'].reset_index(drop=True)
                ss = ss.loc[~ss['PROP_NAME'].isin(list(ss['Class']))].reset_index(drop=True)
                ss = ss.loc[~ss['PROP_VAL'].isin(['YES','PRESENT','PRESENT IN TEXT','NOT PRESENT','N/A (NOT PRESENT IN GIVEN TEXT)','NOT FOUND IN TEXT','(NOT FOUND)',
                                                    '(NOT FOUND IN TEXT','NOT SPECIFIED','N/A (NOT FOUND IN TEXT)','NOT MENTIONED','NONE',''])].reset_index(drop=True)
                # ss = ss.loc[~ss['PROP_VAL'].str.contains(r"(YES|PRESENT|PRESENT IN TEXT|NOT PRESENT|N/A \(NOT PRESENT IN GIVEN TEXT\))")].reset_index(drop=True)
                ss = ss.loc[ss['PROP_VAL']!=''].reset_index(drop=True)
                ss['UOM'].replace('NOT AVAILABLE','',inplace=True)
                ss['UOM'].replace('NOT AVAILABLE'.lower(),'',inplace=True)
                remaining_records-=1
                total_records_processed+=1
                total_data = pd.concat([total_data,ss],ignore_index=True)
                cur.execute("UPDATE USERS_TASKS_LIST SET IN_PROGRESS=:0,COMPLETED=:1 WHERE TASK_ID=:2",
                (remaining_records,total_records_processed,content_id))
                conn.commit()
            except Exception as e:
                print(e)
                remaining_records-=1
                failed_records+=1
                cur.execute("UPDATE USERS_TASKS_LIST SET IN_PROGRESS=:0,FAILED=:1 WHERE TASK_ID=:2",
                (remaining_records,failed_records,content_id))
                conn.commit()
        cur.execute("UPDATE USERS_TASKS_LIST SET STATUS=:0 WHERE TASK_ID=:1",
        ('Completed',content_id))
        cur.execute(f"DELETE FROM FILE_PATH_LIST WHERE SESSION_ID=:sessionId",sessionId=session_id)
        if os.path.exists(file_path):
            os.remove(file_path)        
        conn.commit()
        # print(total_data)
        total_data.to_excel(os.path.join('Data Harmonisation Results',f'{content_id}.xlsx'),index=False)
    elif taskType=='Data Insights':
        if (file_path.endswith('.xlsx')) or (file_path.endswith('.xls')):
            data = pd.read_excel(file_path)
        elif file_path.endswith('.csv'):
            data = pd.read_csv(file_path,encoding='ISO-8859-1')
        data1 = data.to_dict(orient='records')
        name = file_path.split('\\')[-1].replace('.xlsx','')
        name = re.sub(r'(\W+|\s+)','_',name)
        load_data(data1,name,user_name,content_id,session_id,file_path)
    else:
        print('Unexpected task type please check once ',taskType)