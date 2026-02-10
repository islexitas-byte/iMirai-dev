import re
import json
import warnings
import pandas as pd
from openai import OpenAI
warnings.filterwarnings('ignore')

client = OpenAI(
    api_key='YOUR_API_KEY',
    base_url = "http://207.180.148.74:47112/v1"
)
model_ISL0 = client.models.list().data[1].id
# model_ISL1 = client.models.list().data[2].id
print(client.models.list())

def calculate_string_presence(property_value, full_string):
    """
    Calculate if the required percentage of property_value content is present in full_string.
    Works with any type of strings, not limited to specific formats.
    
    Args:
        property_value (str): The shorter string to look for
        full_string (str): The longer string to search in
        threshold (float): Minimum percentage required (0-100)
    
    Returns:
        tuple: (is_match, match_percentage)
    """
    # Convert to uppercase for case-insensitive matching
    prop = property_value.upper()
    full = full_string.upper()
    
    # Split into words and remove empty strings
    prop_words = [word.strip() for word in prop.split() if word.strip()]
    
    if not prop_words:
        return 0
    
    # Count matches
    matched_words = 0
    total_words = len(prop_words)
    
    for word in prop_words:
        # For each word in property_value, check if it appears in full_string
        if word in full:
            matched_words += 1
    
    # Calculate match percentage
    match_percentage = (matched_words / total_words) * 100
    
    return match_percentage


def prop_chk_fft(des,prop):
#     print(des,prop)
    def pre_process(string):
        string = re.sub(r' +',' ',re.sub('(\d+(\.\d+)?)', r' \1 ', str(string))).strip()
        string = re.sub(r'( \.)(\s|)','',re.sub('([a-zA-Z]+(\.[a-zA-Z]+)?)', r' \1 ', str(string)).strip())
        string = re.sub(r'[\(\);\*\+\\n\?]',' ',string)
        string = re.sub(r' +',' ',string)
        string = re.sub(r'\"','INCH',string)
        return string
    
    x = pre_process(des.upper())
    y = pre_process(prop.upper())
    # z = pre_process(prop_name.upper())
    if ('X' in x) and ('X' in y):
        x = re.sub(r'(\d+(\"|))X(\d+(\"|))', r'\1 X \3', x)
        y = re.sub(r'(\d+(\"|))X(\d+(\"|))', r'\1 X \3', y)
    
    lst = []
    for i in re.split(r'([\s,\/\-\(\)\"\'’\’’#‐=])',y):
        if i not in re.split(r'([\s,\/\-\(\)\"\'’\’’#‐=])',x) and (i!=''):
            lst.append(i)
             
    f_prop = y
    for j in lst:
        p = re.sub(r'\b({})\b'.format(j),'',f_prop)
        f_prop = p
        
    p_lst = []
    for i in f_prop.split():
        if i not in p_lst:
            p_lst.append(i)
    fnl_prop = ' '.join(p_lst).strip()

    if re.search(r'[0-9a-zA-Z]',fnl_prop):
        final_prop = re.sub(r' +',' ',fnl_prop).strip()
        # fft = re.sub(f'{final_prop}','',x).strip()
        return final_prop
       
    else:
        final_prop = re.sub(r' +',' ',re.sub(r'[^0-9a-zA-Z]','',fnl_prop)).strip()
    
        # fft = re.sub(f'{final_prop}','',x).strip()
        return final_prop


def check_fun(regx,val):
#     print(fr'(\b{regx}\b)')
    regx = re.sub(r'(\, |,|\s)',r'\\b|\\b',regx).lower()
#     print(fr'(\b{regx}\b)')
    if re.search(fr'(\b{regx}\b)',str(val.lower())):
        return True
#     elif re.search(fr'(\b{regx}\b)',val1.lower()):
#         return True
    else:
        return False



def remove_class(desc,cls):
    cls_str = '|'.join(re.split(r'[\s,]',cls)).lower()
    desc = re.sub(fr'\b({cls_str})\b','',desc.lower())
    return desc.upper()

def char_val_remove(desc,val,name):
    pattrn_data = pd.read_excel(r'/root/Desktop/Team Python Deployment/Rahul Projects/UOM.xlsx')
    pattrn_data.dropna(axis=0,how='any',inplace=True)
    pattrn = '|'.join([re.escape(str(i)) for i in set(pattrn_data['UOM_ABBR'])])
    # (AMP|POLES|POLE|VAC|VDC|V AC|V DC|IN|INCH|KA|KV|KW|MM|DC|KG|BAR|V|A|P)
    val = str(val).upper()
    vals = '|'.join([re.escape(i)for i in val.split()])
    desc = re.sub(fr'(?<!\d\.)\b{re.escape(val)}\b','',desc)
    val1 = re.sub(r'(?<=(\d|\"))X(?=\d)',' ',val)
    if re.search(re.escape(val1),desc):
        desc = re.sub(fr'(?<!\d\.)\b{re.escape(val1)}\b','',desc)
    desc = re.sub(fr'(?<!\d\.)\b(,|){re.escape(val)}({pattrn})(,|)\b','',desc)
    desc = re.sub(fr'(?<!\d\.)\b({vals}|{name}|{name}:)\b','',desc)
    for i in [' - ','- ',' -']:
        val1 = re.sub(r'\-',i,val)
        if re.search(re.escape(val1),desc):
            desc = re.sub(fr'(?<!\d\.)\b{re.escape(val1)}\b','',desc)
            desc = re.sub(fr'(?<!\d\.)\b{re.escape(val1)}({pattrn})\b','',desc)

    return desc
def add_space(desc):
    pattren = r'(PART NO:|MAKE:|TYPE:|CAPACITY:|POS.NO:|P.NO:|ITEM NO:|DRAWING NO:|DRW NO.|PART NO :|MAKE :|TYPE :|CAPACITY :|POS.NO :|P.NO :|ITEM NO :|DRAWING NO :|DRW NO.)'
    # pattrn_data = pd.read_excel(r'/root/Desktop/Team Python Deployment/Rahul Projects/REFE_VARI.xlsx')
    # pattrn_data.dropna(axis=0,how='any',inplace=True)
    # pattren = '|'.join([re.escape(str(i)) for i in set(pattrn_data['Varient form'])])
    word = re.findall(pattren,desc)
    if len(word)>0:
        for i in word:
            desc = re.sub(i,' '+i,desc)
    return desc

######################################################################################

# ADDED for DATA CLEANING

# Function to filter rows based on CLASS words
def class_clean(group):
    class_words = set()
    
    # Collect words from CLASS column (split by ', ' and spaces)
    for cls in group["Class"].unique():
        class_words.update(re.split(r"[ ,]+", cls))
    
    # Filter out rows where PROP_VAL contains any CLASS word
    def contains_class_word(value):
        return any(re.search(rf"\b{word}\b", value, flags=re.IGNORECASE) for word in class_words)
    
    return group[~group["PROP_VAL"].apply(contains_class_word)]


# Generalized solution to drop duplicates
def remove_duplicates(group):
    # Drop duplicates based on PROP_NAME-PROP_VAL, keeping the first
    group = group.drop_duplicates(subset=["PROP_NAME", "PROP_VAL"], keep="last")
    # Identify duplicates by PROP_VAL across PROP_NAMEs and retain only the first occurrence
    group = group[~group.duplicated(subset=["PROP_VAL"], keep="last")]
    return group

def complete_data_clean(total_data):
    total_data.fillna('',inplace=True)
    total_data['PROP_VAL'] = total_data['PROP_VAL'].astype(str)
    total_data['PROP_NAME'] = total_data['PROP_NAME'].str.upper()
    total_data['PROP_VAL'] = total_data['PROP_VAL'].str.upper()
    #Changing Type Values If they Have Any Numerics
    remove_index = list(total_data.loc[(total_data['PROP_NAME']=='TYPE')|(total_data['PROP_NAME']=='APPLICATION')].loc[total_data['PROP_VAL'].str.contains(r"[\d+]",na=False)].index)
    for i in remove_index:
        check = re.search(r'^(?=.*[a-zA-Z])(?=.*\d)[^\,]+$',total_data['PROP_VAL'][i])
        if check:
            total_data.loc[i:i,['PROP_NAME']]='MODEL/MACHINE NO'
        else:
            # total_data.drop(i, inplace=True)  # Remove the row\
            total_data.loc[i:i,['PROP_NAME']]='ADDITIONAL INFORMATION'
            
    # Apply function group-wise
    total_data = total_data.groupby("MDRM", group_keys=False).apply(class_clean)

    total_data.drop_duplicates(inplace=True)

    total_data = total_data.groupby("MDRM").apply(remove_duplicates).reset_index(drop=True)

    result = (
        total_data.groupby(["MDRM", "PROP_NAME"], as_index=False)
        .agg({
            "PROP_VAL": lambda x: ", ".join(x),  # Combine PROP_VAL with commas
            "LONG_DES": "first",                   # Retain the first LONG_DES
            "Class": "first",                         # Retain the first CLASS
            "UOM": "first",                   # Retain the first UOM
            # "MODEL":"first"
        })
    )
    # Ensure the final column order
    total_data = result[[
        "MDRM", "Class", "LONG_DES",  "PROP_NAME", "PROP_VAL", "UOM"
    ]]
    return total_data


##################################################################################################


def generate_response(model_name,msg):
    response = client.chat.completions.create(
    model=model_name,
    messages = [
            {"role": "user", "content": """You are a Senior Product Catalogue Engineer. You are given a product description and you need to create a product catalogue for the product.
                    You need to provide CLASS, Property names, Property Values, and Data Type if Found in the Description.
                    The output should be in the following format:
                    [
                        {{
                            "CLASS": "CLASS_VALUE",
                            "PROPERTY_NAME": [list of PROPERTY_NAME's],
                            "PROPERTY_VALUE": [list of PROPERTY_VALUE's related to PROPERTY_NAME's],
                            "PROPERTY_UOM": [list of PROPERTY_UOM's related to PROPERTY_NAME and PROPERTY_VALUE's],
                        }}
                    ]
                    Instructions:
                    1. Give the details like PROPERTY_NAME, PROPERTY_VALUE, PROPERTY_UOM only if found in the Product description.
                    2. Do not give any explanations.
                    3. If you can't find PROPERTY_NAME, PROPERTY_VALUE, and PROPERTY_UOM in the given Product Description, then keep PROPERTY_NAME, PROPERTY_VALUE, and PROPERTY_UOM as "NOT AVAILABLE".
                    4. You must give details only that are present in the product description.
                    The product description is given below:
                    Product Description: {purchase_description}.
                    """.format(purchase_description=msg)},
                ],
                temperature=0.1,
                max_tokens = 3072
            )
    extracted_text = response.choices[0].message.content

    return extracted_text




def names(mdrm,cls,msg):
    data = {'MDRM':[],'Class':[],'LONG_DES':[],'PROP_NAME':[],'PROP_VAL':[],'UOM':[]}
    extracted_text = generate_response(model_ISL0,msg)
    # final_model = 0
    # try:
    match = re.findall(r'\{(.*?)\}', extracted_text, re.DOTALL)
    # if 'PROPERTY_VALUE' not in match[0]:
    #     extracted_text = generate_response(model_ISL1,msg)
    #     match = re.findall(r'\{(.*?)\}', extracted_text, re.DOTALL)
            # final_model = 1
    # except Exception as e:
        # try:
        #     extracted_text = generate_response(model_ISL1,msg)
        #     match = re.findall(r'\{(.*?)\}', extracted_text, re.DOTALL)
        #     final_model = 1
        # except Exception as e:
        #     print(f"Errorn in : {e}")
        #     match = False
    # print(extracted_text)
    
    if match:
        result_text = '{' + match[0] + '}'
        
        # Fix potential issues with the quotes in the match result
        result_text = result_text.replace("'", '"')  # Replace single quotes with double quotes for valid JSON
        result_text = result_text.replace("None", "null")
        if (re.search(r',(?=\s*[}\]])',result_text)) and (('PROPERTY_NAME' in result_text) and ('PROPERTY_VALUE' in result_text)):
            result_text = re.sub(r',(?=\s*[}\]])','',result_text)
        try:
            json_data = json.loads(result_text)  # Try to load the corrected JSON string
            # print(json_data)
        except json.JSONDecodeError as e:
            match = re.search(r'"CLASS"\s*:\s*"([^"]+)"', result_text)
            if match:
                json_data = {'CLASS':[match.group(1)],"PROPERTY_NAME":['NOT AVAILABLE'],"PROPERTY_VALUE":['NOT AVAILABLE']}
            else:
                json_data = {'CLASS':['NO OBJECT'],"PROPERTY_NAME":['NOT AVAILABLE'],"PROPERTY_VALUE":['NOT AVAILABLE']}
            print(f"Error decoding JSON: {e}")
    else:
        result_text = ""
        json_data = {"PROPERTY_NAME":[]}
    # print(json_data)
    if 'CLASS' in json_data.keys():
        cls = json_data['CLASS']
    else:
        cls = 'NO OBJECT'
    if 'PROPERTY_NAME' in json_data.keys():   
        for i in range(len(json_data['PROPERTY_NAME'])):
            try:
                prop_val = json_data['PROPERTY_VALUE'][i]
                similarity_score = calculate_string_presence(prop_val, msg)
                if similarity_score >= 60:
                    data["MDRM"].append(mdrm)
                    data["LONG_DES"].append(msg)
                    data['Class'].append(cls)
                    # data['MODEL'].append(final_model)
                    try:
                        data["PROP_NAME"].append(json_data['PROPERTY_NAME'][i])
                    except:
                        data["PROP_NAME"].append('')
                    try:
                        data["PROP_VAL"].append(json_data['PROPERTY_VALUE'][i])
                    except:
                        data["PROP_VAL"].append('')
                    try:
                        data["UOM"].append(json_data['PROPERTY_UOM'][i])
                    except:
                        data["UOM"].append('')
            except Exception as e:
                print(f"Error in : {e}")
                pass
    else:
        for k,v in json_data.items():
            prop_val = v
            similarity_score = calculate_string_presence(prop_val, msg)
            if similarity_score >= 60:
                data["MDRM"].append(mdrm)
                data["LONG_DES"].append(msg)
                data['Class'].append(cls)
                # data['MODEL'].append(final_model)
                if k!='CLASS':
                    data["PROP_NAME"].append(k)
                    data["PROP_VAL"].append(v)
    data_new = pd.DataFrame(data)
    # print(data)
    if data_new.shape[0]>0:
        data_new = complete_data_clean(data_new)
    return data_new
   
