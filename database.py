import os
import fdb
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder

load_dotenv()

_tunnel = None

def start_tunnel():
    global _tunnel
    if _tunnel is None or not _tunnel.is_active:
        _tunnel = SSHTunnelForwarder(
            (os.getenv('SSH_HOST'), int(os.getenv('SSH_PORT', 23))),
            ssh_username=os.getenv('SSH_USER'),
            ssh_password=os.getenv('SSH_PASSWORD'),
            remote_bind_address=('localhost', int(os.getenv('DB_PORT', 3050))),
        )
        _tunnel.start()
    return _tunnel

def get_connection(login=None, senha=None, ambiente=None):
    tunnel = start_tunnel()
    local_port = tunnel.local_bind_port
    return fdb.connect(
        dsn=f"localhost/{local_port}:{ambiente or os.getenv('DB_PATH')}",
        user=login or os.getenv('DB_USER'),
        password=senha or os.getenv('DB_PASSWORD'),
        charset=os.getenv('DB_CHARSET', 'WIN1252'),
    )

def listar_tabelas(login=None, senha=None, ambiente=None):
    con = get_connection(login=login, senha=senha, ambiente=ambiente)
    cursor = con.cursor()
    cursor.execute("""
        SELECT TRIM(RDB$RELATION_NAME)
        FROM RDB$RELATIONS
        WHERE RDB$SYSTEM_FLAG = 0
        ORDER BY RDB$RELATION_NAME
    """)
    tabelas = [row[0] for row in cursor.fetchall()]
    con.close()
    return tabelas
