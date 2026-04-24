import os
import pymssql
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder

load_dotenv()

_tunnel = None
_tunnel_creds = (None, None)


def start_tunnel(ssh_user=None, ssh_password=None):
    global _tunnel, _tunnel_creds

    user = ssh_user or os.getenv('SSH_USER')
    pwd  = ssh_password or os.getenv('SSH_PASSWORD')

    creds_changed = (user, pwd) != _tunnel_creds
    if _tunnel is None or not _tunnel.is_active or creds_changed:
        if _tunnel is not None and _tunnel.is_active:
            _tunnel.stop()
        _tunnel = SSHTunnelForwarder(
            (os.getenv('SSH_HOST'), int(os.getenv('SSH_PORT', 23))),
            ssh_username=user,
            ssh_password=pwd,
            remote_bind_address=(
                os.getenv('INTER_DB_HOST', 'MSSQL_2022'),
                int(os.getenv('INTER_DB_PORT', 1433)),
            ),
        )
        _tunnel.start()
        _tunnel_creds = (user, pwd)

    return _tunnel


def get_connection(login=None, senha=None):
    tunnel = start_tunnel(ssh_user=login, ssh_password=senha)
    local_port = tunnel.local_bind_port
    return pymssql.connect(
        server='127.0.0.1',
        port=local_port,
        user=os.getenv('INTER_DB_USER'),
        password=os.getenv('INTER_DB_PASSWORD'),
        database=os.getenv('INTER_DB_NAME'),
    )


def listar_tabelas(login=None, senha=None):
    con = get_connection(login=login, senha=senha)
    cursor = con.cursor()
    cursor.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    """)
    tabelas = [row[0] for row in cursor.fetchall()]
    con.close()
    return tabelas
