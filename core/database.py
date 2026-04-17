import os
import fdb
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder

load_dotenv()

_tunnel = None
_tunnel_creds = (None, None)  # (ssh_user, ssh_password) da última conexão


def start_tunnel(ssh_user=None, ssh_password=None):
    global _tunnel, _tunnel_creds

    user = ssh_user or os.getenv('SSH_USER')
    pwd  = ssh_password or os.getenv('SSH_PASSWORD')

    # Recria o túnel se as credenciais mudaram ou se está inativo
    creds_changed = (user, pwd) != _tunnel_creds
    if _tunnel is None or not _tunnel.is_active or creds_changed:
        if _tunnel is not None and _tunnel.is_active:
            _tunnel.stop()
        _tunnel = SSHTunnelForwarder(
            (os.getenv('SSH_HOST'), int(os.getenv('SSH_PORT', 23))),
            ssh_username=user,
            ssh_password=pwd,
            remote_bind_address=('localhost', int(os.getenv('DB_PORT', 3050))),
        )
        _tunnel.start()
        _tunnel_creds = (user, pwd)

    return _tunnel


def get_connection(login=None, senha=None, ambiente=None):
    tunnel     = start_tunnel(ssh_user=login, ssh_password=senha)
    local_port = tunnel.local_bind_port
    return fdb.connect(
        dsn=f"localhost/{local_port}:{ambiente or os.getenv('DB_PATH')}",
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        charset=os.getenv('DB_CHARSET', 'WIN1252'),
    )


def listar_tabelas(login=None, senha=None, ambiente=None):
    con    = get_connection(login=login, senha=senha, ambiente=ambiente)
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
