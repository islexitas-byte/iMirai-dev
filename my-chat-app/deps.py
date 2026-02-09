
import oracledb

def get_connection():
    return oracledb.connect(
        user="DH1024231",
        password="Pipl#mdrm_231",
        dsn="10.10.124.102:1521/DH11024"
    )

def db_details():
    return "DH1024231","Pipl#mdrm_231","10.10.124.102","1521","DH11024"